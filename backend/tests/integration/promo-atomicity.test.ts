/**
 * Concurrent promo redemption: the atomic updateMany guard must ensure no more
 * than `usageLimit` redemptions succeed even when N requests race.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/prisma.js';
import { resetDb } from './setup.js';

const HAS_DB = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('noop');
const d = HAS_DB ? describe : describe.skip;

d('promo atomicity', () => {
  beforeEach(async () => { await resetDb(); });

  it('atomic increment never overshoots usageLimit under N concurrent attempts', async () => {
    const promo = await prisma.promoCode.create({
      data: { code: 'LIMITED5', type: 'fixed', value: '50', usageLimit: 5, usedCount: 0 }
    });

    // 20 concurrent attempts, only 5 may succeed
    const attempts = await Promise.all(
      Array.from({ length: 20 }).map(async () => {
        const result = await prisma.promoCode.updateMany({
          where: {
            id: promo.id,
            isActive: true,
            OR: [{ usageLimit: null }, { usedCount: { lt: promo.usageLimit ?? 9999 } }]
          },
          data: { usedCount: { increment: 1 } }
        });
        return result.count;
      })
    );

    const succeeded = attempts.filter((c) => c === 1).length;
    const fresh = await prisma.promoCode.findUniqueOrThrow({ where: { id: promo.id } });
    expect(succeeded).toBeLessThanOrEqual(5);
    expect(fresh.usedCount).toBeLessThanOrEqual(5);
  });

  it('unlimited promo (usageLimit=null) accepts all redemptions', async () => {
    const promo = await prisma.promoCode.create({
      data: { code: 'UNLIMITED', type: 'percentage', value: '10', usageLimit: null }
    });
    const attempts = await Promise.all(
      Array.from({ length: 10 }).map(() =>
        prisma.promoCode.updateMany({
          where: { id: promo.id, isActive: true, OR: [{ usageLimit: null }, { usedCount: { lt: 9999 } }] },
          data: { usedCount: { increment: 1 } }
        }).then((r) => r.count)
      )
    );
    expect(attempts.every((c) => c === 1)).toBe(true);
    const fresh = await prisma.promoCode.findUniqueOrThrow({ where: { id: promo.id } });
    expect(fresh.usedCount).toBe(10);
  });
});
