import { describe, it, expect } from 'vitest';
import { runPreflightChecks, type PreflightEnv } from '../src/preflight.js';

const STRONG_A = 'A'.repeat(32) + 'access_secret_value_xx';
const STRONG_R = 'R'.repeat(32) + 'refresh_secret_value_xx';

function baseProdEnv(overrides: Partial<PreflightEnv> = {}): PreflightEnv {
  return {
    NODE_ENV: 'production',
    LAUNCH_MODE: 'production',
    DATABASE_URL: 'postgres://luxe:luxe@db.example.com:5432/luxe?sslmode=require',
    JWT_ACCESS_SECRET: STRONG_A,
    JWT_REFRESH_SECRET: STRONG_R,
    CORS_ORIGIN: 'https://shop.example.com',
    FRONTEND_URL: 'https://shop.example.com',
    PAYMENT_PROVIDER_DEFAULT: 'paymongo',
    PAYMONGO_SECRET_KEY: 'sk_live_real_key_value_aaaaaaaaaaaaaaaaa',
    PAYMENT_WEBHOOK_SECRET: 'a'.repeat(40),
    ORDER_PAYMENT_EXPIRY_MINUTES: 30,
    MAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 'rk_live_x',
    SUPPORT_EMAIL: 'support@example.com',
    LOGIN_LOCKOUT_THRESHOLD: 8,
    LOGIN_LOCKOUT_DURATION_MINUTES: 15,
    ENFORCE_ADMIN_2FA: 'true',
    RATE_LIMIT_STORE: 'memory',
    SENTRY_DSN: 'https://x@o.sentry.io/1',
    ...overrides
  };
}

describe('runPreflightChecks', () => {
  it('local launch mode tolerates weak dev defaults', () => {
    const findings = runPreflightChecks({
      ...baseProdEnv(),
      LAUNCH_MODE: 'local',
      NODE_ENV: 'development',
      DATABASE_URL: 'postgres://luxe:luxe@localhost:5432/luxe',
      PAYMENT_PROVIDER_DEFAULT: 'mock',
      PAYMONGO_SECRET_KEY: undefined,
      PAYMENT_WEBHOOK_SECRET: undefined,
      MAIL_PROVIDER: 'mock',
      RESEND_API_KEY: undefined,
      CORS_ORIGIN: 'http://localhost:5173',
      FRONTEND_URL: 'http://localhost:5173',
      ENFORCE_ADMIN_2FA: 'false',
      SENTRY_DSN: undefined,
      SUPPORT_EMAIL: undefined,
    });
    expect(findings.filter((f) => f.level === 'error')).toEqual([]);
  });

  it('production launch refuses mock payments', () => {
    const findings = runPreflightChecks(baseProdEnv({ PAYMENT_PROVIDER_DEFAULT: 'mock' }));
    expect(findings.filter((f) => f.level === 'error').some((f) => f.message.includes('PAYMENT_PROVIDER_DEFAULT=mock'))).toBe(true);
  });

  it('production launch refuses mock mail provider', () => {
    const findings = runPreflightChecks(baseProdEnv({ MAIL_PROVIDER: 'mock' }));
    expect(findings.filter((f) => f.level === 'error').some((f) => f.message.includes('MAIL_PROVIDER=mock'))).toBe(true);
  });

  it('production launch refuses sandbox PayMongo key', () => {
    const findings = runPreflightChecks(baseProdEnv({ PAYMONGO_SECRET_KEY: 'sk_test_sandbox_key' }));
    expect(findings.filter((f) => f.level === 'error').some((f) => f.message.includes('sk_test_'))).toBe(true);
  });

  it('production launch refuses unsafe CORS', () => {
    const findings = runPreflightChecks(baseProdEnv({ CORS_ORIGIN: '*' }));
    expect(findings.filter((f) => f.level === 'error').some((f) => f.message.includes('CORS_ORIGIN'))).toBe(true);
  });

  it('production launch refuses localhost FRONTEND_URL', () => {
    const findings = runPreflightChecks(baseProdEnv({ FRONTEND_URL: 'http://localhost:5173' }));
    expect(findings.filter((f) => f.level === 'error').some((f) => f.message.includes('FRONTEND_URL'))).toBe(true);
  });

  it('production launch refuses localhost DATABASE_URL', () => {
    const findings = runPreflightChecks(baseProdEnv({ DATABASE_URL: 'postgres://x:y@localhost:5432/z?sslmode=require' }));
    expect(findings.filter((f) => f.level === 'error').some((f) => f.message.includes('DATABASE_URL'))).toBe(true);
  });

  it('production launch refuses ENFORCE_ADMIN_2FA=false', () => {
    const findings = runPreflightChecks(baseProdEnv({ ENFORCE_ADMIN_2FA: 'false' }));
    expect(findings.filter((f) => f.level === 'error').some((f) => f.message.includes('ENFORCE_ADMIN_2FA'))).toBe(true);
  });

  it('refuses identical access/refresh secrets in any mode', () => {
    const findings = runPreflightChecks(baseProdEnv({ JWT_REFRESH_SECRET: STRONG_A }));
    expect(findings.filter((f) => f.level === 'error').some((f) => f.message.includes('must be different'))).toBe(true);
  });

  it('refuses weak JWT secret in production', () => {
    const findings = runPreflightChecks(baseProdEnv({ JWT_ACCESS_SECRET: 'short' }));
    expect(findings.filter((f) => f.level === 'error').some((f) => f.message.includes('JWT_ACCESS_SECRET'))).toBe(true);
  });

  it('refuses RATE_LIMIT_STORE=redis without REDIS_URL', () => {
    const findings = runPreflightChecks(baseProdEnv({ RATE_LIMIT_STORE: 'redis', REDIS_URL: undefined }));
    expect(findings.filter((f) => f.level === 'error').some((f) => f.message.includes('REDIS_URL'))).toBe(true);
  });

  it('refuses out-of-range numeric flags', () => {
    const findings = runPreflightChecks(baseProdEnv({ ORDER_PAYMENT_EXPIRY_MINUTES: 0 }));
    expect(findings.filter((f) => f.level === 'error').some((f) => f.message.includes('ORDER_PAYMENT_EXPIRY_MINUTES'))).toBe(true);
  });

  it('production passes when everything is configured correctly', () => {
    const findings = runPreflightChecks(baseProdEnv());
    expect(findings.filter((f) => f.level === 'error')).toEqual([]);
  });

  it('production warns (not errors) when SENTRY_DSN missing', () => {
    const findings = runPreflightChecks(baseProdEnv({ SENTRY_DSN: undefined }));
    expect(findings.filter((f) => f.level === 'error')).toEqual([]);
    expect(findings.some((f) => f.level === 'warn' && f.message.includes('SENTRY_DSN'))).toBe(true);
  });

  it('production warns when RATE_LIMIT_STORE=memory (multi-instance hint)', () => {
    const findings = runPreflightChecks(baseProdEnv({ RATE_LIMIT_STORE: 'memory' }));
    expect(findings.some((f) => f.level === 'warn' && f.message.includes('RATE_LIMIT_STORE=memory'))).toBe(true);
  });
});
