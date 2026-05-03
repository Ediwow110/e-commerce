# First 10 Customers Launch Controller

Operational controller for the controlled soft-launch window. Run only after `SOFT_LAUNCH_DRY_RUN.md` is PASS and `SOFT_LAUNCH_GO_NO_GO.md` is signed.

> This file complements `FIRST_10_CUSTOMERS_RUNBOOK.md` (the runbook). Use this controller to **track the live window**; use the runbook for the cadence.

---

## 1. Window

| Field | Value |
|---|---|
| Start (ISO 8601) | `____________________` |
| End (≥ T+24h, target T+72h) | `____________________` |
| Allowed payment provider | `____________________` |
| Support channel | `____________________` |

## 2. People

| Role | Name | Contact |
|---|---|---|
| Who can invite customers | `____________________` | `____________________` |
| Monitoring owner | `____________________` | `____________________` |
| Payment owner | `____________________` | `____________________` |
| Support owner | `____________________` | `____________________` |
| Technical owner | `____________________` | `____________________` |

## 3. Limits

| Limit | Value |
|---|---|
| Max distinct customers | **10** |
| Max orders per customer | **2** |
| Max orders in window total | **20** |
| Max single-order amount | **PHP 2,000** (or local equivalent) |

When any limit is reached, **pause new invites** and review.

---

## 4. Order-by-order checklist

For **every** order placed during the window, fill one row in `ops/launch-evidence/<date>/orders-log.csv`:

`order_number, customer_id, amount, provider, paid_at, webhook_event_id, stock_before, stock_after, email_sent, sentry_issues, manual_review, ok`

After every order, run this checklist:

- [ ] **Payment status** — admin shows `PAID`
- [ ] **Webhook event** — provider dashboard delivered HTTP 200; `WebhookEvent` row exists with `verified=true`
- [ ] **Order state** — DB `Order.status='PAID'`, `paymentStatus='PAID'`
- [ ] **Stock** — variant stock decremented by exactly `quantity`
- [ ] **Email** — confirmation arrived in customer inbox (not spam) within 5 min
- [ ] **Admin dashboard** — order visible with correct customer + total
- [ ] **Sentry** — no new issues tagged `production` for this request id
- [ ] **Support inbox** — no message from this customer about the order

If **any** check fails → **PAUSE new invites**, file an incident from `SOFT_LAUNCH_INCIDENT_TEMPLATES.md`, fix root cause, re-test internally, then resume.

---

## 5. Pause criteria

PAUSE new invites (existing customers may keep ordering, monitor closely) on any of:

- One after-order check fails
- 5xx rate > 1% in any 15-min window
- Webhook delivery rate < 99% in any hour
- Any new Sentry P1 issue
- Any unresolved `MANUAL_REVIEW` payment > 30 min old
- Any stock anomaly (decrement off by ≥ 1)
- Customer reports a payment / order issue you can't immediately reconcile

## 6. Rollback criteria

ROLLBACK to last known-good SHA (recorded in `SOFT_LAUNCH_GO_NO_GO.md` §10) on any of:

- 5xx rate > 5% sustained 5 min
- Database connection error not auto-resolved in 2 min
- Webhook signature suddenly fails for live provider (possible secret rotation issue)
- Two consecutive after-order checklists FAIL with same root cause
- Any data-integrity issue (over-decremented stock, double-charged customer, refunded but stock not restored per policy)
- Any P0 Sentry issue (uncaught exception in checkout / payment / webhook path)

Use `ROLLBACK.md`. Notify every customer who ordered during the affected window personally.

---

## 7. Customer communication templates

> Substitute `{name}`, `{order}`, `{amount}`, `{eta}`. Always sign with the human support owner's name.

### 7.1 Launch paused

> Hi {name}, we're temporarily pausing new orders while we double-check our checkout. Your existing order #{order} is unaffected; we will contact you within {eta} with a status update. — {support_owner}, {brand}

### 7.2 Payment issue

> Hi {name}, we noticed an issue with the payment on order #{order}. We're investigating with our payment provider and will confirm one of three outcomes within {eta}: (a) your order was successful and we'll proceed to ship, (b) your payment didn't go through and you'll see no charge, or (c) your payment was charged but the order didn't complete and we'll refund within {refund_sla}. — {support_owner}

### 7.3 Order delayed

> Hi {name}, your order #{order} is confirmed, but shipping is running a bit later than usual. New ETA: {eta}. We'll send a tracking link once it's on the way. As an apology, we'd like to offer {gesture}. — {support_owner}

### 7.4 Refund issued

> Hi {name}, we have issued a full refund for order #{order} for {amount}. The refund reference is {ref}. Most banks reflect refunds within 5–10 business days. If you don't see it by {eta}, reply to this email and we'll chase it with the provider. — {support_owner}

---

## 8. Escalation

| Severity | Action | Contact |
|---|---|---|
| P0 (data loss, money loss, site down) | Page primary on-call immediately | `____________________` |
| P0 unresolved 15 min | Page backup on-call + technical owner | `____________________` |
| P1 (degraded, not down) | Slack on-call channel | `____________________` |
| Customer complaint about money | Page business owner | `____________________` |
| Provider outage | Switch to fallback or `manual` per `PAYMENT_LIVE_EXECUTION_PACKET.md` F | `____________________` |

---

## 9. End-of-window decision

At T+24 (and again at T+72 if extending) follow `FIRST_10_CUSTOMERS_RUNBOOK.md` §11. Record the decision and rationale in `ops/launch-evidence/<date>/soft-launch-review.md`.

If decision is "promote" → proceed to `FULL_PRODUCTION_PROMOTION_CHECKLIST.md` and `POST_SOFT_LAUNCH_PROMOTION_BOARD.md`.
