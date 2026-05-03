#!/usr/bin/env node
/**
 * CLI: expire unpaid orders past their `paymentExpiresAt`, restore stock.
 *
 * Schedule via cron, e.g.:
 *   * * * * *  cd /app/backend && npm run expire:orders >> /var/log/luxe-expire.log 2>&1
 *
 * Multi-instance safety: this script acquires a Postgres advisory lock before
 * doing any work. If another instance is already running the job, this run
 * exits silently with code 0. The per-order transaction logic in
 * `expireUnpaidOrders` is also independently idempotent — the lock is a
 * defence-in-depth optimisation, not the only correctness guarantee.
 */
import { expireUnpaidOrders } from '../src/expireOrders.js';
import { logger } from '../src/logger.js';
import { prisma } from '../src/prisma.js';
import { withAdvisoryLock } from '../src/cronLock.js';

(async () => {
  const start = Date.now();
  try {
    const outcome = await withAdvisoryLock('expire-orders', () => expireUnpaidOrders());
    if (!outcome.acquired) {
      logger.info({ durationMs: Date.now() - start }, 'expire-orders skipped (another instance holds the lock)');
      process.exit(0);
    }
    logger.info({ ...outcome.result, durationMs: Date.now() - start }, 'expire-orders completed');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'expire-orders failed');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
