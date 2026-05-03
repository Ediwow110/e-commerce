# Real Payment Test Record

This document records the **first live low-value payment** taken against the production deployment, plus the matching refund test. It is mandatory before opening the storefront to any customer outside the launch team.

> Run this **after** all five rows in `LAUNCH_EVIDENCE_PACKET.md` are ✅ and `SOFT_LAUNCH_GO_NO_GO.md` is ready for sign-off.

> **Do not paste secrets** into this file. Use order numbers, provider reference IDs, webhook event IDs, and timestamps only.

---

## A. Payment test

| Field | Value |
|---|---|
| Date / time (ISO 8601) | `____________________` |
| Tester (real customer email used) | `____________________` |
| Provider (`paymongo` / `maya` / `xendit` / `manual`) | `____________________` |
| Amount | `____________________` |
| Currency | `PHP` (default) / `____________________` |
| Order number (LUXE side) | `____________________` |
| Order ID (DB) | `____________________` |
| Variant ID purchased | `____________________` |
| Quantity | `____________________` |
| Provider checkout URL (truncated) | `____________________` |
| Provider payment / charge reference | `____________________` |
| Webhook event ID (from `webhookEvent.eventId`) | `____________________` |
| Webhook received at | `____________________` |
| Time provider → webhook (s) | `____________________` |

### Expected vs actual

| | Expected | Actual |
|---|---|---|
| Order status | `PAID` | `____________________` |
| Payment status | `PAID` | `____________________` |
| Webhook signature | `verified=true` | `____________________` |
| Stock before (variant) | `____` | `____________________` |
| Stock after (variant) | stock_before − quantity | `____________________` |
| Confirmation email | sent + received | `____________________` |
| Sentry errors during flow | `0` | `____________________` |
| 5xx in platform logs during flow | `0` | `____________________` |
| `MANUAL_REVIEW` triggered? | `no` | `____________________` |

### Safe DB checks

> Read-only. Run from a console with `DATABASE_URL` pointing at production. Do **not** print secrets.

```sql
-- 1. Order summary
SELECT id, "orderNumber", status, "paymentStatus", "totalAmount", "createdAt", "stockRestoredAt"
FROM "Order"
WHERE "orderNumber" = $1;

-- 2. Payment + idempotency
SELECT id, "orderId", provider, status, amount, "providerReference", "createdAt"
FROM "Payment"
WHERE "orderId" = $1;

-- 3. Webhook event was stored exactly once
SELECT "eventId", provider, "eventType", "processedAt"
FROM "WebhookEvent"
WHERE "eventId" = $1;

-- 4. Stock movement matches order
SELECT id, "variantId", type, quantity, note, "createdAt"
FROM "InventoryMovement"
WHERE "variantId" = $1
ORDER BY "createdAt" DESC LIMIT 5;

-- 5. Current stock for the variant
SELECT id, sku, stock FROM "ProductVariant" WHERE id = $1;
```

### Admin UI checks

- [ ] Admin → Orders shows the test order at the top
- [ ] Order detail shows `PAID` and the matching provider reference
- [ ] Admin → Inventory shows the variant stock decremented by exactly `quantity`
- [ ] Admin → Payments shows the row with `verified=true`
- [ ] Admin → Audit log shows the order creation event

### Pass / fail

- [ ] **PASS** — all "Expected" matched "Actual" and all admin checks ticked
- [ ] **FAIL** — see notes

### Notes

```
________________________________________________________________
________________________________________________________________
________________________________________________________________
```

---

## B. Refund test

> Run immediately after Section A passes (so settlement does not complete first).

| Field | Value |
|---|---|
| Date / time (ISO 8601) | `____________________` |
| Admin who issued the refund | `____________________` |
| Admin authenticated with 2FA? | `yes` / `____________________` |
| Refund amount | `____________________` |
| Refund currency | `____________________` |
| Provider refund reference | `____________________` |
| Time admin click → provider confirmation (s) | `____________________` |

### Expected vs actual

| | Expected | Actual |
|---|---|---|
| Order status (per business policy) | `REFUNDED` / `PARTIALLY_REFUNDED` | `____________________` |
| Payment status | `REFUNDED` | `____________________` |
| Refund row in provider dashboard | present | `____________________` |
| Refund-confirmation email sent | yes | `____________________` |
| Stock restoration (per policy) | `restored` / `not restored` | `____________________` |
| Audit log row for the refund | present, includes admin email | `____________________` |
| Sentry errors during flow | `0` | `____________________` |

### Safe DB checks

```sql
-- 1. Refund landed on the payment
SELECT id, status, amount, "providerReference", "updatedAt"
FROM "Payment"
WHERE "orderId" = $1;

-- 2. Audit log entry
SELECT "actorId", action, resource, "createdAt", metadata
FROM "AuditLog"
WHERE resource = '/payments/refund'
  AND metadata::text LIKE '%' || $1 || '%'
ORDER BY "createdAt" DESC LIMIT 5;
```

### Pass / fail

- [ ] **PASS**
- [ ] **FAIL** — see notes

### Notes

```
________________________________________________________________
________________________________________________________________
```

---

## C. Reconciliation

| Field | Value |
|---|---|
| Provider settlement report row matches order amount | `____________________` |
| Provider settlement report row matches refund amount | `____________________` |
| Net effect on settlement = 0 (test was self-cancelling) | `____________________` |
| Bank statement entry expected on date | `____________________` |
| Reconciler initials | `____________________` |

### Notes

```
________________________________________________________________
________________________________________________________________
```

---

## D. Sign-off

| Role | Name | Signature / approval ref | Date |
|---|---|---|---|
| Tester (placed the order) | | | |
| Admin (issued the refund) | | | |
| Technical owner | | | |
| Business owner | | | |

**Decision**

- [ ] Sections A, B, and C all PASS → record is complete; proceed to `SOFT_LAUNCH_GO_NO_GO.md`
- [ ] Any FAIL → halt, file an incident in `RUNBOOK.md`, fix the root cause, then re-run from Section A using a **new** order number

> File this completed record under `ops/launch-evidence/<YYYY-MM-DD>/03-payment-test-record.pdf` and reference its order number from `LAUNCH_EVIDENCE_PACKET.md` row 3.
