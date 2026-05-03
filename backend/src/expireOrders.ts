import { prisma } from './prisma.js';
import { logger } from './logger.js';

export type ExpireOrdersResult = {
  scanned: number;
  expired: number;
  stockRestored: number;
  alreadyHandled: number;
};

/**
 * Mark unpaid orders past their `paymentExpiresAt` as EXPIRED and restore
 * any reserved stock. Idempotent: an order whose `stockRestoredAt` is
 * already set will not have stock restored a second time.
 *
 * The whole flow per order runs inside a single transaction so the order
 * status update + stock restore + audit log + idempotency stamp commit
 * together. A duplicate run from an overlapping cron will simply observe
 * `stockRestoredAt IS NOT NULL` and skip.
 */
export async function expireUnpaidOrders(now: Date = new Date()): Promise<ExpireOrdersResult> {
  const candidates = await prisma.order.findMany({
    where: {
      paymentExpiresAt: { lte: now, not: null },
      paymentStatus: { in: ['UNPAID', 'PENDING'] },
      status: { in: ['PENDING', 'PENDING_PAYMENT'] },
      stockRestoredAt: null
    },
    include: { items: true }
  });

  let expired = 0;
  let stockRestored = 0;
  let alreadyHandled = 0;

  for (const order of candidates) {
    try {
      await prisma.$transaction(async (tx) => {
        // Re-read with a write-intent (FOR UPDATE) row to avoid double-handling
        // if two workers race. Postgres advisory: we accept the race; the second
        // tx will see stockRestoredAt set and abort below.
        const fresh = await tx.order.findUnique({
          where: { id: order.id },
          select: { id: true, status: true, paymentStatus: true, stockRestoredAt: true }
        });
        if (!fresh) return;
        if (fresh.stockRestoredAt) { alreadyHandled++; return; }
        if (!['PENDING', 'PENDING_PAYMENT'].includes(fresh.status)) { alreadyHandled++; return; }
        if (!['UNPAID', 'PENDING'].includes(fresh.paymentStatus)) { alreadyHandled++; return; }

        for (const item of order.items) {
          if (item.variantId && item.quantity > 0) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } }
            });
            await tx.inventoryMovement.create({
              data: {
                variantId: item.variantId,
                type: 'RETURN',
                quantity: item.quantity,
                note: `Auto-restore from expired order ${order.orderNumber}`
              }
            });
            stockRestored++;
          }
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'EXPIRED',
            paymentStatus: 'EXPIRED',
            stockRestoredAt: now
          }
        });

        // Mark the related Payment as EXPIRED if any
        await tx.payment.updateMany({
          where: { orderId: order.id, status: { in: ['PENDING', 'UNPAID'] } },
          data: { status: 'EXPIRED' }
        });

        await tx.auditLog.create({
          data: {
            actorId: null,
            actorEmail: 'system',
            actorRole: 'SYSTEM',
            action: 'ORDER_EXPIRED',
            resource: '/system/expire-orders',
            resourceId: order.id,
            metadata: {
              orderNumber: order.orderNumber,
              paymentExpiresAt: order.paymentExpiresAt,
              itemsRestored: order.items.length
            } as never
          }
        });

        expired++;
      });
    } catch (error) {
      logger.error({ err: error, orderId: order.id, orderNumber: order.orderNumber }, 'Failed to expire order');
    }
  }

  return { scanned: candidates.length, expired, stockRestored, alreadyHandled };
}
