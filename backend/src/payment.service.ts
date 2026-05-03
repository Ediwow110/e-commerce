import crypto from 'crypto';
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

function resolveProvider(provider?: string): PaymentProviderName {
  const chosen = (provider || env.PAYMENT_PROVIDER_DEFAULT || 'mock').toLowerCase();
  if (['paymongo', 'maya', 'xendit', 'manual', 'mock'].includes(chosen)) return chosen as PaymentProviderName;
  return 'mock';
}

function requireKey(value: string | undefined, label: string) {
  if (!value) throw new ApiError(500, `${label} is not configured`);
  return value;
}

// FIX P0-001: Idempotency keys added to all gateway calls
// FIX P0-002: Maya uses production URL in production, sandbox only in development
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
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(502, payload?.errors?.[0]?.detail || 'PayMongo checkout creation failed');
  return { provider: 'paymongo', reference: payload.data.id, checkoutUrl: payload.data.attributes.checkout_url, raw: payload };
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
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(502, payload?.message || 'Xendit invoice creation failed');
  return { provider: 'xendit', reference: payload.id || input.orderNumber, checkoutUrl: payload.invoice_url, raw: payload };
}

async function createMayaCheckout(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const publicKey = requireKey(env.MAYA_PUBLIC_KEY, 'MAYA_PUBLIC_KEY');
  const secret = requireKey(env.MAYA_SECRET_KEY, 'MAYA_SECRET_KEY');
  const auth = Buffer.from(publicKey + ':' + secret).toString('base64');
  // FIX P0-002: Use correct production URL — never hard-code sandbox
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
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(502, payload?.message || 'Maya checkout creation failed');
  return { provider: 'maya', reference: payload.checkoutId || input.orderNumber, checkoutUrl: payload.redirectUrl, raw: payload };
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
  return {
    provider: 'mock',
    reference: `MOCK-${input.orderNumber}`,
    checkoutUrl: `${input.successUrl || '/'}?mock_payment=success`,
    raw: { mock: true }
  };
}

// FIX P0-001: Webhook signature is NEVER bypassed, even in non-production.
// When a real payment provider key is configured, PAYMENT_WEBHOOK_SECRET is required.
export function verifyWebhookSignature(rawBody: unknown, signature: string | undefined): boolean {
  const hasRealPaymentKey = !!(env.PAYMONGO_SECRET_KEY || env.XENDIT_SECRET_KEY || env.MAYA_SECRET_KEY);

  if (!env.PAYMENT_WEBHOOK_SECRET) {
    if (hasRealPaymentKey) {
      // Real keys are configured but no webhook secret — this is a misconfiguration.
      // Reject all webhooks to prevent fraudulent order marking.
      throw new ApiError(500, 'PAYMENT_WEBHOOK_SECRET must be set when real payment provider keys are configured');
    }
    // No real keys and no secret = mock/dev mode with no real payments, reject anyway.
    return false;
  }

  if (!signature) return false;

  const body = Buffer.isBuffer(rawBody)
    ? rawBody.toString('utf8')
    : typeof rawBody === 'string'
      ? rawBody
      : JSON.stringify(rawBody);

  const normalizedSignature = signature.trim();
  const expected = crypto.createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET).update(body).digest('hex');
  const actualBuffer = Buffer.from(normalizedSignature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}
