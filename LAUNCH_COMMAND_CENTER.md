# Launch Command Center

Single index for the LUXE Commerce launch. Start here.

---

## Status snapshot (update on every change)

| Field | Value |
|---|---|
| Latest commit on `main` | `c92860b` (will move; check `git log -1 main`) |
| CI status | ✅ green (CI + Secret scan) |
| Test count | 74 passing |
| Code & infra readiness | 9.5 / 10 |
| Whole-system readiness | 6 / 10 |
| Code blockers | 0 |
| External blockers remaining | **5 of 5** still TODO |
| Soft-launch decision | ⛔ **NO-GO** |
| Full-production decision | ⛔ **NO-GO** |
| Last reviewed | `____________________` |

---

## Next single action

**Send the four legal-page URLs (`/terms`, `/privacy`, `/refunds`, `/shipping`) plus the business-information packet to your lawyer for review.** Legal review has the longest external lead time. In parallel, file payment KYC and have the DNS owner add SPF/DKIM/DMARC records.

Then work the playbook in `LAUNCH_EXECUTION_PLAN.md`.

---

## All launch docs (the index)

### 0. Start here
- [`LAUNCH_COMMAND_CENTER.md`](./LAUNCH_COMMAND_CENTER.md) — this file
- [`LAUNCH_EXECUTION_PLAN.md`](./LAUNCH_EXECUTION_PLAN.md) — operator playbook for the 5 blockers

### 1. Tracking
- [`EXTERNAL_BLOCKER_TASK_BOARD.md`](./EXTERNAL_BLOCKER_TASK_BOARD.md) — owner / status / due date for all 5 blockers
- [`EXTERNAL_BLOCKERS.md`](./EXTERNAL_BLOCKERS.md) — original blocker list
- [`FINAL_EXTERNAL_LAUNCH_TRACKER.md`](./FINAL_EXTERNAL_LAUNCH_TRACKER.md) — per-blocker tracker

### 2. Per-blocker execution packets
- [`LEGAL_LAUNCH_PACKET.md`](./LEGAL_LAUNCH_PACKET.md) — Blocker 1
- [`EMAIL_DNS_EXECUTION_PACKET.md`](./EMAIL_DNS_EXECUTION_PACKET.md) — Blocker 2
- [`PAYMENT_LIVE_EXECUTION_PACKET.md`](./PAYMENT_LIVE_EXECUTION_PACKET.md) — Blocker 3
- [`PAYMENT_LIVE_MODE_CHECKLIST.md`](./PAYMENT_LIVE_MODE_CHECKLIST.md) — original payment checklist
- [`CRON_EXECUTION_PACKET.md`](./CRON_EXECUTION_PACKET.md) — Blocker 4
- [`MONITORING_EXECUTION_PACKET.md`](./MONITORING_EXECUTION_PACKET.md) — Blocker 5
- [`MONITORING_ALERTS_CHECKLIST.md`](./MONITORING_ALERTS_CHECKLIST.md) — original alert matrix

### 3. Evidence handling
- [`EVIDENCE_SECURITY_POLICY.md`](./EVIDENCE_SECURITY_POLICY.md) — what may / must not be committed; redaction rules; classifications
- [`SANITIZED_LAUNCH_EVIDENCE_INDEX.md`](./SANITIZED_LAUNCH_EVIDENCE_INDEX.md) — fill this for every cycle
- [`LAUNCH_EVIDENCE_PACKET.md`](./LAUNCH_EVIDENCE_PACKET.md) — per-blocker evidence spec

### 4. Dry run + sign-off
- [`SOFT_LAUNCH_DRY_RUN.md`](./SOFT_LAUNCH_DRY_RUN.md) — full rehearsal before any real customer
- [`REAL_PAYMENT_TEST_RECORD.md`](./REAL_PAYMENT_TEST_RECORD.md) — fill during the dry run
- [`SOFT_LAUNCH_GO_NO_GO.md`](./SOFT_LAUNCH_GO_NO_GO.md) — gate sheet for the soft launch
- [`SOFT_LAUNCH_CHECKLIST.md`](./SOFT_LAUNCH_CHECKLIST.md) — original soft-launch checklist

