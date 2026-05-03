# Soft-Launch Incident Templates

Copy-paste templates for the most likely incidents during the first-10-customers window. Every template has the same structure so the on-call can fill it in fast.

> File every incident under `ops/launch-evidence/<date>/incidents/INC-NNN.md`. Severity drives pager + customer comms.

---

## Severity legend

| Sev | Meaning | Page on-call? | Pause invites? | Rollback? |
|---|---|---|---|---|
| P0 | Data loss, money loss, site down | Immediately | Yes | Likely |
| P1 | Degraded but functional | Yes | Yes | Maybe |
| P2 | Cosmetic / single-customer | Slack | No | No |

---

## 1. Payment webhook failed

| | |
|---|---|
| **Severity** | P1 |
| **Customer impact** | Order may show `PENDING_PAYMENT` despite real payment |
| **Immediate action** | (1) Check provider dashboard → recent deliveries; (2) re-send the failed event; (3) confirm `WebhookEvent` row landed |
| **Rollback / pause criteria** | Pause new invites if 2+ webhook failures in 15 min; rollback if signature gate suddenly fails for valid events |
| **Owner** | technical + payments |
| **Customer message** | Template 7.2 from `FIRST_10_CUSTOMERS_LAUNCH_CONTROLLER.md` |
| **Internal notes** | provider event id, our request id, signature verification result |
| **Postmortem** | root cause, time to detect, time to mitigate, time to resolve, action items |

## 2. Payment succeeded but order not paid

| | |
|---|---|
| **Severity** | P0 (customer is charged, no order fulfilment) |
| **Customer impact** | Customer charged, no order created or order stuck PENDING |
| **Immediate action** | (1) Confirm provider charge id; (2) check `Payment` + `WebhookEvent` rows; (3) if webhook never arrived, re-deliver from provider dashboard; (4) if order is missing, manually mark PAID and ship OR refund within 1 h |
| **Rollback / pause criteria** | Pause invites immediately; do not rollback if isolated; rollback if pattern repeats |
| **Owner** | payments + technical + business |
| **Customer message** | Template 7.2 then either fulfil or 7.4 (refund) |
| **Internal notes** | provider charge id, customer email (do not commit), order id (if any), action taken |
| **Postmortem** | required (money mismatch always gets a postmortem) |

## 3. Order paid but stock wrong

| | |
|---|---|
| **Severity** | P1 |
| **Customer impact** | Stock count wrong; subsequent customer may be over- or under-served |
| **Immediate action** | Reconcile `InventoryMovement` rows for the variant; run `node backend/scripts/reconcile-stock.ts` if available; manually adjust with audit-log note |
| **Rollback / pause criteria** | Pause if pattern (≥ 2 orders) |
| **Owner** | technical |
| **Customer message** | Usually none required |
| **Internal notes** | order id, variant id, expected vs actual delta |
| **Postmortem** | yes |

## 4. Stock oversold (sold more than available)

| | |
|---|---|
| **Severity** | P0 |
| **Customer impact** | Customer paid for an item we cannot ship |
| **Immediate action** | (1) Identify all affected orders; (2) refund the late ones with apology + gesture; (3) reconcile stock in admin with audit note; (4) investigate why concurrency control failed |
| **Rollback / pause criteria** | Pause invites immediately |
| **Owner** | business + technical |
| **Customer message** | Template 7.4 (refund) + manual apology |
| **Internal notes** | variant id, list of affected orders, prioritisation rule |
| **Postmortem** | required |

## 5. Customer charged twice

| | |
|---|---|
| **Severity** | P0 |
| **Customer impact** | Double charge |
| **Immediate action** | (1) Refund the duplicate within 30 min; (2) confirm with provider that only one settles; (3) email customer with refund reference (template 7.4) |
| **Rollback / pause criteria** | Pause if pattern; investigate idempotency keys + double-submit guard |
| **Owner** | payments + technical |
| **Customer message** | Template 7.4 |
| **Internal notes** | both charge ids, refund id |
| **Postmortem** | required |

## 6. Refund failed

| | |
|---|---|
| **Severity** | P1 |
| **Customer impact** | Customer expects refund but it didn't process |
| **Immediate action** | (1) Check provider dashboard for refund row; (2) retry from provider directly if available; (3) escalate to provider support if blocked; (4) inform customer with new ETA |
| **Rollback / pause criteria** | Pause if affecting > 1 customer in window |
| **Owner** | payments |
| **Customer message** | "Refund delayed; new ETA {eta}; reference {ref}" |
| **Internal notes** | original payment id, attempted refund id, provider response |
| **Postmortem** | yes |

## 7. Email not sent

