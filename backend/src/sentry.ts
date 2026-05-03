import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Optional Sentry integration. App must work without `SENTRY_DSN`.
 * Loaded dynamically so production-only deps don't bloat dev installs.
 */
let sentryReady = false;

export async function initSentry(): Promise<void> {
  if (!env.SENTRY_DSN) {
    logger.info('Sentry disabled (no SENTRY_DSN configured)');
    return;
  }
  try {
    // @ts-expect-error optional peer dep — only loaded when SENTRY_DSN is set
    const Sentry = await import('@sentry/node').catch(() => null);
    if (!Sentry) {
      logger.warn('SENTRY_DSN is set but @sentry/node is not installed; skipping Sentry init');
      return;
    }
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: 0.1,
      release: env.RELEASE_VERSION
    });
    sentryReady = true;
    logger.info('Sentry initialised');
  } catch (err) {
    logger.error({ err }, 'Failed to initialise Sentry');
  }
}

export async function captureException(err: unknown, context?: Record<string, unknown>): Promise<void> {
  if (!sentryReady) return;
  try {
    // @ts-expect-error optional peer dep
    const Sentry = await import('@sentry/node').catch(() => null);
    if (!Sentry) return;
    Sentry.captureException(err, { extra: context });
  } catch {
    // never crash on logging
  }
}

export function isSentryEnabled(): boolean {
  return sentryReady;
}
