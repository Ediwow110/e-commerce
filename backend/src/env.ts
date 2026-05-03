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
  PAYMENT_PROVIDER_DEFAULT: z.enum(['paymongo', 'maya', 'xendit', 'manual', 'mock']).default('mock'),
  PAYMONGO_SECRET_KEY: z.string().optional(),
  PAYMONGO_PUBLIC_KEY: z.string().optional(),
  MAYA_PUBLIC_KEY: z.string().optional(),
  MAYA_SECRET_KEY: z.string().optional(),
  XENDIT_SECRET_KEY: z.string().optional(),
  // FIX P0-001: PAYMENT_WEBHOOK_SECRET required when real payment keys are present
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  MAIL_PROVIDER: z.enum(['mock', 'resend', 'sendgrid', 'mailgun']).default('mock'),
  MAIL_FROM: z.string().default('LUXE Jewelry & Bags <orders@example.com>'),
  MAIL_REPLY_TO: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional()
});

export const env = schema.parse(process.env);

// FIX P2-012: Startup-time validation for production — fail fast with clear messages
if (env.NODE_ENV === 'production') {
  // CORS must be an explicit domain, not localhost or wildcard
  const corsOrigin = env.CORS_ORIGIN.trim();
  if (
    !corsOrigin ||
    corsOrigin === '*' ||
    corsOrigin.includes('localhost') ||
    corsOrigin.includes('127.0.0.1')
  ) {
    throw new Error(
      'CORS_ORIGIN must be set to your production domain (e.g. https://www.yourdomain.com), not localhost or wildcard, in production'
    );
  }

  // Webhook secret required in production
  if (!env.PAYMENT_WEBHOOK_SECRET) {
    throw new Error('PAYMENT_WEBHOOK_SECRET is required in production');
  }

  // JWT secrets must differ and be sufficiently long
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ in production');
  }

  // Mock payment provider must not be used in production
  if (env.PAYMENT_PROVIDER_DEFAULT === 'mock') {
    throw new Error(
      'PAYMENT_PROVIDER_DEFAULT cannot be "mock" in production. Set a real provider (paymongo, maya, xendit) and configure the required API keys.'
    );
  }

  // Provider-specific key requirements
  if (env.PAYMENT_PROVIDER_DEFAULT === 'paymongo' && !env.PAYMONGO_SECRET_KEY) {
    throw new Error('PAYMONGO_SECRET_KEY is required when PAYMENT_PROVIDER_DEFAULT is paymongo');
  }
  if (env.PAYMENT_PROVIDER_DEFAULT === 'xendit' && !env.XENDIT_SECRET_KEY) {
    throw new Error('XENDIT_SECRET_KEY is required when PAYMENT_PROVIDER_DEFAULT is xendit');
  }
  if (env.PAYMENT_PROVIDER_DEFAULT === 'maya' && (!env.MAYA_PUBLIC_KEY || !env.MAYA_SECRET_KEY)) {
    throw new Error('MAYA_PUBLIC_KEY and MAYA_SECRET_KEY are required when PAYMENT_PROVIDER_DEFAULT is maya');
  }

  // Mail must be a real provider in production
  if (env.MAIL_PROVIDER === 'mock') {
    throw new Error(
      'MAIL_PROVIDER cannot be "mock" in production. Set a real provider (resend, sendgrid, mailgun) and configure the API key.'
    );
  }

  // Frontend URL must not be localhost in production
  if (env.FRONTEND_URL.includes('localhost') || env.FRONTEND_URL.includes('127.0.0.1')) {
    throw new Error('FRONTEND_URL must be set to your production domain in production');
  }
}