| | |
|---|---|
| **Severity** | P2 (P1 if it affects payment confirmations or 2FA) |
| **Customer impact** | Customer doesn't see confirmation; may panic |
| **Immediate action** | (1) Check provider dashboard for the message; (2) re-send manually; (3) if all messages failing, treat as P1 — likely DNS or provider outage |
| **Rollback / pause criteria** | Pause if 2+ failures in 30 min |
| **Owner** | platform |
| **Customer message** | Resend the original email manually |
| **Internal notes** | provider message id (or absence) |
| **Postmortem** | only if pattern |

## 8. Admin locked out

| | |
|---|---|
| **Severity** | P1 (loss of admin access during launch) |
| **Customer impact** | None directly; blocks our refund / triage capacity |
| **Immediate action** | Use 2FA backup codes from `SOFT_LAUNCH_GO_NO_GO.md` §9; if exhausted, see template 9 |
| **Rollback / pause criteria** | Pause refunds-by-admin until restored |
| **Owner** | security + technical |
| **Customer message** | None |
| **Internal notes** | admin id, lock reason |
| **Postmortem** | only if not user error |

## 9. 2FA recovery needed

| | |
|---|---|
| **Severity** | P1 |
| **Customer impact** | None directly |
| **Immediate action** | (1) Verify identity of locked-out admin out-of-band; (2) reset 2FA via DB-side script (documented in `RUNBOOK.md`); (3) require re-enrollment + new backup codes; (4) audit-log the recovery |
| **Rollback / pause criteria** | None |
| **Owner** | security |
| **Customer message** | None |
| **Internal notes** | admin id, who authorised recovery, audit-log id |
| **Postmortem** | yes — verify no compromise |

## 10. Cron not running

| | |
|---|---|
| **Severity** | P1 |
| **Customer impact** | Abandoned carts hold stock; risk of oversell |
| **Immediate action** | (1) Check scheduler dashboard; (2) re-trigger manually `node backend/scripts/expire-orders.ts`; (3) if scheduler down, run from a workstation every 5 min until restored |
| **Rollback / pause criteria** | Pause invites if cron silent > 30 min |
| **Owner** | platform |
| **Customer message** | None |
| **Internal notes** | scheduler error, workaround in use |
| **Postmortem** | yes |

## 11. High 5xx rate

| | |
|---|---|
| **Severity** | P0 if > 5%; P1 if 1–5% |
| **Customer impact** | Checkout may fail mid-flow |
| **Immediate action** | (1) Sentry top issue → identify cause; (2) scale or restart; (3) rollback if rate doesn't drop in 5 min |
| **Rollback / pause criteria** | Rollback at > 5% sustained 5 min |
| **Owner** | platform + technical |
| **Customer message** | Template 7.1 if pause |
| **Internal notes** | top issue, error rate over time |
| **Postmortem** | required |

## 12. Database connection failure

| | |
|---|---|
| **Severity** | P0 |
| **Customer impact** | Site down |
| **Immediate action** | (1) Check DB host status; (2) failover if HA available; (3) restore last snapshot if corruption suspected (`BACKUPS.md`); (4) all-hands |
| **Rollback / pause criteria** | Pause invites; rollback only if deploy caused it |
| **Owner** | platform |
| **Customer message** | Status-page update; template 7.1 |
| **Internal notes** | DB error, time series, mitigation |
| **Postmortem** | required |

## 13. Provider outage

| | |
|---|---|
| **Severity** | P1 (P0 if no fallback configured) |
| **Customer impact** | Cannot accept payments via that provider |
| **Immediate action** | (1) Confirm via provider status page; (2) switch `PAYMENT_PROVIDER_DEFAULT` to fallback or `manual`; (3) restart backend; (4) post status notice |
| **Rollback / pause criteria** | Pause invites if no fallback works |
| **Owner** | payments + technical |
| **Customer message** | Status notice; template 7.2 to in-flight customers |
| **Internal notes** | provider, start/end of outage, lost-order count |
| **Postmortem** | yes |

## 14. Privacy / legal issue

| | |
|---|---|
| **Severity** | P0 |
| **Customer impact** | Possible regulatory / customer-trust issue |
| **Immediate action** | (1) Stop the bleeding (disable feature, revoke access); (2) preserve evidence; (3) notify business owner + lawyer; (4) prepare regulator notice if jurisdiction requires |
| **Rollback / pause criteria** | Pause launch entirely |
| **Owner** | business + security + legal |
| **Customer message** | Lawyer-approved only |
| **Internal notes** | nature of issue, scope, affected users count |
| **Postmortem** | required + external-facing summary if regulator-notifiable |
