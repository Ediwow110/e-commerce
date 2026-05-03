# Post Soft-Launch Promotion Board

Tracker for the 24h / 48h / 72h reviews that gate full public production. Run alongside `FULL_PRODUCTION_PROMOTION_CHECKLIST.md`.

---

## 1. Window summary

| Field | Value |
|---|---|
| Soft-launch start | `____________________` |
| Soft-launch end | `____________________` |
| Total orders | `____` |
| Total customers | `____` |
| Total revenue | `____` |
| Total refunds | `____` |
| Rollback events | `____` |
| Pause events | `____` |

---

## 2. T+24h review

| Item | Status | Notes |
|---|---|---|
| Sentry P0 / P1 unresolved | 0 / `____` | |
| Webhook delivery rate | ≥ 99% / `____` | |
| 5xx rate | < 1% / `____` | |
| Stale-cron alerts | 0 / `____` | |
| Payment / order mismatches | 0 / `____` | |
| Stock anomalies | 0 / `____` | |
| Refund issues unresolved | 0 / `____` | |
| Customer support critical issues | 0 / `____` | |
| Reconciliation: provider settlement vs admin orders | match / `____` | |

Decision (T+24): continue / extend / promote / rollback `____________________`

## 3. T+48h review

(same items)

Decision (T+48): continue / extend / promote / rollback `____________________`

## 4. T+72h review

(same items)

Decision (T+72): promote / extend / rollback `____________________`

---

## 5. Reconciliation

| Reconciliation | Status | Notes |
|---|---|---|
| Payment reconciliation (provider vs `Payment` table) | match / `____` | sum of paid / refunded |
| Webhook reconciliation (provider deliveries vs `WebhookEvent` rows) | match / `____` | |
| Stock reconciliation (orders × quantity vs `InventoryMovement`) | match / `____` | |
| Refund reconciliation (admin refunds vs provider refunds) | match / `____` | |

Any mismatch = **NO promotion** until resolved.

---

## 6. Customer / support / legal review

- [ ] All Sentry issues triaged (resolved / snoozed / ticketed)
- [ ] All customer-support emails replied to
- [ ] Zero unresolved customer complaints about money
- [ ] Zero unresolved legal / privacy issues
- [ ] Email deliverability re-checked (mail-tester ≥ 9/10)

---

## 7. Marketing / public-launch readiness

- [ ] Marketing copy reviewed by business owner
- [ ] Landing page CTA points to live storefront
- [ ] Status page exists and is linked
- [ ] Public-launch announcement drafted (email + social)
- [ ] Inventory levels sufficient for projected first-week demand
- [ ] Customer-support staffing for first-week volume confirmed

---

## 8. Promotion rules (hard)

The promotion to public production is **NO-GO** if **any** of these is true:

1. Any unresolved P0 / P1 Sentry issue.
2. Any unreconciled payment mismatch.
3. Any stock anomaly.
4. Any unresolved refund issue.
5. Any critical support issue unresolved.
6. Any monitoring blind spot (a rule from `MONITORING_EXECUTION_PACKET.md` not actually firing).
7. Any of the five external blockers no longer DONE (e.g. cron silently disabled, DNS record removed).
8. Any of the four signers withholds approval.

---

## 9. Signers

All four must sign in writing.

| Role | Name | Signature / approval ref | Date |
|---|---|---|---|
| Business owner | | | |
| Technical owner | | | |
| Support owner | | | |
| Payments owner | | | |

---

## 10. Decision

```
[ ] PROMOTE — public production GO; execute §8 of FULL_PRODUCTION_PROMOTION_CHECKLIST.md
[ ] EXTEND  — extend soft launch by 24h; revisit
[ ] ROLLBACK — see ROLLBACK.md
```

Promotion timestamp: `____________________`
Promotion commit SHA: `____________________`

> File this completed board under `ops/launch-evidence/<YYYY-MM-DD>/POST_SOFT_LAUNCH_PROMOTION_BOARD.signed.pdf`.
