import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(20),
  JWT_REFRESH_SECRET: z.string().min(20),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  PAYMENT_PROVIDER_DEFAULT: z.enum(['paymongo','maya','xendit','manual','mock']).default('mock'),
  PAYMONGO_SECRET_KEY: z.string().optional(),
  PAYMONGO_PUBLIC_KEY: z.string().optional(),
  MAYA_PUBLIC_KEY: z.string().optional(),
  MAYA_SECRET_KEY: z.string().optional(),
  XENDIT_SECRET_KEY: z.string().optional(),
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

if (env.NODE_ENV === 'production') {
  if (!env.PAYMENT_WEBHOOK_SECRET) {
    throw new Error('PAYMENT_WEBHOOK_SECRET is required in production');
  }
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ in production');
  }
  if (env.PAYMENT_PROVIDER_DEFAULT === 'mock') {
    throw new Error('PAYMENT_PROVIDER_DEFAULT cannot be "mock" in production. Set a real provider (paymongo, maya, xendit) and configure the required API keys.');
  }
  // Require provider-specific keys based on selected provider
  if (env.PAYMENT_PROVIDER_DEFAULT === 'paymongo' && !env.PAYMONGO_SECRET_KEY) {
    throw new Error('PAYMONGO_SECRET_KEY is required when PAYMENT_PROVIDER_DEFAULT is paymongo');
  }
  if (env.PAYMENT_PROVIDER_DEFAULT === 'xendit' && !env.XENDIT_SECRET_KEY) {
    throw new Error('XENDIT_SECRET_KEY is required when PAYMENT_PROVIDER_DEFAULT is xendit');
  }
  if (env.PAYMENT_PROVIDER_DEFAULT === 'maya' && (!env.MAYA_PUBLIC_KEY || !env.MAYA_SECRET_KEY)) {
    throw new Error('MAYA_PUBLIC_KEY and MAYA_SECRET_KEY are required when PAYMENT_PROVIDER_DEFAULT is maya');
  }
}
