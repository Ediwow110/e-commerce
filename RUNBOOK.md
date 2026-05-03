# Runbook

Quick reference for on-call. Each entry: **symptom → triage → action → escalate**.

> Replace `support@yourdomain.com` with your real `SUPPORT_EMAIL`.

---

## 1. Payment webhook failing

**Symptom**
Alert: "WEBHOOK_SIGNATURE_INVALID >5 in 10 min" or PayMongo / Maya / Xendit
dashboard shows red on recent deliveries.

**Triage**
1. Open provider dashboard → recent webhook attempts → response code & body.
2. Search logs for `verifyProviderWebhookSignature` errors.
3. Confirm `PAYMENT_WEBHOOK_SECRET` (or `XENDIT_CALLBACK_TOKEN` /
   `MAYA_WEBHOOK_AUTH`) on the dashboard MATCHES the env var on the running
   backend.

**Action**
- If secret rotated on dashboard but not in env → update env, redeploy.
- If secret rotated in env but not on dashboard → update dashboard.
- For PayMongo, check that the signed timestamp is within 5 min of server
  clock (NTP drift = invalid sig).
- Replay missed webhooks from the dashboard once the verifier is fixed; the
  app's `WebhookEvent` unique index makes this safe (duplicates are no-ops).

**Escalate**
After 30 min unresolved, contact the provider support and pause new orders
(set `PAYMENT_PROVIDER_DEFAULT=manual` and redeploy).

---

## 2. Orders stuck in PENDING_PAYMENT

**Symptom**
Customer service tickets: "I paid but my order still says pending."

**Triage**
1. Confirm the cron `expire:orders` is running — check log aggregator for
   `expire-orders completed` within the last 2 minutes.
2. For the specific order, find the matching `WebhookEvent` row (by
   `provider` + reference). If absent, the webhook never arrived.
3. Check the provider dashboard's webhook delivery status for that payment.

**Action**
- If the webhook never arrived → check Runbook 1.
- If the webhook arrived but the app rejected it → look at the audit log on
  the order; common causes are `PAYMENT_AMOUNT_MISMATCH`,
  `PAYMENT_CURRENCY_MISMATCH`. Use Runbook 3.
- If the order is past `paymentExpiresAt`, the cron will move it to EXPIRED
  on next run; if the customer paid late, the late-payment guard will move
  it to `MANUAL_REVIEW` instead — see Runbook 3.

---

## 3. Payment marked MANUAL_REVIEW

**Symptom**
Audit log `PAYMENT_LATE_REVIEW`, `PAYMENT_AMOUNT_MISMATCH`, or
`PAYMENT_CURRENCY_MISMATCH` fired. Admin "Orders → Manual review" tab has
new entries.

**Triage**
1. Open the admin order page; confirm the discrepancy.
2. Cross-check against the provider dashboard for the actual settled amount
   and currency.

**Action**
- **Amount mismatch (provider lower):** customer underpaid. Decide: ask for
  the difference, or refund and cancel.
- **Amount mismatch (provider higher):** likely double-charged. Refund the
  difference via provider, then mark order as PAID manually.
- **Currency mismatch:** almost always a config bug. Refund full, fix
  product currency, ask the customer to re-order.
- **Late payment (order EXPIRED, customer paid):** if stock is still
  available → restore the order to PAID and ship it; if not → refund.

Document the resolution in the audit log.

**Escalate**
Recurring mismatches usually mean a misconfigured price feed or currency in
products — escalate to engineering.

---

## 4. Stock mismatch detected

**Symptom**
Audit log `STOCK_NEGATIVE_BLOCKED` (someone tried to oversell), or admin
notices physical inventory ≠ system stock.

**Triage**
1. Sum `InventoryMovement` for the variant since the last reconciliation.
2. Compare with current `productVariant.stock`.

**Action**
- Issue a manual `InventoryMovement` of type `ADJUSTMENT` (positive or
  negative) with a clear note explaining the source of the delta.
- Do NOT directly UPDATE the stock column — always go through inventory
  movements so the audit trail stays intact.

---

## 5. Admin locked out