### 5. Live operations
- [`FIRST_10_CUSTOMERS_RUNBOOK.md`](./FIRST_10_CUSTOMERS_RUNBOOK.md) — runbook & cadence
- [`FIRST_10_CUSTOMERS_LAUNCH_CONTROLLER.md`](./FIRST_10_CUSTOMERS_LAUNCH_CONTROLLER.md) — live tracker, customer comms
- [`SOFT_LAUNCH_INCIDENT_TEMPLATES.md`](./SOFT_LAUNCH_INCIDENT_TEMPLATES.md) — copy-paste incident templates
- [`LAUNCH_DAY_RUNBOOK.md`](./LAUNCH_DAY_RUNBOOK.md) — original day-of runbook
- [`POST_LAUNCH_24H_WATCHLIST.md`](./POST_LAUNCH_24H_WATCHLIST.md) — 24h watchlist
- [`RUNBOOK.md`](./RUNBOOK.md) — general operational runbook

### 6. Promotion to public
- [`POST_SOFT_LAUNCH_PROMOTION_BOARD.md`](./POST_SOFT_LAUNCH_PROMOTION_BOARD.md) — 24/48/72h reviews
- [`FULL_PRODUCTION_PROMOTION_CHECKLIST.md`](./FULL_PRODUCTION_PROMOTION_CHECKLIST.md) — final promotion gate

### 7. Reference
- [`ENV_PRODUCTION_CHECKLIST.md`](./ENV_PRODUCTION_CHECKLIST.md) — production env vars
- [`PRODUCTION_HARDENING.md`](./PRODUCTION_HARDENING.md) — security hardening
- [`EMAIL_DELIVERABILITY.md`](./EMAIL_DELIVERABILITY.md) — original DNS notes
- [`JOBS.md`](./JOBS.md) — cron platform recipes
- [`BACKUPS.md`](./BACKUPS.md) — DB backup + restore
- [`ROLLBACK.md`](./ROLLBACK.md) — rollback procedure

---

## Hard-stop rules (single source of truth)

The launch is **NO-GO** if **any** of these is true:

1. Any external blocker incomplete.
2. Live webhook not tested with a real signed event.
3. Refund test not performed AND not formally deferred by business owner.
4. `expire-orders` cron not scheduled, or last run > 15 min ago.
5. `SENTRY_DSN` unset OR uptime monitor not active.
6. Any legal page still shows `REQUIRES LEGAL REVIEW`.
7. `ENFORCE_ADMIN_2FA != true`.
8. CI not green on the deploying commit.
9. Secret scan or dependency audit failing.
10. `PAYMENT_PROVIDER_DEFAULT=mock` OR any payment key is sandbox.
11. `MAIL_PROVIDER=mock` OR DNS not verified.
12. No on-call engineer for the first week.
13. No tested rollback path.
14. Sanitized evidence index not signed by all four reviewers.

---

## Owners

| Role | Name | Contact |
|---|---|---|
| Business owner | `____________________` | `____________________` |
| Technical owner | `____________________` | `____________________` |
| Support owner | `____________________` | `____________________` |
| Security / on-call | `____________________` | `____________________` |
| DNS owner | `____________________` | `____________________` |
| Platform / DevOps owner | `____________________` | `____________________` |
| Payments owner | `____________________` | `____________________` |

---

## Emergency rollback (one-page)

If the site is down, money is being lost, or data is being corrupted:

1. **PAGE PRIMARY ON-CALL** (above).
2. Identify last known-good deploy SHA: `git log --oneline -10 main` or your platform's deploy history.
3. Re-deploy that SHA: follow `ROLLBACK.md`.
4. If payments are the cause: set `PAYMENT_PROVIDER_DEFAULT=manual` in production env; restart backend.
5. If DB is the cause: see `BACKUPS.md`.
6. Once stable, post an incident from `SOFT_LAUNCH_INCIDENT_TEMPLATES.md`.
7. Notify every customer who placed an affected order personally (template 7.1, 7.2, or 7.4 from `FIRST_10_CUSTOMERS_LAUNCH_CONTROLLER.md`).
8. Postmortem within 72 h.
