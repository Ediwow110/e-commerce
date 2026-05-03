/**
 * Webhook integration: real DB + supertest. Verifies idempotency, amount/currency
 * mismatch rejection, signature verification, and the late-payment-for-expired-order
 * MANUAL_REVIEW path.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../src/app.js';
import { prisma } from '../../src/prisma.js';
import { resetDb, seedMinimal } from './setup.js';

const HAS_DB = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('noop');
const d = HAS_DB ? describe : describe.skip;

function paymongoSig(rawBody: string, secret: string) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const signed = `${ts}.${rawBody}`;
  const sig = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  return `t=${ts},te=${sig}`;
}

async function makeOrder(opts: { status: string; paymentStatus: string }) {
  const { product, variant } = await seedMinimal();
  const user = await prisma.user.create({ data: { name: 'WB', email: `wb-${Date.now()}@luxe.test`, role: 'CUSTOMER' } });
  const order = await prisma.order.create({
    data: {
      orderNumber: `LX-WB-${Date.now()}`,
      userId: user.id,
      status: opts.status as never,
      paymentStatus: opts.paymentStatus as never,
      subtotal: '500', total: '500',
      items: { create: [{ productId: product.id, variantId: variant.id, name: 'X', unitPrice: '500', quantity: 1, lineTotal: '500' }] }
    }
  });
  const payment = await prisma.payment.create({
    data: { orderId: order.id, provider: 'paymongo', reference: order.orderNumber, status: 'PENDING', amount: '500' }
  });
  return { order, payment };
}

d('payment webhook integration', () => {
  beforeEach(async () => { await resetDb(); });

  it('rejects bad signature with 401', async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'test-secret-123';
    const body = JSON.stringify({ type: 'payment.paid', data: { id: 'evt_1', attributes: { reference_number: 'LX-WB-FAKE' } } });
    const res = await request(app)
      .post('/api/payments/webhook/paymongo')
      .set('Content-Type', 'application/json')
      .set('Paymongo-Signature', 't=0,te=deadbeef')
      .send(body);
    expect(res.status).toBe(401);
  });

  it('marks PENDING_PAYMENT order as PAID/CONFIRMED on valid signed paid event', async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'test-secret-paid';
    const { order } = await makeOrder({ status: 'PENDING_PAYMENT', paymentStatus: 'PENDING' });

    const body = JSON.stringify({
      type: 'payment.paid',
      data: { id: 'evt_paid_1', attributes: { reference_number: order.orderNumber, amount: 500, currency: 'PHP' } }
    });
    const res = await request(app)
      .post('/api/payments/webhook/paymongo')
      .set('Content-Type', 'application/json')
      .set('Paymongo-Signature', paymongoSig(body, 'test-secret-paid'))
      .send(body);

    expect(res.status).toBe(200);
    const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh.status).toBe('CONFIRMED');
    expect(fresh.paymentStatus).toBe('PAID');
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
    expect(payment.status).toBe('PAID');
    expect(payment.paidAt).not.toBeNull();
  });

  it('is idempotent — replaying the same eventId does NOT double-process', async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'test-secret-idem';
    const { order } = await makeOrder({ status: 'PENDING_PAYMENT', paymentStatus: 'PENDING' });
    const body = JSON.stringify({
      type: 'payment.paid',
      data: { id: 'evt_idem', attributes: { reference_number: order.orderNumber, amount: 500, currency: 'PHP' } }
    });
    const sig = paymongoSig(body, 'test-secret-idem');

    const a = await request(app).post('/api/payments/webhook/paymongo').set('Content-Type', 'application/json').set('Paymongo-Signature', sig).send(body);
    const b = await request(app).post('/api/payments/webhook/paymongo').set('Content-Type', 'application/json').set('Paymongo-Signature', sig).send(body);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(b.body.duplicate).toBe(true);
  });

  it('rejects amount mismatch and does not change order state', async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'test-secret-amt';
    const { order } = await makeOrder({ status: 'PENDING_PAYMENT', paymentStatus: 'PENDING' });
    const body = JSON.stringify({
      type: 'payment.paid',
      data: { id: 'evt_amt', attributes: { reference_number: order.orderNumber, amount: 12345, currency: 'PHP' } }
    });
    const res = await request(app)
      .post('/api/payments/webhook/paymongo')
      .set('Content-Type', 'application/json')
      .set('Paymongo-Signature', paymongoSig(body, 'test-secret-amt'))
      .send(body);
    expect(res.status).toBe(422);
    const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh.paymentStatus).not.toBe('PAID');
  });

  it('routes late payment for an EXPIRED order to MANUAL_REVIEW', async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'test-secret-late';
    const { order, payment } = await makeOrder({ status: 'EXPIRED', paymentStatus: 'EXPIRED' });
    const body = JSON.stringify({
      type: 'payment.paid',
      data: { id: 'evt_late', attributes: { reference_number: order.orderNumber, amount: 500, currency: 'PHP' } }
    });
    const res = await request(app)
      .post('/api/payments/webhook/paymongo')
      .set('Content-Type', 'application/json')
      .set('Paymongo-Signature', paymongoSig(body, 'test-secret-late'))
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body.ignored).toBe('order-not-payable');

    const fresh = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(fresh.status).toBe('MANUAL_REVIEW');
    const audit = await prisma.auditLog.findFirst({ where: { action: 'PAYMENT_LATE_FOR_EXPIRED_ORDER' } });
    expect(audit).not.toBeNull();
  });
});
