# Payment Live-Mode Checklist

For each provider you intend to enable for real payments, complete the section below in order. Do not enable a provider in production until every box for that provider is ticked.

The webhook URL is the same for all providers:

```
https://yourdomain.example.com/api/payments/webhook
```

Replace `yourdomain.example.com` with your real production domain everywhere below.

> **REQUIRES REVIEW:** Provider dashboards change UI from time to time. Field names below may have small wording differences in the live UI — match by intent, not by exact label.

---

## A. PayMongo

### A.1 Dashboard setup

- [ ] Sign in at the PayMongo dashboard with the business owner's account.
- [ ] Complete the **Business Verification / KYC**: business documents, valid government IDs, settlement bank account.
- [ ] Wait for PayMongo to email you the "verification approved" notice.
- [ ] In the dashboard top-right toggle, switch from **Test Mode → Live Mode**.

### A.2 Webhook URL setup

- [ ] In dashboard → **Developers → Webhooks → Add Endpoint**.
- [ ] URL: `https://yourdomain.example.com/api/payments/webhook`
- [ ] Events to subscribe to (minimum):
  - `payment.paid`
  - `payment.failed`
  - `source.chargeable`
  - `link.payment.paid`
  - `checkout_session.payment.paid`
  - (refunds, if you enabled them) `payment.refunded`
- [ ] Save. PayMongo will display a **webhook secret** (starts with `whsec_`). Copy it.

### A.3 Live env vars

Set in production env (see `ENV_PRODUCTION_CHECKLIST.md`):

```
PAYMONGO_SECRET_KEY=sk_live_********              # from Developers → API Keys (live)
PAYMONGO_PUBLIC_KEY=pk_live_********              # safe to expose; used by the frontend
PAYMONGO_WEBHOOK_SECRET=whsec_********            # from §A.2
```

The boot preflight refuses to start with `LAUNCH_MODE=production` if any `PAYMONGO_*_KEY` still starts with `sk_test_` / `pk_test_`.

### A.4 Test live payment

1. Place a low-value real order (e.g. ₱20 add-on item) from a real customer account.
2. Pay with a real card or GCash you own.
3. Verify in the PayMongo dashboard → Payments — payment shows `paid`.
4. Verify in `/admin/orders/<id>` — order status is `PAID` within 60 seconds.

### A.5 Refund / cancel test

- [ ] In PayMongo dashboard → Payments → select the test payment → **Refund**.
- [ ] Confirm refund succeeds in PayMongo.
- [ ] Confirm `/admin/orders/<id>` reflects `REFUNDED` (or your equivalent status) within 60 seconds via the `payment.refunded` webhook.
- [ ] Customer received the refund-confirmation email.

### A.6 Confirm paid order in admin

```
/admin/orders → filter by status=PAID → newest order
```

The order detail panel must show: `Provider: paymongo`, `Provider Reference: pi_xxx`, `Webhook Verified: true`, `Settled At: <timestamp>`.

---

## B. Maya (PayMaya)

### B.1 Dashboard setup

- [ ] Sign in at the Maya Business / Maya for Business portal.
- [ ] Complete the **Merchant Onboarding** flow: business registration, IDs, settlement bank.
- [ ] Wait for Maya to mark the merchant as **live-ready**.
- [ ] In the portal switch from **Sandbox → Production**.

### B.2 Webhook URL setup

- [ ] Maya portal → **Developers → Webhooks → Create**.
- [ ] URL: `https://yourdomain.example.com/api/payments/webhook`
- [ ] Subscribe to events (minimum):
  - `PAYMENT_SUCCESS`
  - `PAYMENT_FAILED`
  - `PAYMENT_EXPIRED`
  - `CHECKOUT_SUCCESS`
  - (refunds) `REFUND_SUCCESS`, `REFUND_FAILED`
- [ ] Maya will show a **callback / signing secret**. Copy it.

### B.3 Live env vars

```
MAYA_PUBLIC_KEY=pk-live-********
MAYA_SECRET_KEY=sk-live-********
MAYA_WEBHOOK_SECRET=********
```

### B.4 Test live payment

