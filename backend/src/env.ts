import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // LAUNCH_MODE is the *intent* of the deploy — independent of NODE_ENV.
  //   local       — developer machine
  //   staging     — sandbox payments, test mail provider OK, debug allowed
  //   production  — real money, real customers, strictest gates apply
  LAUNCH_MODE: z.enum(['local', 'staging', 'production']).default('local'),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().optional(),

  // Payments
  PAYMENT_PROVIDER_DEFAULT: z.enum(['paymongo', 'maya', 'xendit', 'manual', 'mock']).default('mock'),
  PAYMONGO_SECRET_KEY: z.string().optional(),
  PAYMONGO_PUBLIC_KEY: z.string().optional(),
  MAYA_PUBLIC_KEY: z.string().optional(),
  MAYA_SECRET_KEY: z.string().optional(),
  MAYA_WEBHOOK_AUTH: z.string().optional(),
  XENDIT_SECRET_KEY: z.string().optional(),
  XENDIT_CALLBACK_TOKEN: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  ORDER_PAYMENT_EXPIRY_MINUTES: z.coerce.number().int().positive().default(30),

  // Mail
  MAIL_PROVIDER: z.enum(['mock', 'resend', 'sendgrid', 'mailgun']).default('mock'),
  MAIL_FROM: z.string().default('LUXE Jewelry & Bags <orders@luxe.test>'),
  MAIL_REPLY_TO: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  SUPPORT_EMAIL: z.string().email().optional(),

  // Auth
  LOGIN_LOCKOUT_THRESHOLD: z.coerce.number().int().positive().default(8),
  LOGIN_LOCKOUT_DURATION_MINUTES: z.coerce.number().int().positive().default(15),
  ENFORCE_ADMIN_2FA: z.enum(['true', 'false']).default('false'),

  // Rate limiting
  RATE_LIMIT_STORE: z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL: z.string().optional(),

  // Observability
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
  SENTRY_DSN: z.string().optional(),
  RELEASE_VERSION: z.string().optional(),

  // Operational
  ALLOW_PROD_SEED: z.string().optional()
});

export const env = schema.parse(process.env);

// NOTE: Detailed boot-time validation lives in `preflight.ts` which is invoked
// from `server.ts`. The lightweight checks below remain for callers that
// import `env` without booting the HTTP server (CLI scripts, tests).
if (env.NODE_ENV === 'production') {
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ in production');
  }
}
