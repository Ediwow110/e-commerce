# Payment provider launch checklist

LUXE Commerce supports three real providers — **PayMongo**, **Maya**, and
**Xendit** — plus `manual` (operator-verified) and `mock` (dev only).

Before flipping a provider live, walk this checklist top-to-bottom for that
provider. Tick every box with a real proof (URL, email, or signed-off screenshot).

> The boot-time preflight refuses to start with a sandbox key in
> `LAUNCH_MODE=production` (sk_test_*, xnd_development_*), but it cannot tell
> a leaked-but-real key apart from a properly-rotated one. Operator vigilance
> still required.

---

## Common to every provider

- [ ] Live merchant account approved by provider compliance.
- [ ] `LAUNCH_MODE=production` set in deployed env.
- [ ] `PAYMENT_PROVIDER_DEFAULT=<provider>` set.
- [ ] `PAYMENT_WEBHOOK_SECRET` is a fresh ≥32-char random string (rotate
      immediately if you ever pasted it into chat / a ticket / a screenshot).
- [ ] `FRONTEND_URL` is your real https domain (preflight enforces).
- [ ] CI green on the deploying commit.
- [ ] Place ONE real low-value order (₱20 / $1) end-to-end:
      - [ ] Checkout redirects to provider hosted page.
      - [ ] Successful payment fires webhook → order becomes PAID.
      - [ ] Order confirmation email received.
      - [ ] Stock decremented on the variant.
      - [ ] Admin "Orders" page shows the new order with provider reference.
- [ ] Refund the test order through the provider dashboard and confirm the
      LUXE order moves to `REFUNDED`.
- [ ] Rollback plan rehearsed (see bottom of this file).

---

## PayMongo (Philippines)

### Required env vars

```
PAYMENT_PROVIDER_DEFAULT=paymongo
PAYMONGO_SECRET_KEY=sk_live_xxx
PAYMONGO_PUBLIC_KEY=pk_live_xxx
PAYMENT_WEBHOOK_SECRET=<your random ≥32-char value, also pasted in PayMongo dashboard>
```

### Dashboard — Webhooks

- URL: `https://<your-api-domain>/api/payments/webhook?provider=paymongo`
- Events to subscribe: `checkout_session.payment.paid`, `payment.paid`,
  `payment.failed`.
- Mode: **Live**.
- Secret: paste the same value as `PAYMENT_WEBHOOK_SECRET`.

### Verification

- Header: `Paymongo-Signature: t=<unix>,te=<test_hmac>,li=<live_hmac>`
- Signed payload: `${t}.${rawBody}`
- HMAC-SHA256 with `PAYMENT_WEBHOOK_SECRET`.
- We reject events older than 5 minutes (replay protection).
- Implementation: `backend/src/payment.service.ts → verifyPaymongo`.

### Event mapping

| Provider event | LUXE outcome |
|---|---|
| `checkout_session.payment.paid` / `payment.paid` | order → PAID, payment → COMPLETED |
| `payment.failed` | payment → FAILED, order remains PENDING_PAYMENT (customer can retry) |
| anything else | logged + ignored |

### Test cards / wallets

- Test card 4343 4343 4343 4345, exp any future, CVC any.
- Live mode requires a real card / GCash / Maya wallet / GrabPay.
- Docs: <https://developers.paymongo.com>

---

## Maya (Philippines, formerly PayMaya)

### Required env vars

```
PAYMENT_PROVIDER_DEFAULT=maya
MAYA_PUBLIC_KEY=pk-live-xxx
MAYA_SECRET_KEY=sk-live-xxx
MAYA_WEBHOOK_AUTH=<bearer / basic-auth string you configure on Maya dashboard>
```

### Dashboard — Webhooks

- Production base: `https://pg.paymaya.com` (sandbox: `https://pg-sandbox.paymaya.com`).
- Webhook URL: `https://<your-api-domain>/api/payments/webhook?provider=maya`.
- Configure the `Authorization` header value Maya should send on every webhook
  call — copy it into `MAYA_WEBHOOK_AUTH`.

### Verification

- Maya does NOT sign individual webhook bodies; authentication is via the
  shared `Authorization` header (bearer or basic).
- Implementation: `verifyMaya` (timing-safe-equal on the configured value).
- For higher assurance, additionally pin Maya's source IPs in your WAF.

### Event mapping

Maya sends `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `PAYMENT_EXPIRED`,
`CHECKOUT_SUCCESS`, `CHECKOUT_FAILURE`, etc. Map them in routes.ts as PayMongo
does.

### Test wallets

- Sandbox lets you simulate success / failure on the hosted checkout page.
- Live mode requires a real Maya wallet or a card processed via Maya.

---

## Xendit (Philippines, Indonesia, others)

### Required env vars

```
PAYMENT_PROVIDER_DEFAULT=xendit
XENDIT_SECRET_KEY=xnd_production_xxx           # MUST NOT contain xnd_development
XENDIT_CALLBACK_TOKEN=<random ≥32-char token; paste this in Xendit dashboard>
```

### Dashboard — Settings → Callbacks

- Invoice paid callback URL: `https://<your-api-domain>/api/payments/webhook?provider=xendit`.
- Set the **Verification Token** to the value of `XENDIT_CALLBACK_TOKEN`.

### Verification

- Header `x-callback-token` is a static shared secret.
- Implementation: `verifyXendit` (timing-safe-equal).

### Event mapping

| Xendit event status | LUXE outcome |
|---|---|
| `PAID` / `SETTLED` | order → PAID |
| `EXPIRED` | order → EXPIRED |
| `FAILED` | payment → FAILED, order stays PENDING_PAYMENT |

### Test instructions

- Sandbox uses test virtual accounts, test e-wallets, and test cards.
- Use Xendit's "Simulate payment" buttons on a sandbox invoice.

---

## Late-payment safety

If a webhook arrives for an order already marked `EXPIRED` (because the cron
beat the customer to the payment page):

- Order is moved to `MANUAL_REVIEW`.
- A `PAYMENT_LATE_REVIEW` audit log is written.
- Operator must reconcile manually (refund the customer or fulfil + restock).

This is verified by `backend/tests/integration/webhook.test.ts`.

---

## Rollback plan

If a deploy enables live payments and you discover a bug:

1. **Disable the provider in the dashboard first** (turn off the webhook). This
   stops new live charges flowing into LUXE.
2. Set `PAYMENT_PROVIDER_DEFAULT=manual` in env and redeploy. Customers see
   "manual payment instructions" instead of a checkout session.
3. Investigate, fix, re-test on staging, then re-enable.

You CANNOT rollback the database to "before live mode" — orders that paid for
real cannot be unwound by code. Treat rollbacks as forward-only repairs.

---

## Security log triggers

The following emit `WARN`/`ERROR` audit logs and SHOULD be alerted on:

- `PAYMENT_AMOUNT_MISMATCH` — webhook amount ≠ order total.
- `PAYMENT_CURRENCY_MISMATCH` — webhook currency ≠ order currency.
- `WEBHOOK_SIGNATURE_INVALID` — verification failed (could be misconfigured
  secret or an attack).
- `PAYMENT_LATE_REVIEW` — webhook for EXPIRED order routed to MANUAL_REVIEW.

Set Sentry alerts on these messages.
