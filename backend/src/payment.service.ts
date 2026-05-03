import crypto from 'crypto';
import type { IncomingHttpHeaders } from 'http';
import { env } from './env.js';
import { ApiError } from './errors.js';

export type PaymentProviderName = 'paymongo' | 'maya' | 'xendit' | 'manual' | 'mock';

export type CreatePaymentInput = {
  provider?: PaymentProviderName;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency?: string;
  description: string;
  customer: { name: string; email: string; phone?: string | null };
  successUrl?: string;
  cancelUrl?: string;
};

export type CreatePaymentResult = {
  provider: PaymentProviderName;
  reference: string;
  checkoutUrl?: string;
  instructions?: string;
  raw?: unknown;
};

// Loose shapes for provider JSON payloads — we never trust their structure blindly.
type JsonObject = Record<string, unknown>;
function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' ? (value as JsonObject) : {};
}
function getString(obj: unknown, key: string): string | undefined {
  const o = asObject(obj);
  const v = o[key];
  return typeof v === 'string' ? v : undefined;
}

function resolveProvider(provider?: string): PaymentProviderName {
  const chosen = (provider || env.PAYMENT_PROVIDER_DEFAULT || 'mock').toLowerCase();
  if (['paymongo', 'maya', 'xendit', 'manual', 'mock'].includes(chosen)) return chosen as PaymentProviderName;
  return 'mock';
}

function requireKey(value: string | undefined, label: string) {
  if (!value) throw new ApiError(500, `${label} is not configured`);
  return value;
}

const MAYA_BASE_URL = env.NODE_ENV === 'production'
  ? 'https://pg.paymaya.com'
  : 'https://pg-sandbox.paymaya.com';

async function createPayMongoCheckout(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const secret = requireKey(env.PAYMONGO_SECRET_KEY, 'PAYMONGO_SECRET_KEY');
  const auth = Buffer.from(secret + ':').toString('base64');
  const amount = Math.round(input.amount * 100);
  const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.orderNumber,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          description: input.description,
          line_items: [{ currency: input.currency || 'PHP', amount, name: input.orderNumber, quantity: 1 }],
          payment_method_types: ['card', 'gcash', 'paymaya', 'grab_pay'],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          metadata: { orderId: input.orderId, orderNumber: input.orderNumber, customerEmail: input.customer.email }
        }
      }
    })
  });
  const payload = asObject(await response.json().catch(() => ({})));
  if (!response.ok) {
    const errors = (payload.errors as Array<{ detail?: string }> | undefined) ?? [];
    throw new ApiError(502, errors[0]?.detail || 'PayMongo checkout creation failed');
  }
  const data = asObject(payload.data);
  const attributes = asObject(data.attributes);
  return {
    provider: 'paymongo',
    reference: typeof data.id === 'string' ? data.id : input.orderNumber,
    checkoutUrl: typeof attributes.checkout_url === 'string' ? attributes.checkout_url : undefined,
    raw: payload
  };
}

async function createXenditInvoice(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const secret = requireKey(env.XENDIT_SECRET_KEY, 'XENDIT_SECRET_KEY');
  const auth = Buffer.from(secret + ':').toString('base64');
  const response = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Idempotency-key': input.orderNumber,
    },
    body: JSON.stringify({
      external_id: input.orderNumber,
      amount: input.amount,
      payer_email: input.customer.email,
      description: input.description,
      success_redirect_url: input.successUrl,
      failure_redirect_url: input.cancelUrl,
      currency: input.currency || 'PHP'
    })
  });
  const payload = asObject(await response.json().catch(() => ({})));
  if (!response.ok) throw new ApiError(502, getString(payload, 'message') || 'Xendit invoice creation failed');
  return {
    provider: 'xendit',
    reference: getString(payload, 'id') || input.orderNumber,
    checkoutUrl: getString(payload, 'invoice_url'),
    raw: payload
  };
}

