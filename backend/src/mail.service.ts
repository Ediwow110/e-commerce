import { env } from './env.js';

type MailPayload = { to: string | string[]; subject: string; html: string; text?: string };

type ReceiptItem = { name: string; quantity: number; unitPrice: number | string; lineTotal: number | string };
type ReceiptPayload = {
  orderNumber: string;
  customerName: string;
  total: number | string;
  subtotal?: number | string;
  shippingFee?: number | string;
  discount?: number | string;
  paymentStatus?: string;
  paymentMethod?: string;
  deliveryAddress?: Record<string, unknown> | null;
  trackingUrl?: string;
  items?: ReceiptItem[];
};

export async function sendMail(payload: MailPayload) {
  if (env.MAIL_PROVIDER === 'mock') {
    console.log('[mock-mail]', { ...payload, from: env.MAIL_FROM });
    return { provider: 'mock', id: `mock_${Date.now()}` };
  }

  if (env.MAIL_PROVIDER === 'resend') {
    if (!env.RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM, reply_to: env.MAIL_REPLY_TO, ...payload })
    });
    if (!response.ok) throw new Error(`Resend failed: ${await response.text()}`);
    return response.json();
  }

  if (env.MAIL_PROVIDER === 'sendgrid') {
    if (!env.SENDGRID_API_KEY) throw new Error('Missing SENDGRID_API_KEY');
    const to = Array.isArray(payload.to) ? payload.to.map(email => ({ email })) : [{ email: payload.to }];
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ personalizations: [{ to }], from: { email: extractEmail(env.MAIL_FROM) }, reply_to: env.MAIL_REPLY_TO ? { email: env.MAIL_REPLY_TO } : undefined, subject: payload.subject, content: [{ type: 'text/html', value: payload.html }] })
    });
    if (!response.ok) throw new Error(`SendGrid failed: ${await response.text()}`);
    return { provider: 'sendgrid', accepted: true };
  }

  if (!env.MAILGUN_API_KEY || !env.MAILGUN_DOMAIN) throw new Error('Missing Mailgun config');
  const form = new FormData();
  form.set('from', env.MAIL_FROM); form.set('to', Array.isArray(payload.to) ? payload.to.join(',') : payload.to);
  form.set('subject', payload.subject); form.set('html', payload.html); if (payload.text) form.set('text', payload.text);
  const response = await fetch(`https://api.mailgun.net/v3/${env.MAILGUN_DOMAIN}/messages`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`api:${env.MAILGUN_API_KEY}`).toString('base64')}` }, body: form });
  if (!response.ok) throw new Error(`Mailgun failed: ${await response.text()}`);
  return response.json();
}

function extractEmail(value: string) { return value.match(/<(.+)>/)?.[1] ?? value; }
function peso(value?: number | string) {
  if (value === undefined || value === null || value === '') return '₱0';
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(numeric)) return String(value);
  return `₱${numeric.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
}
function safe(value: unknown) { return String(value ?? '').replace(/[<>&]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch] || ch)); }
function formatAddress(address?: Record<string, unknown> | null) {
  if (!address) return 'Store pickup / no delivery address';
  if ((address as any).type === 'STORE_PICKUP') return 'Store pickup';
  return [address.line1, address.line2, address.city, address.province, address.postalCode, address.country].filter(Boolean).map(safe).join(', ');
}

export function orderConfirmationTemplate(orderNumber: string, customerName: string, total: string) {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#211b17"><h1 style="font-family:Georgia,serif">Thank you, ${safe(customerName)}</h1><p>Your order <b>${safe(orderNumber)}</b> has been received.</p><p>Total: <b>${safe(total)}</b></p><p>We will notify you when your order is being prepared and shipped.</p></div>`;
}

export function orderReceiptTemplate(payload: ReceiptPayload) {
  const items = payload.items?.length ? payload.items : [];
  const rows = items.map(item => `<tr><td style="padding:12px;border-bottom:1px solid #eee">${safe(item.name)} x ${item.quantity}</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right">${peso(item.lineTotal)}</td></tr>`).join('');
  return `<div style="font-family:Inter,Arial,sans-serif;color:#211b17;background:#fbf7f0;padding:24px">
    <div style="max-width:680px;margin:auto;background:#fff;border-radius:24px;padding:28px;border:1px solid #eadcc6">
      <h1 style="font-family:Georgia,serif;margin:0 0 8px">Your LUXE receipt</h1>
      <p>Hi ${safe(payload.customerName)}, thank you for your order.</p>
      <p><b>Order Number:</b> ${safe(payload.orderNumber)}<br/><b>Payment Status:</b> ${safe(payload.paymentStatus || 'Pending')}<br/><b>Payment Method:</b> ${safe(payload.paymentMethod || 'Selected at checkout')}</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">${rows || '<tr><td style="padding:12px;border-bottom:1px solid #eee">Order items</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right">Included</td></tr>'}</table>
      <p style="display:flex;justify-content:space-between"><span>Subtotal</span><b>${peso(payload.subtotal)}</b></p>
      <p style="display:flex;justify-content:space-between"><span>Shipping</span><b>${peso(payload.shippingFee)}</b></p>
      ${payload.discount ? `<p style="display:flex;justify-content:space-between"><span>Discount</span><b>-${peso(payload.discount)}</b></p>` : ''}
      <h2 style="display:flex;justify-content:space-between;border-top:1px solid #eee;padding-top:16px"><span>Total</span><span>${peso(payload.total)}</span></h2>
      <p><b>Delivery Address:</b><br/>${formatAddress(payload.deliveryAddress)}</p>
      ${payload.trackingUrl ? `<p><a href="${safe(payload.trackingUrl)}" style="color:#7b6030;font-weight:700">Track your order</a></p>` : ''}
      <p style="font-size:13px;color:#7a6b5d">Questions? Reply to this email or contact the store. Keep this receipt for warranty, returns, and exchanges.</p>
    </div>
  </div>`;
}

export function passwordResetTemplate(customerName: string, resetUrl: string) {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#211b17"><h1 style="font-family:Georgia,serif">Reset your password</h1><p>Hi ${safe(customerName)}, use the link below to reset your LUXE account password.</p><p><a href="${safe(resetUrl)}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p></div>`;
}

export function adminInvitationTemplate(staffName: string, inviterName: string, role: string, acceptUrl: string, expiresAt: Date) {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#211b17;background:#fbf7f0;padding:24px">
    <div style="max-width:560px;margin:auto;background:#fff;border-radius:24px;padding:28px;border:1px solid #eadcc6">
      <h1 style="font-family:Georgia,serif;margin:0 0 8px">You're invited to LUXE Staff Portal</h1>
      <p>Hi ${safe(staffName)}, ${safe(inviterName)} invited you to join the LUXE staff portal as <b>${safe(role)}</b>.</p>
      <p>Click the link below to set your password and activate your staff account:</p>
      <p><a href="${safe(acceptUrl)}" style="display:inline-block;padding:12px 24px;background:#211b17;color:#fff;text-decoration:none;border-radius:999px;font-weight:600">Accept invitation</a></p>
      <p style="font-size:13px;color:#7a6b5d">This invitation expires on ${safe(expiresAt.toUTCString())}. If you did not expect this email, you can ignore it.</p>
    </div>
  </div>`;
}
