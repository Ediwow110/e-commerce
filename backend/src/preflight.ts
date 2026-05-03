import { env as defaultEnv } from './env.js';
import { logger } from './logger.js';

/**
 * Boot-time production-readiness gate.
 *
 * Called from `server.ts` BEFORE the HTTP listener starts. If any check
 * returns a problem, the process exits non-zero so orchestrators (Docker,
 * Kubernetes, systemd, Replit Deployments) refuse to mark the new revision
 * healthy and roll back.
 *
 * Two severity levels:
 *   - ERROR : refuse to boot
 *   - WARN  : log loudly, but allow boot (for non-fatal misconfigs)
 *
 * The check matrix is keyed on LAUNCH_MODE, not NODE_ENV — a developer running
 * `NODE_ENV=production npm start` against a sandbox provider should not be
 * blocked, but LAUNCH_MODE=production must enforce the strictest rules.
 *
 * Pure function: takes a snapshot of env and returns findings, so unit tests
 * can call it with arbitrary fake envs without re-importing modules.
 */

export type PreflightFinding = { level: 'error' | 'warn'; message: string };

// Anything that satisfies the subset of env keys we actually read.
export type PreflightEnv = {
  NODE_ENV: string;
  LAUNCH_MODE: 'local' | 'staging' | 'production';
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  CORS_ORIGIN: string;
  FRONTEND_URL: string;
  PAYMENT_PROVIDER_DEFAULT: string;
  PAYMONGO_SECRET_KEY?: string;
  PAYMONGO_PUBLIC_KEY?: string;
  MAYA_PUBLIC_KEY?: string;
  MAYA_SECRET_KEY?: string;
  MAYA_WEBHOOK_AUTH?: string;
  XENDIT_SECRET_KEY?: string;
  XENDIT_CALLBACK_TOKEN?: string;
  PAYMENT_WEBHOOK_SECRET?: string;
  ORDER_PAYMENT_EXPIRY_MINUTES: number;
  MAIL_PROVIDER: string;
  RESEND_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  MAILGUN_API_KEY?: string;
  MAILGUN_DOMAIN?: string;
  SUPPORT_EMAIL?: string;
  LOGIN_LOCKOUT_THRESHOLD: number;
  LOGIN_LOCKOUT_DURATION_MINUTES: number;
  ENFORCE_ADMIN_2FA: 'true' | 'false';
  RATE_LIMIT_STORE: 'memory' | 'redis';
  REDIS_URL?: string;
  SENTRY_DSN?: string;
};

const WEAK_SECRET_PATTERNS = [
  /^changeme/i,
  /^secret$/i,
  /^password/i,
  /^test/i,
  /^dev/i,
  /^ci-/i,
  /^example/i,
  /^placeholder/i,
];

function looksWeak(value: string | undefined): boolean {
  if (!value) return true;
  if (value.length < 32) return true;
  return WEAK_SECRET_PATTERNS.some((re) => re.test(value));
}