1. Real low-value order, pay via Maya wallet or supported card.
2. Maya portal → Transactions — entry shows `SUCCESS`.
3. `/admin/orders/<id>` is `PAID` within 60 seconds.

### B.5 Refund / cancel test

- [ ] Maya portal → select the test payment → **Refund** (full or partial).
- [ ] Within 60 seconds, the order in admin reflects the refund.
- [ ] Refund-confirmation email arrived.

### B.6 Confirm paid order in admin

Order detail must show `Provider: maya`, `Provider Reference: <maya-payment-id>`, `Webhook Verified: true`.

---

## C. Xendit

### C.1 Dashboard setup

- [ ] Sign in at the Xendit dashboard.
- [ ] Complete **Business Activation** — business docs, IDs, settlement bank.
- [ ] In the dashboard switch from **Test Mode → Live Mode**.

### C.2 Webhook (Callback) URL setup

Xendit splits webhooks per product. Configure all that you accept:

- [ ] Settings → **Callbacks → Invoices**: `https://yourdomain.example.com/api/payments/webhook`
- [ ] Settings → **Callbacks → E-wallets** (GCash, GrabPay, ShopeePay): same URL
- [ ] Settings → **Callbacks → Cards**: same URL
- [ ] Settings → **Callbacks → Refunds**: same URL
- [ ] Generate a **Callback Verification Token** in Settings → Webhook Verification. Copy it.

### C.3 Live env vars

```
XENDIT_SECRET_KEY=xnd_production_********
XENDIT_PUBLIC_KEY=xnd_public_production_********
XENDIT_WEBHOOK_TOKEN=********
```

### C.4 Test live payment

1. Real low-value order, pay via Xendit invoice or e-wallet.
2. Xendit dashboard → Transactions — entry shows `PAID` / `SETTLED`.
3. `/admin/orders/<id>` is `PAID` within 60 seconds.

### C.5 Refund / cancel test

- [ ] Xendit dashboard → Refunds → create refund.
- [ ] Within 60 seconds, admin order reflects the refund.
- [ ] Refund email arrived.

### C.6 Confirm paid order in admin

Order detail must show `Provider: xendit`, `Provider Reference: <xendit-payment-id>`, `Webhook Verified: true`.

---

## D. Rollback to manual payments if a provider fails

If, **during launch**, a provider stops accepting payments or returns webhook errors persistently:

1. **In the admin → Settings → Payments**, disable the failing provider's button so customers cannot select it at checkout. (If this UI doesn't exist yet, see fallback below.)
2. **Fallback (env-flag method):** unset (empty string) the failing provider's `*_SECRET_KEY` and restart the API. The boot preflight allows zero providers in `LAUNCH_MODE=staging` but **not** in `production`. So in production, you must keep at least one provider configured. Disable only one at a time.
3. Communicate to customers via the homepage banner: "Card payments temporarily unavailable; please use [other provider]."
4. For orders already created with the failing provider that are stuck in `PENDING_PAYMENT`:
   - Wait for the cron to expire them (returns the stock), or
   - Manually transition to `MANUAL_REVIEW` from the admin and resolve via bank transfer / store credit.
5. Open a status-page incident, severity = `partial outage`.
6. Open a support ticket with the provider, include: webhook attempts (provider-side), HTTP response code received, your timestamp range. Reference your account ID.

If **all three** providers fail: trigger full rollback per `ROLLBACK.md` — accepting no payments is preferable to accepting payments you cannot reconcile.

---

## E. Per-provider quick-reference table

| Provider | Live key prefix | Webhook URL | Webhook secret env var | Dashboard URL |
|---|---|---|---|---|
| PayMongo | `sk_live_` / `pk_live_` | `/api/payments/webhook` | `PAYMONGO_WEBHOOK_SECRET` | dashboard.paymongo.com |
| Maya | `pk-live-` / `sk-live-` | `/api/payments/webhook` | `MAYA_WEBHOOK_SECRET` | manage.maya.ph (or Maya Business portal) |
| Xendit | `xnd_production_` | `/api/payments/webhook` | `XENDIT_WEBHOOK_TOKEN` | dashboard.xendit.co |

> **REQUIRES REVIEW:** Confirm exact dashboard URLs against each provider's current documentation before launch day. Vendor URLs occasionally change.
