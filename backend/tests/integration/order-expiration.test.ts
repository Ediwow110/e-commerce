/**
 * Integration test: unpaid orders past their paymentExpiresAt are expired
 * and stock is restored idempotently.
 *
 * Requires a live Postgres at DATABASE_URL with migrations applied.
 * Skipped (entire suite) when DATABASE_URL is absent so unit-only runs pass.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/prisma.js';
import { expireUnpaidOrders } from '../../src/expireOrders.js';
import { resetDb, seedMinimal } from './setup.js';

const HAS_DB = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('noop');
const d = HAS_DB ? describe : describe.skip;

d('order expiration', () => {
  let variantId: string;
  let userId: string;

  beforeEach(async () => {
    await resetDb();
    const { variant } = await seedMinimal();
    variantId = variant.id;
    const user = await prisma.user.create({ data: { name: 'Buyer', email: 'buyer@luxe.test', role: 'CUSTOMER' } });
    userId = user.id;
  });

  async function makePendingOrder(quantity: number, expiresInMinutes: number) {
    return prisma.order.create({
      data: {
        orderNumber: `LX-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        subtotal: '500',
        total: '500',
        paymentExpiresAt: new Date(Date.now() + expiresInMinutes * 60_000),
        items: { create: [{ productId: (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId }, select: { productId: true } })).productId, variantId, name: 'Test Necklace', sku: 'TEST-SKU-001', unitPrice: '500', quantity, lineTotal: String(500 * quantity) }] }
      },
      include: { items: true }
    });
  }

  it('does NOT expire an order whose paymentExpiresAt is in the future', async () => {
    await makePendingOrder(2, 30);
    await prisma.productVariant.update({ where: { id: variantId }, data: { stock: 8 } });
    const result = await expireUnpaidOrders();
    expect(result.expired).toBe(0);
    const stock = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(stock.stock).toBe(8);
  });

  it('expires an unpaid order past its expiry and restores stock', async () => {
    const order = await makePendingOrder(3, -5);
    // Simulate stock having been decremented at checkout
    await prisma.productVariant.update({ where: { id: variantId }, data: { stock: 7 } });

    const result = await expireUnpaidOrders();
    expect(result.expired).toBe(1);
    expect(result.stockRestored).toBe(1);

    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updatedOrder.status).toBe('EXPIRED');
    expect(updatedOrder.paymentStatus).toBe('EXPIRED');
    expect(updatedOrder.stockRestoredAt).not.toBeNull();

    const stock = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(stock.stock).toBe(10); // restored

    const movements = await prisma.inventoryMovement.findMany({ where: { variantId } });
    expect(movements.some((m) => m.type === 'RETURN' && m.quantity === 3)).toBe(true);
  });

  it('is idempotent — second run does not re-restore stock', async () => {
    await makePendingOrder(2, -1);
    await prisma.productVariant.update({ where: { id: variantId }, data: { stock: 8 } });

    await expireUnpaidOrders();
    await expireUnpaidOrders(); // second run

    const stock = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(stock.stock).toBe(10); // not 12
    const audits = await prisma.auditLog.count({ where: { action: 'ORDER_EXPIRED' } });
    expect(audits).toBe(1);
  });

  it('does not expire orders that are already PAID', async () => {
    const order = await makePendingOrder(1, -10);
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID', status: 'CONFIRMED' } });
    const result = await expireUnpaidOrders();
    expect(result.expired).toBe(0);
  });
});
