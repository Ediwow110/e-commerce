import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';

// Set required env vars BEFORE importing the module that reads them.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'a'.repeat(40);
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'b'.repeat(40);
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://x:y@localhost:5432/none';
process.env.PAYMENT_WEBHOOK_SECRET = 'whsec_test_secret_for_unit_tests_only_32+';
process.env.XENDIT_CALLBACK_TOKEN = 'xendit-static-token';

let verify: (provider: string, raw: string, headers: Record<string, string | string[] | undefined>) => boolean;

beforeAll(async () => {
  const mod = await import('../src/payment.service.js');
  verify = mod.verifyProviderWebhookSignature;
});

function paymongoSig(rawBody: string, secret: string, ts = Math.floor(Date.now() / 1000)): string {
  const signed = `${ts}.${rawBody}`;
  const sig = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  return `t=${ts},te=${sig},li=${sig}`;
}

describe('webhook signature verification', () => {
  const body = JSON.stringify({ data: { id: 'evt_1', attributes: { reference_number: 'LX-1' } } });

  it('rejects PayMongo webhook with missing signature', () => {
    expect(verify('paymongo', body, {})).toBe(false);
  });

  it('rejects PayMongo webhook with invalid signature', () => {
    expect(verify('paymongo', body, { 'paymongo-signature': 't=123,te=deadbeef,li=deadbeef' })).toBe(false);
  });

  it('accepts PayMongo webhook with correct signature', () => {
    const sig = paymongoSig(body, process.env.PAYMENT_WEBHOOK_SECRET!);
    expect(verify('paymongo', body, { 'paymongo-signature': sig })).toBe(true);
  });

  it('rejects replayed PayMongo webhook older than 5 minutes', () => {
    const old = Math.floor(Date.now() / 1000) - 1000;
    const sig = paymongoSig(body, process.env.PAYMENT_WEBHOOK_SECRET!, old);
    expect(verify('paymongo', body, { 'paymongo-signature': sig })).toBe(false);
  });

  it('rejects Xendit webhook with wrong x-callback-token', () => {
    expect(verify('xendit', body, { 'x-callback-token': 'wrong' })).toBe(false);
  });

  it('accepts Xendit webhook with correct x-callback-token', () => {
    expect(verify('xendit', body, { 'x-callback-token': process.env.XENDIT_CALLBACK_TOKEN })).toBe(true);
  });

  it('rejects unknown provider', () => {
    expect(verify('totally-fake', body, {})).toBe(false);
  });

  it('rejects manual provider webhook (manual is admin-verified, no webhook)', () => {
    expect(verify('manual', body, {})).toBe(false);
  });
});
