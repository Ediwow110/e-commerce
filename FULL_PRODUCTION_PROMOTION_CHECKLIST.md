# Full Production Promotion Checklist

This checklist promotes the site from **controlled soft launch** to **public production**. Run only after `FIRST_10_CUSTOMERS_RUNBOOK.md` end-of-window review returns "promote".

> The soft launch must have run for **≥ 24 hours, target 72 hours**, with no rollback events.

---

## 1. Soft-launch window verification

| Item | Required | Actual | OK? |
|---|---|---|---|
| Soft-launch elapsed time | ≥ 24 h (target 72 h) | `____________________` | ☐ |
| Number of orders placed | ≥ 5 (≥ 10 preferred) | `____________________` | ☐ |
| Number of distinct customers | ≥ 3 | `____________________` | ☐ |
| Rollback events during window | 0 | `____________________` | ☐ |
| Pause events during window | 0, OR pause resolved cleanly | `____________________` | ☐ |

---

## 2. Stability gates

| Item | Required | Actual | OK? |
|---|---|---|---|
| Unresolved Sentry P0 / P1 issues | 0 | `____________________` | ☐ |
| HTTP 5xx rate over the window | < 1% | `____________________` | ☐ |
| Webhook delivery rate | ≥ 99% | `____________________` | ☐ |
| Stale-cron alerts | 0 | `____________________` | ☐ |
| Uptime monitor downtime | 0 (or scheduled maintenance only) | `____________________` | ☐ |
| Database connection errors | 0 | `____________________` | ☐ |

---

## 3. Data integrity gates

| Item | Required | Actual | OK? |
|---|---|---|---|
| Payment / order mismatches | 0 | `____________________` | ☐ |
| Stock anomalies (over- or under-decrement) | 0 | `____________________` | ☐ |
| Promo redemptions exceeding `usageLimit` | 0 | `____________________` | ☐ |
| Failed webhooks unresolved | 0 | `____________________` | ☐ |
| `MANUAL_REVIEW` payments unresolved | 0 (each resolved to PAID or REFUNDED) | `____________________` | ☐ |
| Orders stuck in `PENDING_PAYMENT` past expiry | 0 | `____________________` | ☐ |
| Refunds processed | reconciled to provider settlement | `____________________` | ☐ |

---

## 4. Customer / support gates

| Item | Required | Actual | OK? |
|---|---|---|---|
| Critical support issues open | 0 | `____________________` | ☐ |
| Customer complaints about money | 0 unresolved | `____________________` | ☐ |
| Email deliverability re-check | mail-tester ≥ 9/10, fresh Gmail OK | `____________________` | ☐ |
| Refund SLA met (provider visible within 5 min) | yes | `____________________` | ☐ |

---

## 5. Operations gates

| Item | Required | Actual | OK? |
|---|---|---|---|
| All `LAUNCH_EVIDENCE_PACKET.md` items still ✅ | yes | `____________________` | ☐ |
| All env vars unchanged from soft-launch values | yes | `____________________` | ☐ |
| Daily DB backup ran every day of the window | yes | `____________________` | ☐ |
| On-call rotation confirmed for first public week | yes | `____________________` | ☐ |
| Capacity headroom: CPU < 60%, DB connections < 60% peak | yes | `____________________` | ☐ |

---

## 6. Approvals required to promote

| Role | Name | Signature / approval ref | Date / time |
|---|---|---|---|
| Technical owner | | | |
| Business owner | | | |
| Support owner | | | |
| Security / on-call | | | |

All four must approve in writing. Any single hold = no promotion.

---

## 7. Promotion decision table

| Condition | Decision |
|---|---|
| Any item in §1–§5 unchecked | **NO-GO** — extend soft launch by another 24 h or remediate |
| Any approver in §6 holds | **NO-GO** |
| Any open P0 / P1 Sentry issue | **NO-GO** |
| Any unresolved `MANUAL_REVIEW` payment | **NO-GO** |
| Any payment / settlement mismatch | **NO-GO** |
| Any rollback event during the window | **NO-GO** — restart soft launch from T=0 after fix |
| **All §1–§5 ✅ AND all four approvers signed** | **GO** for full public production |

---

## 8. Promotion execution

When the table returns GO:

1. [ ] Announce window start (Slack + status page).
2. [ ] Take a fresh DB snapshot.
3. [ ] Confirm CI on the *currently running* commit is green.
4. [ ] Lift the invite-only restriction (e.g. remove storefront geofence, publish marketing link).
5. [ ] Send the launch announcement (email / social).
6. [ ] Page the on-call to confirm receipt.
7. [ ] Watch monitoring dashboards continuously for the first hour.

Record the promotion in `ops/launch-evidence/<date>/PROMOTION_RECORD.md` with the timestamp and the commit SHA.

---

## 9. Rollback plan if issues appear after public launch

| Severity | Action | Time budget |
|---|---|---|
| P0 — site down, money loss, data loss | Roll back to last green commit (`ROLLBACK.md`); switch payment provider to `manual` if payments are the cause | < 15 min |
| P1 — degraded but functional | Patch forward if confident; otherwise roll back | < 1 hour |
| P2 — cosmetic | Forward fix during the next deploy window | next-day |

For each rollback or pause, notify customers who placed an affected order personally with a refund or apology credit.

Always preserve the failing commit's logs and Sentry events for post-mortem before rolling forward again.

---

## 10. Post-promotion monitoring cadence

| Window | Cadence | Action |
|---|---|---|
| T_promo → T+1 h | Continuous, engineer at the keyboard | Watch Sentry / 5xx / webhooks / support inbox |
| T+1 h → T+8 h | Hourly | Hourly checks from `FIRST_10_CUSTOMERS_RUNBOOK.md` §6 |
| T+8 h → T+24 h | Every 2 hours | Hourly checks (condensed) |
| T+24 h → T+7 days | Twice daily + on-call always reachable | Daily reconciliation, Sentry triage, support triage |
| T+7 days → ongoing | Daily reconciliation, weekly review | Per `POST_LAUNCH_24H_WATCHLIST.md` then steady-state monitoring |

Steady state begins after 7 clean public-production days.

---

## 11. Notes / deviations

```
________________________________________________________________
________________________________________________________________
________________________________________________________________
```

> File this completed checklist under `ops/launch-evidence/<YYYY-MM-DD>/FULL_PRODUCTION_PROMOTION_CHECKLIST.signed.pdf`.
