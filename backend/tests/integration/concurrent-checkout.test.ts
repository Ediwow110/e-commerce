/**
 * Stress test: N parallel checkouts against limited stock must never oversell.
 * Drives the real /api/orders endpoint through supertest and a real DB.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/prisma.js';
import { signAccessToken } from '../../src/security.js';
import { resetDb, seedMinimal } from './setup.js';

const HAS_DB = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('noop');
const d = HAS_DB ? describe : describe.skip;

async function freshUserToken(idx: number) {
  const u = await prisma.user.create({ data: { name: `User ${idx}`, email: `u${idx}-${Date.now()}@luxe.test`, role: 'CUSTOMER', passwordHash: 'x' } });
  return { token: signAccessToken({ id: u.id, email: u.email, role: u.role }), id: u.id };
}

d('concurrent checkout never oversells', () => {
  beforeEach(async () => { await resetDb(); });

  it('N=10 parallel checkouts against stock=3 grants exactly 3 orders', async () => {
    const { product, variant } = await seedMinimal();
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: 3 } });

    const N = 10;
    const users = await Promise.all(Array.from({ length: N }).map((_, i) => freshUserToken(i)));

    // Each user gets 1 unit in their cart
    await prisma.cartItem.createMany({
      data: users.map((u) => ({ userId: u.id, productId: product.id, variantId: variant.id, quantity: 1 }))
    });

    const responses = await Promise.all(users.map((u) =>
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${u.token}`)
        .send({ shippingMethod: 'store_pickup' })
    ));

    const succeeded = responses.filter((r) => r.status === 201).length;
    const failed = responses.filter((r) => r.status === 422).length;

    expect(succeeded).toBe(3);
    expect(failed).toBe(N - 3);

    const finalVariant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(finalVariant.stock).toBe(0);

    const orderCount = await prisma.order.count();
    expect(orderCount).toBe(3);
  }, 30_000);
});
