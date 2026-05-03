import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
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

  // Auth
  LOGIN_LOCKOUT_THRESHOLD: z.coerce.number().int().positive().default(8),
  LOGIN_LOCKOUT_DURATION_MINUTES: z.coerce.number().int().positive().default(15),
  ENFORCE_ADMIN_2FA: z.enum(['true', 'false']).default('false'),

  // Observability
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
  SENTRY_DSN: z.string().optional(),
  RELEASE_VERSION: z.string().optional(),

  // Operational
  ALLOW_PROD_SEED: z.string().optional()
});

export const env = schema.parse(process.env);

if (env.NODE_ENV === 'production') {
  const corsOrigin = env.CORS_ORIGIN.trim();
  if (!corsOrigin || corsOrigin === '*' || corsOrigin.includes('localhost') || corsOrigin.includes('127.0.0.1')) {
    throw new Error('CORS_ORIGIN must be set to your production domain (e.g. https://www.yourdomain.com), not localhost or wildcard, in production');
  }
  if (!env.PAYMENT_WEBHOOK_SECRET) throw new Error('PAYMENT_WEBHOOK_SECRET is required in production');
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ in production');
  if (env.PAYMENT_PROVIDER_DEFAULT === 'mock') throw new Error('PAYMENT_PROVIDER_DEFAULT cannot be "mock" in production');
  if (env.PAYMENT_PROVIDER_DEFAULT === 'paymongo' && !env.PAYMONGO_SECRET_KEY) throw new Error('PAYMONGO_SECRET_KEY required when PAYMENT_PROVIDER_DEFAULT=paymongo in production');
  if (env.PAYMENT_PROVIDER_DEFAULT === 'maya' && (!env.MAYA_SECRET_KEY || !env.MAYA_WEBHOOK_AUTH)) throw new Error('MAYA_SECRET_KEY and MAYA_WEBHOOK_AUTH required when PAYMENT_PROVIDER_DEFAULT=maya in production');
  if (env.PAYMENT_PROVIDER_DEFAULT === 'xendit' && (!env.XENDIT_SECRET_KEY || !env.XENDIT_CALLBACK_TOKEN)) throw new Error('XENDIT_SECRET_KEY and XENDIT_CALLBACK_TOKEN required when PAYMENT_PROVIDER_DEFAULT=xendit in production');
  if (env.MAIL_PROVIDER === 'mock') {
    // eslint-disable-next-line no-console
    console.warn('[env] WARNING: MAIL_PROVIDER=mock in production — customers will not receive emails.');
  }
}
