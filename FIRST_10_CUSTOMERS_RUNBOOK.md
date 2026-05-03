# First 10 Customers Runbook

This runbook governs the **controlled soft launch** — real money, real customers, but the audience is small enough that any unforeseen bug affects ≤ 10 people. Run only after `SOFT_LAUNCH_GO_NO_GO.md` returns **GO**.

---

## 1. Launch window

| Field | Value |
|---|---|
| Soft-launch start (ISO 8601) | `____________________` |
| Soft-launch end (≥ T+24h, target T+72h) | `____________________` |
| On-call engineer (primary) | `____________________` |
| On-call engineer (backup) | `____________________` |
| Business owner reachable until | `____________________` |
| Support inbox monitored by | `____________________` |

> Do **not** open the storefront publicly during this window. Public launch is gated by `FULL_PRODUCTION_PROMOTION_CHECKLIST.md`.

---

## 2. Audience

- Up to **10 customers**, hand-invited (friends, employees, beta testers).
- Each customer is told this is a real-money launch test and given the support email up front.
- Cap at 10 distinct customer accounts, then close invites.

### Order limits

| Limit | Value |
|---|---|
| Max orders per customer | 2 |
| Max total orders during the window | 20 |
| Max single-order amount | ≤ PHP 2,000 (or local equivalent) |

If any limit is reached, **pause** new invites and review.

---

## 3. Configuration in effect

| Item | Required value |
|---|---|
| `LAUNCH_MODE` | `production` |
| `PAYMENT_PROVIDER_DEFAULT` | the live provider chosen in Blocker 3 |
| `MAIL_PROVIDER` | the live provider chosen in Blocker 2 |
| `ENFORCE_ADMIN_2FA` | `true` |
| `expire-orders` cron | every 5 min, advisory-lock-protected |
| `SENTRY_DSN` | set, test event received |
| Uptime monitors | `/health` 1-min, `/ready` 5-min |

---

## 4. After every order — operator checklist

Run this for **each** order placed during the window. Log the result in `ops/launch-evidence/<date>/orders-log.csv`.

- [ ] **Webhook check** — provider dashboard shows event delivered, HTTP 200
  - DB: `SELECT "eventId","processedAt" FROM "WebhookEvent" WHERE "eventId" = $1;`
- [ ] **Order state check** — admin shows `PAID`
  - DB: `SELECT id,"orderNumber",status,"paymentStatus" FROM "Order" WHERE "orderNumber" = $1;`
- [ ] **Payment idempotency check** — exactly one `Payment` row, exactly one `WebhookEvent` row
- [ ] **Stock reconciliation** — variant stock decremented by exactly `quantity`
  - DB: `SELECT stock FROM "ProductVariant" WHERE id = $1;`
- [ ] **Email delivery** — confirmation arrived in customer inbox (not spam) within 5 min
- [ ] **Sentry check** — no new issue tagged `production` from this order's request id
- [ ] **No `MANUAL_REVIEW` payment** created
- [ ] **Provider settlement preview** — amount matches order total (check at end of day)

If any check fails → **PAUSE** new invites, file an incident from `RUNBOOK.md`, fix root cause, re-test.

---

## 5. Monitoring cadence

| Window | Cadence | Watch |
|---|---|---|
| First 1 hour | Continuous (engineer at the keyboard) | Sentry inbox, 5xx rate, webhook dashboard, support inbox |
| After every order | Section 4 checklist | as above |
| T+1 → T+8 | Hourly | Section 6 hourly checks |
| T+8 → T+24 | Every 2 hours | Section 6 hourly checks (condensed) |
| T+24 → T+72 (recommended) | Twice daily | Section 6 + Section 7 daily |

---

## 6. Hourly checks (T+1 → T+24)

- [ ] HTTP 5xx rate < 1% over the last hour
- [ ] Webhook delivery rate ≥ 99% over the last hour
- [ ] No new Sentry P0 / P1 issues
- [ ] No failed admin login spike
- [ ] `cron.expire-orders complete` log line within last 10 min
- [ ] Uptime monitors still green
- [ ] Support inbox: any unread customer message?

Record the result in the orders log.

---

## 7. End-of-day-1 checks

- [ ] Total orders in admin matches platform count
- [ ] Stock movements match orders × quantities
- [ ] Promo redemptions never exceeded `usageLimit`
- [ ] Provider settlement preview reconciles to admin order totals
- [ ] Spot-check one Gmail account: confirmation email present, not in spam
- [ ] Admin 2FA still working for at least two admins (no lockouts)
- [ ] Daily DB backup ran successfully

---

## 8. Pause criteria

**PAUSE new invites** (existing customers can keep ordering, monitor closely) if any one of:

- One operator checklist (Section 4) failed
- 5xx rate > 1% in any 15-min window
- Webhook delivery rate < 99% in any hour
- Any new Sentry P1 issue
- Any unresolved `MANUAL_REVIEW` payment older than 30 min
- Any stock anomaly (decrement off by ≥ 1)

After pause: investigate, fix, run a fresh internal payment test to confirm, then resume.

---

## 9. Rollback criteria

**ROLLBACK** to the last known-good deploy SHA (recorded in `SOFT_LAUNCH_GO_NO_GO.md` §10) if any one of:

- 5xx rate > 5% sustained for 5 min
- Database connection error alert fires and does not auto-resolve in 2 min
- Webhook signature verification suddenly returns false for the live provider (possible secret rotation problem)
- Two consecutive operator checklists FAIL with the same root cause
- Any data-integrity issue (over-decremented stock, double-charged customer, refunded but stock not restored per policy)
- Any P0 Sentry issue (uncaught exception in checkout / payment / webhook path)

Use the rollback procedure in `ROLLBACK.md`. Notify all customers who placed orders during the affected window personally.

---

## 10. Escalation

| Severity | Action | Contact |
|---|---|---|
| P0 (data loss, money loss, site down) | Page primary on-call immediately | `____________________` |
| P0 unresolved in 15 min | Page backup on-call + technical owner | `____________________` |
| P1 (degraded, not down) | Slack the on-call channel | `____________________` |
| Customer complaint about money | Page business owner | `____________________` |
| Provider outage | Switch to fallback provider OR `manual` per `RUNBOOK.md` | `____________________` |

---

## 11. End-of-window review

At T+24 (and again at T+72 if extending):

- [ ] All Section 4 checklists complete and filed
- [ ] All hourly checks complete and filed
- [ ] All Sentry issues triaged (resolved / snoozed / ticketed)
- [ ] All customer-support emails replied to
- [ ] Provider settlement preview reconciled to admin
- [ ] Net stock and revenue numbers documented
- [ ] Decision: extend soft launch / promote to public / rollback

Record the decision and rationale in `ops/launch-evidence/<date>/soft-launch-review.md`, then proceed to `FULL_PRODUCTION_PROMOTION_CHECKLIST.md` if the call is to promote.