async function createMayaCheckout(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const publicKey = requireKey(env.MAYA_PUBLIC_KEY, 'MAYA_PUBLIC_KEY');
  const secret = requireKey(env.MAYA_SECRET_KEY, 'MAYA_SECRET_KEY');
  const auth = Buffer.from(publicKey + ':' + secret).toString('base64');
  const response = await fetch(`${MAYA_BASE_URL}/checkout/v1/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      totalAmount: { value: input.amount, currency: input.currency || 'PHP' },
      buyer: { firstName: input.customer.name, contact: { email: input.customer.email, phone: input.customer.phone || undefined } },
      items: [{ name: input.orderNumber, quantity: 1, totalAmount: { value: input.amount, currency: input.currency || 'PHP' } }],
      redirectUrl: { success: input.successUrl, failure: input.cancelUrl, cancel: input.cancelUrl },
      requestReferenceNumber: input.orderNumber
    })
  });
  const payload = asObject(await response.json().catch(() => ({})));
  if (!response.ok) throw new ApiError(502, getString(payload, 'message') || 'Maya checkout creation failed');
  return {
    provider: 'maya',
    reference: getString(payload, 'checkoutId') || input.orderNumber,
    checkoutUrl: getString(payload, 'redirectUrl'),
    raw: payload
  };
}

export async function createPaymentCheckout(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const provider = resolveProvider(input.provider);
  if (provider === 'paymongo') return createPayMongoCheckout(input);
  if (provider === 'xendit') return createXenditInvoice(input);
  if (provider === 'maya') return createMayaCheckout(input);
  if (provider === 'manual') return {
    provider,
    reference: input.orderNumber,
    instructions: 'Awaiting manual payment verification. Customer may pay by bank transfer, GCash QR, or COD based on store policy.'
  };
  if (env.NODE_ENV === 'production') {
    throw new ApiError(500, 'Mock payment provider is not allowed in production');
  }
  return {
    provider: 'mock',
    reference: `MOCK-${input.orderNumber}`,
    checkoutUrl: `${input.successUrl || '/'}?mock_payment=success`,
    raw: { mock: true }
  };
}

// ─── Webhook signature verification ─────────────────────────────────────────
// Each provider has its own signature scheme. We MUST NOT use a single generic
// HMAC verifier for all of them — that was the previous bug.

function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * PayMongo: header `Paymongo-Signature: t=<unix>,te=<test_hmac>,li=<live_hmac>`
 * Signed payload is `${t}.${rawBody}`, hashed HMAC-SHA256 with webhook secret.
 * Docs: https://developers.paymongo.com/docs/webhooks
 */
function verifyPaymongo(rawBody: string, headers: IncomingHttpHeaders): boolean {
  const secret = env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return false;
  const header = String(headers['paymongo-signature'] || headers['x-paymongo-signature'] || '');
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => {
    const [k, v] = kv.trim().split('=');
    return [k, v];
  }));
  const t = parts.t;
  const candidate = parts.li || parts.te;
  if (!t || !candidate) return false;
  const signed = `${t}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  // Reject events older than 5 minutes (replay protection)
  const ts = Number(t);
  if (Number.isFinite(ts) && Math.abs(Date.now() / 1000 - ts) > 300) return false;
  return timingSafeEqualHex(candidate, expected);
}

/**
 * Xendit: header `x-callback-token` is a static verification token that must
 * exactly match the value configured on Xendit dashboard. There is no body HMAC.
 * Docs: https://developers.xendit.co/api-reference/#callbacks
 */
function verifyXendit(_rawBody: string, headers: IncomingHttpHeaders): boolean {
  const expected = env.XENDIT_CALLBACK_TOKEN;
  if (!expected) return false;
  const provided = String(headers['x-callback-token'] || '');
  if (!provided) return false;
  return timingSafeEqualHex(provided, expected);
}

/**
 * Maya: webhooks are authenticated via mTLS or a Basic Auth header configured
 * on dashboard. There is no provider-supplied per-event HMAC. We require the
 * configured shared-secret bearer/basic-auth header to match.
 * Docs: https://developers.maya.ph/docs/webhooks
 */
function verifyMaya(_rawBody: string, headers: IncomingHttpHeaders): boolean {
  const expected = env.MAYA_WEBHOOK_AUTH;
  if (!expected) return false;
  const provided = String(headers.authorization || '');
  if (!provided) return false;
  return timingSafeEqualHex(provided, expected);
}

/**
 * Generic HMAC fallback for `mock` provider in dev/tests only.
 * Header: `x-luxe-signature: <hex sha256(body)>`
 */
function verifyMock(rawBody: string, headers: IncomingHttpHeaders): boolean {
  if (env.NODE_ENV === 'production') return false;
  const secret = env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return false;
  const provided = String(headers['x-luxe-signature'] || '');
  if (!provided) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingSafeEqualHex(provided, expected);
}

export function verifyProviderWebhookSignature(
  provider: string,
  rawBody: string,
  headers: IncomingHttpHeaders
): boolean {
  // Refuse to accept any webhook without a configured secret in production.
  if (env.NODE_ENV === 'production' && !env.PAYMENT_WEBHOOK_SECRET) {
    throw new ApiError(500, 'PAYMENT_WEBHOOK_SECRET must be configured in production');
  }
  switch (provider) {
    case 'paymongo': return verifyPaymongo(rawBody, headers);
    case 'xendit':   return verifyXendit(rawBody, headers);
    case 'maya':     return verifyMaya(rawBody, headers);
    case 'manual':   return false;
    case 'mock':     return verifyMock(rawBody, headers);
    default:         return false;
  }
}

/** @deprecated kept for back-compat with older imports — use verifyProviderWebhookSignature. */
export function verifyWebhookSignature(rawBody: unknown, signature: string | undefined): boolean {
  if (!env.PAYMENT_WEBHOOK_SECRET || !signature) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8')
    : typeof rawBody === 'string' ? rawBody
    : JSON.stringify(rawBody);
  const expected = crypto.createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET).update(body).digest('hex');
  return timingSafeEqualHex(signature.trim(), expected);
}