**Symptom**
Admin reports "Account temporarily locked due to repeated failed sign-ins".

**Triage**
1. Look at recent `LOGIN_FAILED` audit logs for that account — confirm it's
   not an attack from another IP.
2. If multiple unfamiliar IPs → likely brute-force; do NOT just unlock,
   rotate the admin's password too.

**Action**
A super-admin runs:

```sql
UPDATE "User"
SET "failedLoginCount" = 0, "lockedUntil" = NULL
WHERE email = 'admin@yourdomain.com';
```

Then ask the admin to log in. If the lock keeps recurring, see Runbook 6.

---

## 6. 2FA recovery (admin lost their authenticator)

**Symptom**
Admin: "I lost my phone, I can't log in."

**Triage**
1. Verify the admin's identity by an out-of-band channel (video call, known
   phone number). DO NOT just trust the email.

**Action**
The admin should first try an unused backup code from their saved list.

If they have no backup codes left, a super-admin must:

```sql
-- Disable 2FA on the locked-out admin
UPDATE "User"
SET "twoFactorEnabled" = false,
    "twoFactorSecret" = NULL,
    "twoFactorEnrolledAt" = NULL
WHERE email = 'admin@yourdomain.com';

DELETE FROM "TwoFactorBackupCode" WHERE "userId" = (
  SELECT id FROM "User" WHERE email = 'admin@yourdomain.com'
);
```

The next login will succeed without 2FA. They MUST re-enrol immediately —
preflight enforces 2FA in production.

Log the override in your incident channel.

---

## 7. Database migration failed

**Symptom**
Deploy halted at `prisma migrate deploy`.

**Triage**
1. Read the Prisma error — it tells you the migration file and the SQL line.
2. Most failures are: column already exists / FK violation / wrong default.

**Action**
- **DO NOT** edit a migration file that has already been applied to any other
  environment. Create a NEW additive migration that fixes the issue.
- If the failed migration is the LATEST one and ran nowhere else:
  ```
  npx prisma migrate resolve --rolled-back <migration_name>
  ```
  …then fix the migration file and `prisma migrate deploy` again.
- If the migration partially applied, you may need to manually undo the
  partial side-effects (DROP COLUMN, etc.) before re-running.

**Escalate**
If you've never recovered from a Prisma migration failure before, page the
engineer who knows Prisma before doing anything destructive in production.

---

## 8. Rollback after bad deploy

See `ROLLBACK.md` — the full procedure with caveats.

---

## 9. Provider outage

**Symptom**
PayMongo / Maya / Xendit status page shows incident; checkout fails for many
customers.

**Triage**
1. Confirm against provider's status page (linked in MONITORING.md).
2. Check Sentry for our own checkout errors — distinguish "their outage"
   from "our integration broke at the same time".

**Action**
1. Switch `PAYMENT_PROVIDER_DEFAULT` to a working alternate provider OR set
   to `manual` with bank-transfer instructions.
2. Redeploy backend.
3. Post a banner on the storefront: "Card payments are temporarily
   unavailable; please use bank transfer or try again in 30 minutes."
4. When the provider recovers, switch back and remove the banner.

Refund expectations: if the customer's bank shows the charge but the
provider hasn't settled it yet, ask them to wait — it usually clears within
24h. Otherwise refund manually.

---

## 10. Email delivery failure

**Symptom**
Customer: "I never got my order confirmation."

**Triage**
1. Check the mail provider dashboard for the recipient address — bounced?
   delivered? in spam folder?
2. Check our logs for `mail_sent` matching the order ID.

**Action**
- If `mail_sent` not present → check `mail.service` for an exception around
  that order's creation time.
- If `mail_sent` present but provider says "bounced" → the address is bad;
  contact the customer through another channel.
- If `mail_sent` present and provider says "delivered" → it's in spam. Check
  `EMAIL_DELIVERABILITY.md` SPF/DKIM/DMARC checks.

**Escalate**
If bounce rate >2% or spam-folder rate >10%, your sending reputation is
tanking. Audit DKIM, content (no shouty subject lines, no all-image bodies),
and consider warming a new IP via the provider.
