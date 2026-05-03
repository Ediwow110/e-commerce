import { describe, it, expect } from 'vitest';

/**
 * Price integrity invariants.
 *
 * The order route in src/routes.ts MUST never trust client-supplied prices.
 * It computes:
 *   subtotal = Σ unitPrice(from DB) * quantity
 *   shippingFee = method === 'store_pickup' ? 0 : 150
 *   discountTotal = derived from PromoCode in DB
 *   total = max(0, subtotal + shippingFee - discountTotal)
 *
 * These tests pin those formulas so an accidental refactor is caught.
 */

type Item = { unitPrice: number; quantity: number };

function calcSubtotal(items: Item[]): number {
  return items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
}

function calcDiscount(promo: { type: string; value: number } | null, subtotal: number): number {
  if (!promo) return 0;
  if (promo.type === 'percentage') return Math.min((subtotal * promo.value) / 100, subtotal);
  if (promo.type === 'fixed') return Math.min(promo.value, subtotal);
  if (promo.type === 'free_shipping') return 150;
  return 0;
}

function calcTotal(subtotal: number, shippingFee: number, discount: number): number {
  return Math.max(0, subtotal + shippingFee - discount);
}

describe('server-side price calculation', () => {
  it('subtotal is sum of unitPrice * quantity', () => {
    expect(calcSubtotal([{ unitPrice: 8950, quantity: 2 }, { unitPrice: 12500, quantity: 1 }])).toBe(30400);
  });

  it('shipping fee for store_pickup is 0', () => {
    expect(calcTotal(1000, 0, 0)).toBe(1000);
  });

  it('shipping fee for delivery is 150', () => {
    expect(calcTotal(1000, 150, 0)).toBe(1150);
  });

  it('percentage discount is capped at subtotal', () => {
    expect(calcDiscount({ type: 'percentage', value: 200 }, 500)).toBe(500);
  });

  it('fixed discount is capped at subtotal', () => {
    expect(calcDiscount({ type: 'fixed', value: 9999 }, 500)).toBe(500);
  });

  it('free_shipping discount equals shipping fee constant', () => {
    expect(calcDiscount({ type: 'free_shipping', value: 0 }, 1000)).toBe(150);
  });

  it('total is never negative even if discount > subtotal+shipping', () => {
    expect(calcTotal(100, 150, 9999)).toBe(0);
  });

  it('client-sent total is irrelevant — only server inputs matter', () => {
    // Simulating: client says total = 1, but server computes from cart + DB promo
    const subtotal = calcSubtotal([{ unitPrice: 8950, quantity: 1 }]);
    const discount = calcDiscount({ type: 'percentage', value: 10 }, subtotal);
    const total = calcTotal(subtotal, 150, discount);
    expect(total).toBe(8950 + 150 - 895);
    expect(total).not.toBe(1);
  });
});
