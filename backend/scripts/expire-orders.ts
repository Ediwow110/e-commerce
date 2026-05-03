#!/usr/bin/env node
/**
 * CLI: expire unpaid orders past their `paymentExpiresAt`, restore stock.
 * Schedule via cron, e.g.:
 *   * * * * *  cd /app && node dist/scripts/expire-orders.js >> /var/log/luxe-expire.log 2>&1
 *
 * This script is safe to run concurrently — every per-order action is idempotent.
 */
import { expireUnpaidOrders } from '../src/expireOrders.js';
import { logger } from '../src/logger.js';
import { prisma } from '../src/prisma.js';

(async () => {
  const start = Date.now();
  try {
    const result = await expireUnpaidOrders();
    logger.info({ ...result, durationMs: Date.now() - start }, 'expire-orders completed');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'expire-orders failed');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
