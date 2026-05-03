import { describe, it, expect } from 'vitest';
import {
  canTransitionOrder, canTransitionPayment, assertOrderTransition,
  assertPaymentTransition, canWebhookMarkPaid, isStockReserved, isStockConsumed
} from '../src/orderState.js';

describe('order state machine', () => {
  it('allows the happy path PENDING_PAYMENT → ... → DELIVERED', () => {
    const path = ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'TO_SHIP', 'SHIPPED', 'DELIVERED'];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransitionOrder(path[i], path[i + 1])).toBe(true);
    }
  });

  it('rejects illegal jumps', () => {
    expect(canTransitionOrder('PENDING_PAYMENT', 'SHIPPED')).toBe(false);
    expect(canTransitionOrder('SHIPPED', 'CANCELLED')).toBe(false);
    expect(canTransitionOrder('DELIVERED', 'CANCELLED')).toBe(false);
    expect(canTransitionOrder('CANCELLED', 'CONFIRMED')).toBe(false);
    expect(canTransitionOrder('EXPIRED', 'CONFIRMED')).toBe(false);
  });

  it('throws helpful messages on invalid transitions', () => {
    expect(() => assertOrderTransition('PENDING_PAYMENT', 'SHIPPED')).toThrowError(/Cannot transition.*SHIPPED/);
    expect(() => assertPaymentTransition('PAID', 'PENDING')).toThrowError(/Cannot transition payment from PAID to PENDING/);
  });

  it('treats no-op (same state) as allowed', () => {
    expect(() => assertOrderTransition('CONFIRMED', 'CONFIRMED')).not.toThrow();
    expect(() => assertPaymentTransition('PAID', 'PAID')).not.toThrow();
  });

  it('webhook may only mark unpaid orders as paid', () => {
    expect(canWebhookMarkPaid('PENDING_PAYMENT', 'PENDING')).toBe(true);
    expect(canWebhookMarkPaid('PENDING', 'PENDING')).toBe(true);
    expect(canWebhookMarkPaid('CONFIRMED', 'PAID')).toBe(false);
    expect(canWebhookMarkPaid('CANCELLED', 'PENDING')).toBe(false);
    expect(canWebhookMarkPaid('EXPIRED', 'EXPIRED')).toBe(false);
    expect(canWebhookMarkPaid('REFUNDED', 'REFUNDED')).toBe(false);
  });

  it('reserved-stock detection covers pending statuses only', () => {
    expect(isStockReserved('PENDING_PAYMENT')).toBe(true);
    expect(isStockReserved('PENDING')).toBe(true);
    expect(isStockReserved('CONFIRMED')).toBe(false);
    expect(isStockConsumed('CONFIRMED')).toBe(true);
    expect(isStockConsumed('SHIPPED')).toBe(true);
    expect(isStockConsumed('CANCELLED')).toBe(false);
    expect(isStockConsumed('EXPIRED')).toBe(false);
  });

  it('payment lifecycle: PENDING → MANUAL_REVIEW → PAID is allowed', () => {
    expect(canTransitionPayment('PENDING', 'MANUAL_REVIEW')).toBe(true);
    expect(canTransitionPayment('MANUAL_REVIEW', 'PAID')).toBe(true);
    expect(canTransitionPayment('EXPIRED', 'MANUAL_REVIEW')).toBe(true);
    expect(canTransitionPayment('CANCELLED', 'PAID')).toBe(false);
    expect(canTransitionPayment('REFUNDED', 'PAID')).toBe(false);
  });
});
