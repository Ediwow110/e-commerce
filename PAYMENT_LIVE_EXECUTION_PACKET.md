# Payment Live-Mode Execution Packet

Operational steps to switch from sandbox to live payments. Owner: business owner. Backup: technical owner.

> The codebase already supports PayMongo, Maya, Xendit, and a manual fallback. Only **one** provider needs to be fully live for soft launch. Do not enable a second provider until the first has run a clean low-value payment + refund.

---

## Hard stops (apply to every provider)

The launch is **NO-GO** if **any** of these is true:

1. KYC incomplete on the chosen provider.
2. Live webhook URL not configured on the provider dashboard.
3. Live webhook signing secret missing or weak (< 32 chars).
4. Production preflight fails or warns about sandbox-shaped keys.
5. Refund path is unknown (no admin role with refund permission, or no refund button tested).
6. Monitoring is offline (Sentry / uptime / alerts not live per Blocker 5).
7. No internal low-value test PASSED before any real customer is invited.

---

## Common to all providers — env vars

| Variable | Required value |
|---|---|
| `LAUNCH_MODE` | `production` |
| `PAYMENT_PROVIDER_DEFAULT` | `paymongo` / `maya` / `xendit` / `manual` (your chosen provider; never `mock` in production) |
| `PAYMENT_WEBHOOK_SECRET` | ≥ 32 chars random; rotated from the value the provider gives you |
| `FRONTEND_URL` | https + non-localhost (used for return URLs) |
| `SENTRY_DSN` | set (Blocker 5) |

---

## A. PayMongo

### A.1 KYC

1. PayMongo dashboard → **Settings → Business profile → Submit for verification**.
2. Submit business registration, valid IDs, settlement bank account.
3. Wait for "Live mode enabled" email (typically 1–3 business days).

### A.2 Live keys

1. Dashboard → **Developers → API keys → Live mode**.
2. Copy:
   - `PAYMONGO_PUBLIC_KEY=pk_live_…`
   - `PAYMONGO_SECRET_KEY=sk_live_…`
3. Set in production secret store; never commit.

### A.3 Webhook URL

1. Dashboard → **Developers → Webhooks → Add endpoint**.
2. URL: `https://yourdomain.example.com/api/payments/webhook/paymongo`
3. Subscribe to events: `source.chargeable`, `payment.paid`, `payment.failed`.
4. Copy the **signing secret**; place into `PAYMENT_WEBHOOK_SECRET` (or rotate to your own value and re-paste into PayMongo).

### A.4 Preflight verification

```bash
LAUNCH_MODE=production node -e \
  "import('./backend/dist/preflight.js').then(m=>m.runPreflight()).then(r=>{if(r.ok)process.exit(0);console.error(r);process.exit(1)})" \
  | tee ops/launch-evidence/<YYYY-MM-DD>/03-payment-preflight.log
```

Must exit 0. No `sk_test_` warning.

### A.5 Real low-value payment test

1. Open `REAL_PAYMENT_TEST_RECORD.md` Section A.
2. Place a real order for the smallest possible amount (e.g. PHP 20).
3. Pay with a real card.
4. Fill every Section A field.

### A.6 Webhook confirmation

```bash
# Provider dashboard → Webhooks → recent deliveries: HTTP 200
# DB:
psql "$DATABASE_URL" -c "SELECT \"eventId\",\"eventType\",\"processedAt\" FROM \"WebhookEvent\" ORDER BY \"processedAt\" DESC LIMIT 5;"
```

### A.7 Order / stock / email confirmation

- Admin → Orders → status `PAID`
- Variant stock decremented by exactly `quantity`
- Confirmation email arrived in customer inbox within 5 min

### A.8 Refund test

1. Admin (2FA-authenticated) → order detail → **Refund**.
2. Fill `REAL_PAYMENT_TEST_RECORD.md` Section B.
3. Provider dashboard → refund row visible.

### A.9 Reconciliation

Section C of `REAL_PAYMENT_TEST_RECORD.md`. Net effect = 0 because the test self-cancels.

### A.10 Rollback

Set `PAYMENT_PROVIDER_DEFAULT=manual` (cash on delivery / bank transfer). Customers see manual instructions.

---

## B. Maya

### B.1 KYC

1. Maya Business dashboard → **Settings → Verification**.
2. Submit business documents and bank details. Wait for live-mode approval.

### B.2 Live keys

1. Dashboard → **Developers → Keys → Production**.
2. Copy:
   - `MAYA_PUBLIC_KEY=…`
   - `MAYA_SECRET_KEY=…`

### B.3 Webhook URL

1. Dashboard → **Webhooks → Add**.
2. URL: `https://yourdomain.example.com/api/payments/webhook/maya`
3. Subscribe to: `payment_success`, `payment_failed`, `payment_expired`.
4. Copy callback token / signing secret → `PAYMENT_WEBHOOK_SECRET`.

### B.4 Preflight

Same command as A.4. Must exit 0.

### B.5 – B.10

Same flow as PayMongo (real low-value payment, webhook check, order/stock/email check, refund test, reconciliation). Use the Maya dashboard for refund visibility. Rollback is `manual`.

---

## C. Xendit

### C.1 KYC

1. Xendit dashboard → **Settings → Business verification → Submit**.
2. Wait for live-mode approval.

### C.2 Live keys

1. Dashboard → **Settings → API keys → Live**.
2. Copy `XENDIT_SECRET_KEY=…` (must NOT contain `xnd_development`).

### C.3 Webhook URL

1. Dashboard → **Settings → Callbacks → Webhooks**.
2. URL: `https://yourdomain.example.com/api/payments/webhook/xendit`
3. Subscribe to relevant invoice/payment events.
4. Copy callback token → `PAYMENT_WEBHOOK_SECRET`.

### C.4 Preflight

Same command. Must exit 0; no `xnd_development` warning.

### C.5 – C.10

Same flow. Refund via Xendit dashboard. Rollback is `manual`.

---

## D. Webhook signature gate (verifies any provider)

```bash
# Should reject unsigned with 401
curl -i -X POST https://yourdomain.example.com/api/payments/webhook/<provider> -d '{}'
# Expect HTTP 401 "Invalid payment webhook signature"
```

If this returns 200 or 5xx, halt — the signature gate is broken.

---

## E. Evidence to file

| File | What | Classification |
|---|---|---|
| `03-payment-dashboard.png` | Live mode + webhook URL + secret rotated | PRIVATE ONLY |
| `03-payment-preflight.log` | Preflight exit 0 | SAFE TO COMMIT REDACTED |
| Completed `REAL_PAYMENT_TEST_RECORD.md` | Sections A, B, C signed | COMMIT SUMMARY ONLY |
| `03-payment-refund.png` | Provider refund row + reference | PRIVATE ONLY |

See `EVIDENCE_SECURITY_POLICY.md` for redaction.

---

## F. Rollback to disabled / manual

If the chosen provider fails any of A–E above, **before** real customers are invited:

1. Set `PAYMENT_PROVIDER_DEFAULT=manual` in production env.
2. Restart backend.
3. Verify checkout shows manual-payment instructions only.
4. Document the rollback in `RUNBOOK.md` and pause invites.

If the provider fails **after** real customers are invited, follow `SOFT_LAUNCH_INCIDENT_TEMPLATES.md` → "Provider outage".