export function runPreflightChecks(env: PreflightEnv = defaultEnv as PreflightEnv): PreflightFinding[] {
  const findings: PreflightFinding[] = [];
  const isProd = env.LAUNCH_MODE === 'production';
  const isStagingOrProd = env.LAUNCH_MODE !== 'local';

  // ── DATABASE ────────────────────────────────────────────────────────────
  if (!env.DATABASE_URL) {
    findings.push({ level: 'error', message: 'DATABASE_URL is required' });
  } else if (isProd) {
    const url = env.DATABASE_URL;
    const usesSsl = /sslmode=(require|verify-full|verify-ca)/i.test(url) || /ssl=true/i.test(url);
    const isLocalhost = /@(localhost|127\.0\.0\.1)/.test(url);
    if (isLocalhost) {
      findings.push({ level: 'error', message: 'DATABASE_URL points at localhost in LAUNCH_MODE=production' });
    }
    if (!usesSsl) {
      findings.push({ level: 'warn', message: 'DATABASE_URL has no sslmode parameter — ensure your provider negotiates TLS automatically' });
    }
  }

  // ── JWT SECRETS ─────────────────────────────────────────────────────────
  if (looksWeak(env.JWT_ACCESS_SECRET)) {
    findings.push({ level: isStagingOrProd ? 'error' : 'warn', message: 'JWT_ACCESS_SECRET is missing, too short (<32 chars), or matches a weak pattern' });
  }
  if (looksWeak(env.JWT_REFRESH_SECRET)) {
    findings.push({ level: isStagingOrProd ? 'error' : 'warn', message: 'JWT_REFRESH_SECRET is missing, too short (<32 chars), or matches a weak pattern' });
  }
  if (env.JWT_ACCESS_SECRET && env.JWT_REFRESH_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    findings.push({ level: 'error', message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values' });
  }

  // ── CORS / FRONTEND URL ─────────────────────────────────────────────────
  if (isProd) {
    const origin = (env.CORS_ORIGIN || '').trim();
    if (!origin) {
      findings.push({ level: 'error', message: 'CORS_ORIGIN must be set to your production domain in LAUNCH_MODE=production' });
    } else if (origin === '*' || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      findings.push({ level: 'error', message: `CORS_ORIGIN=${origin} is unsafe in production (wildcard or localhost)` });
    }

    const fe = (env.FRONTEND_URL || '').trim();
    if (!/^https:\/\//.test(fe) || fe.includes('localhost') || fe.includes('127.0.0.1')) {
      findings.push({ level: 'error', message: `FRONTEND_URL=${fe} must be an https:// non-localhost URL in production` });
    }
  }

  // ── PAYMENTS ────────────────────────────────────────────────────────────
  if (isProd) {
    if (env.PAYMENT_PROVIDER_DEFAULT === 'mock') {
      findings.push({ level: 'error', message: 'PAYMENT_PROVIDER_DEFAULT=mock is forbidden in LAUNCH_MODE=production' });
    }
    if (looksWeak(env.PAYMENT_WEBHOOK_SECRET)) {
      findings.push({ level: 'error', message: 'PAYMENT_WEBHOOK_SECRET is missing or too weak (<32 chars)' });
    }
    switch (env.PAYMENT_PROVIDER_DEFAULT) {
      case 'paymongo':
        if (!env.PAYMONGO_SECRET_KEY) findings.push({ level: 'error', message: 'PAYMONGO_SECRET_KEY required for PayMongo' });
        if (env.PAYMONGO_SECRET_KEY?.startsWith('sk_test_')) findings.push({ level: 'error', message: 'PAYMONGO_SECRET_KEY starts with sk_test_ — sandbox key in production' });
        break;
      case 'maya':
        if (!env.MAYA_SECRET_KEY || !env.MAYA_PUBLIC_KEY) findings.push({ level: 'error', message: 'MAYA_SECRET_KEY and MAYA_PUBLIC_KEY required for Maya' });
        if (!env.MAYA_WEBHOOK_AUTH) findings.push({ level: 'error', message: 'MAYA_WEBHOOK_AUTH required so webhooks can be authenticated' });
        break;
      case 'xendit':
        if (!env.XENDIT_SECRET_KEY) findings.push({ level: 'error', message: 'XENDIT_SECRET_KEY required for Xendit' });
        if (!env.XENDIT_CALLBACK_TOKEN) findings.push({ level: 'error', message: 'XENDIT_CALLBACK_TOKEN required so webhooks can be authenticated' });
        if (env.XENDIT_SECRET_KEY?.includes('xnd_development')) findings.push({ level: 'error', message: 'XENDIT_SECRET_KEY contains "xnd_development" — sandbox key in production' });
        break;
      case 'manual':
        findings.push({ level: 'warn', message: 'PAYMENT_PROVIDER_DEFAULT=manual — only enable if you can verify every payment by hand before fulfilment' });
        break;
    }
  }

  // ── MAIL ────────────────────────────────────────────────────────────────
  if (isProd && env.MAIL_PROVIDER === 'mock') {
    findings.push({ level: 'error', message: 'MAIL_PROVIDER=mock is forbidden in LAUNCH_MODE=production — customers will not receive transactional emails' });
  }
  if (isProd) {
    switch (env.MAIL_PROVIDER) {
      case 'resend': if (!env.RESEND_API_KEY) findings.push({ level: 'error', message: 'RESEND_API_KEY required when MAIL_PROVIDER=resend' }); break;
      case 'sendgrid': if (!env.SENDGRID_API_KEY) findings.push({ level: 'error', message: 'SENDGRID_API_KEY required when MAIL_PROVIDER=sendgrid' }); break;
      case 'mailgun':
        if (!env.MAILGUN_API_KEY) findings.push({ level: 'error', message: 'MAILGUN_API_KEY required when MAIL_PROVIDER=mailgun' });
        if (!env.MAILGUN_DOMAIN) findings.push({ level: 'error', message: 'MAILGUN_DOMAIN required when MAIL_PROVIDER=mailgun' });
        break;
    }
    if (!env.SUPPORT_EMAIL) findings.push({ level: 'warn', message: 'SUPPORT_EMAIL is not set — runbooks and customer-facing pages will use a generic fallback' });
  }

  // ── ADMIN 2FA ───────────────────────────────────────────────────────────
  if (isProd && env.ENFORCE_ADMIN_2FA !== 'true') {
    findings.push({ level: 'error', message: 'ENFORCE_ADMIN_2FA must be "true" in LAUNCH_MODE=production' });
  }

  // ── OBSERVABILITY ───────────────────────────────────────────────────────
  if (isProd && !env.SENTRY_DSN) {
    findings.push({ level: 'warn', message: 'SENTRY_DSN is not set — production errors will not be captured by external monitoring' });
  }

  // ── NUMERIC SANITY ──────────────────────────────────────────────────────
  if (env.ORDER_PAYMENT_EXPIRY_MINUTES < 1 || env.ORDER_PAYMENT_EXPIRY_MINUTES > 1440) {
    findings.push({ level: 'error', message: `ORDER_PAYMENT_EXPIRY_MINUTES=${env.ORDER_PAYMENT_EXPIRY_MINUTES} is out of safe range (1–1440)` });
  }
  if (env.LOGIN_LOCKOUT_THRESHOLD < 3 || env.LOGIN_LOCKOUT_THRESHOLD > 50) {
    findings.push({ level: 'error', message: `LOGIN_LOCKOUT_THRESHOLD=${env.LOGIN_LOCKOUT_THRESHOLD} is out of safe range (3–50)` });
  }
  if (env.LOGIN_LOCKOUT_DURATION_MINUTES < 1 || env.LOGIN_LOCKOUT_DURATION_MINUTES > 1440) {
    findings.push({ level: 'error', message: `LOGIN_LOCKOUT_DURATION_MINUTES=${env.LOGIN_LOCKOUT_DURATION_MINUTES} is out of safe range (1–1440)` });
  }

  // ── RATE LIMITING (multi-instance hint) ─────────────────────────────────
  if (isProd && env.RATE_LIMIT_STORE === 'memory') {
    findings.push({ level: 'warn', message: 'RATE_LIMIT_STORE=memory — only safe with a SINGLE backend instance. Set RATE_LIMIT_STORE=redis + REDIS_URL for multi-instance deploys, or enforce single-instance in your platform.' });
  }
  if (env.RATE_LIMIT_STORE === 'redis' && !env.REDIS_URL) {
    findings.push({ level: 'error', message: 'RATE_LIMIT_STORE=redis but REDIS_URL is not set' });
  }

  return findings;
}

export function assertProductionReady(env: PreflightEnv = defaultEnv as PreflightEnv): void {
  const findings = runPreflightChecks(env);
  for (const f of findings) {
    if (f.level === 'error') logger.error({ launchMode: env.LAUNCH_MODE }, `[preflight] ${f.message}`);
    else logger.warn({ launchMode: env.LAUNCH_MODE }, `[preflight] ${f.message}`);
  }
  const errors = findings.filter((f) => f.level === 'error');
  if (errors.length > 0) {
    logger.fatal({ count: errors.length, launchMode: env.LAUNCH_MODE }, '[preflight] Refusing to boot — fix the errors above and redeploy');
    process.exit(1);
  }
  logger.info({ launchMode: env.LAUNCH_MODE, warnings: findings.length }, '[preflight] OK');
}
