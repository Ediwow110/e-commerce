import { ApiError } from './errors.js';

/**
 * Centralised order/payment state machine.
 *
 * Enforces every legal transition. Anything not listed here is rejected.
 *
 * Order lifecycle:
 *
 *   PENDING_PAYMENT ──(webhook PAID or admin override)──► CONFIRMED
 *          │                                                │
 *          ├──(timeout)──► EXPIRED  (stock restored)        │
 *          ├──(provider failure)──► PAYMENT_FAILED          │
 *          └──(customer/admin)─────► CANCELLED              ▼
 *                                                       PREPARING ► TO_SHIP ► SHIPPED ► DELIVERED ► REFUNDED
 *
 *   PENDING is retained as a compatibility alias for legacy orders
 *   created before PENDING_PAYMENT existed; new code should produce
 *   PENDING_PAYMENT.
 */

export const ORDER_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING:         ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'PAYMENT_FAILED'],
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED', 'EXPIRED', 'PAYMENT_FAILED'],
  CONFIRMED:       ['PREPARING', 'CANCELLED'],
  PREPARING:       ['TO_SHIP', 'CANCELLED'],
  TO_SHIP:         ['SHIPPED', 'CANCELLED'],
  SHIPPED:         ['DELIVERED'],
  DELIVERED:       ['REFUNDED'],
  CANCELLED:       [],
  EXPIRED:         [],            // Terminal — late payment routes to MANUAL_REVIEW on the Payment, not the Order
  PAYMENT_FAILED:  ['PENDING_PAYMENT', 'CANCELLED'],
  REFUNDED:        []
} as const;

export const PAYMENT_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  UNPAID:         ['PENDING', 'CANCELLED'],
  PENDING:        ['PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'MANUAL_REVIEW'],
  PAID:           ['REFUNDED'],
  FAILED:         ['PENDING', 'CANCELLED'],
  CANCELLED:      [],
  EXPIRED:        ['MANUAL_REVIEW'],   // late payment for an expired order goes to manual review
  MANUAL_REVIEW:  ['PAID', 'CANCELLED', 'REFUNDED'],
  REFUNDED:       []
} as const;

export function canTransitionOrder(from: string, to: string): boolean {
  return (ORDER_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function canTransitionPayment(from: string, to: string): boolean {
  return (PAYMENT_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function assertOrderTransition(from: string, to: string): void {
  if (from === to) return;
  if (!canTransitionOrder(from, to)) {
    const allowed = ORDER_STATUS_TRANSITIONS[from] ?? [];
    throw new ApiError(422, `Cannot transition order from ${from} to ${to}. Allowed: ${allowed.join(', ') || 'none'}`);
  }
}

export function assertPaymentTransition(from: string, to: string): void {
  if (from === to) return;
  if (!canTransitionPayment(from, to)) {
    const allowed = PAYMENT_STATUS_TRANSITIONS[from] ?? [];
    throw new ApiError(422, `Cannot transition payment from ${from} to ${to}. Allowed: ${allowed.join(', ') || 'none'}`);
  }
}

/** Orders in these states have already consumed/finalised stock. */
export function isStockConsumed(orderStatus: string): boolean {
  return ['CONFIRMED', 'PREPARING', 'TO_SHIP', 'SHIPPED', 'DELIVERED', 'REFUNDED'].includes(orderStatus);
}

/** Orders in these states still hold reserved stock that may need restoration. */
export function isStockReserved(orderStatus: string): boolean {
  return ['PENDING', 'PENDING_PAYMENT'].includes(orderStatus);
}

/** Webhook may transition an order to PAID only if it is still expecting payment. */
export function canWebhookMarkPaid(orderStatus: string, paymentStatus: string): boolean {
  if (paymentStatus === 'PAID' || paymentStatus === 'REFUNDED' || paymentStatus === 'CANCELLED') return false;
  return ['PENDING', 'PENDING_PAYMENT'].includes(orderStatus);
}
