# Soft-Launch GO / NO-GO Sheet

**Reference commit:** `____________________` (must equal latest green main; current HEAD: `876c59e`)
**Decision date / time:** `____________________`
**Signers:** see end of doc.

> This is the single sheet that authorises real money to flow. Every row must be evidence-backed. If any **hard-stop** rule below is true, the answer is **NO-GO**, no exceptions.

---

## 1. External blockers (from `LAUNCH_EVIDENCE_PACKET.md`)

| # | Blocker | Status | Evidence file |
|---|---|---|---|
| 1 | Legal review of /terms /privacy /refunds /shipping | ⬜ TODO / ✅ DONE | `01-legal-*` |
| 2 | Email DNS (SPF / DKIM / DMARC + sender domain) | ⬜ TODO / ✅ DONE | `02-dns-*` |
| 3 | Payment provider live keys + real low-value payment + refund test | ⬜ TODO / ✅ DONE | `03-payment-*` + `REAL_PAYMENT_TEST_RECORD.md` |
| 4 | `expire-orders` cron scheduled every 5 min | ⬜ TODO / ✅ DONE | `04-cron-*` |
| 5 | Sentry DSN + `/health` & `/ready` uptime + alerts wired | ⬜ TODO / ✅ DONE | `05-mon-*` |

---

## 2. Engineering status

| Item | Required value | Actual | OK? |
|---|---|---|---|
| CI on the deploying commit | green | `____________________` | ☐ |
| Tests passing | 74 / 74 | `____________________` | ☐ |
| Secret scan | green | `____________________` | ☐ |
| Dependency audit (high+) | green | `____________________` | ☐ |
| Latest commit reviewed by ≥1 human besides author | yes | `____________________` | ☐ |
| Container / deploy artifact tagged with commit SHA | yes | `____________________` | ☐ |

---

## 3. Production env status (preflight)

| Item | Required | Actual | OK? |
|---|---|---|---|
| `LAUNCH_MODE` | `production` | `____________________` | ☐ |
| Boot preflight error-level findings | 0 | `____________________` | ☐ |
| `JWT_ACCESS_SECRET` ≥ 32 chars and ≠ `JWT_REFRESH_SECRET` | yes | `____________________` | ☐ |
| `PAYMENT_WEBHOOK_SECRET` ≥ 32 chars | yes | `____________________` | ☐ |
| `CORS_ORIGIN` | https://yourdomain only | `____________________` | ☐ |
| `FRONTEND_URL` | https + non-localhost | `____________________` | ☐ |
| `DATABASE_URL` SSL | required | `____________________` | ☐ |
| Secrets stored in a secret manager (not just deploy panel) | yes | `____________________` | ☐ |

---

## 4. Payment live-mode status

| Item | Required | Actual | OK? |
|---|---|---|---|
| `PAYMENT_PROVIDER_DEFAULT` | not `mock` | `____________________` | ☐ |
| Live keys configured (no `sk_test_` / `xnd_development`) | yes | `____________________` | ☐ |
| Webhook URL configured on provider dashboard | yes | `____________________` | ☐ |
| Live webhook signing secret rotated | yes | `____________________` | ☐ |
| Real low-value payment test | PASS | `____________________` | ☐ |
| Refund test | PASS or formally deferred by business owner | `____________________` | ☐ |

---

## 5. Legal status

| Item | Required | Actual | OK? |
|---|---|---|---|
| All four legal pages reviewed | yes | `____________________` | ☐ |
| `REVIEW_BANNER` removed from all four | yes | `____________________` | ☐ |
| `Last updated` date current | yes | `____________________` | ☐ |
| Reviewer name + sign-off on file | yes | `____________________` | ☐ |

---

## 6. Email DNS status

| Item | Required | Actual | OK? |
|---|---|---|---|
| `MAIL_PROVIDER` | not `mock` | `____________________` | ☐ |
| SPF / DKIM / DMARC verified at provider | all three | `____________________` | ☐ |
| Test message to Gmail shows all three `pass` | yes | `____________________` | ☐ |
| `mail-tester.com` score | ≥ 9 / 10 | `____________________` | ☐ |
| `SUPPORT_EMAIL` mailbox monitored | yes | `____________________` | ☐ |

---

## 7. Cron status

| Item | Required | Actual | OK? |
|---|---|---|---|
| `expire-orders` scheduled every 5 min | yes | `____________________` | ☐ |
| Last run completed log line | < 10 min ago | `____________________` | ☐ |
| Advisory lock confirmed (no double-process) | yes | `____________________` | ☐ |
| Stale-cron alert configured | yes | `____________________` | ☐ |

---

## 8. Monitoring status

| Item | Required | Actual | OK? |
|---|---|---|---|
| `SENTRY_DSN` set | yes | `____________________` | ☐ |
| Sentry test event received | yes | `____________________` | ☐ |
| Uptime monitor on `/health` (1-min) | yes | `____________________` | ☐ |
| Uptime monitor on `/ready` (5-min) | yes | `____________________` | ☐ |
| Webhook failure alert | yes | `____________________` | ☐ |
| `MANUAL_REVIEW` payment alert | yes | `____________________` | ☐ |
| HTTP 5xx > 1% / 5 min alert | yes | `____________________` | ☐ |
| Database connection error alert | yes | `____________________` | ☐ |
| Failed admin login spike alert | yes | `____________________` | ☐ |
| Stale cron alert | yes | `____________________` | ☐ |
| Alert channel test (page received) | yes | `____________________` | ☐ |

---

## 9. Admin 2FA

| Item | Required | Actual | OK? |
|---|---|---|---|
| `ENFORCE_ADMIN_2FA` | `true` | `____________________` | ☐ |
| Super-admin enrolled in 2FA | yes | `____________________` | ☐ |
| All 10 backup codes saved | yes | `____________________` | ☐ |
| All other admins enrolled | yes | `____________________` | ☐ |

---

## 10. Rollback readiness

| Item | Required | Actual | OK? |
|---|---|---|---|
| Last known-good deploy SHA recorded | yes | `____________________` | ☐ |
| `prisma migrate` rollback plan documented | `ROLLBACK.md` | `____________________` | ☐ |
| Pre-deploy DB snapshot taken | yes | `____________________` | ☐ |
| `PAYMENT_PROVIDER_DEFAULT=manual` fallback procedure understood | yes | `____________________` | ☐ |

---

## 11. Support readiness

| Item | Required | Actual | OK? |
|---|---|---|---|
| On-call engineer named for first 7 days | yes | `____________________` | ☐ |
| Phone / pager number tested | yes | `____________________` | ☐ |
| Customer support inbox monitored by a human | yes | `____________________` | ☐ |
| Escalation path written down (engineer → tech owner → business owner) | yes | `____________________` | ☐ |

---

## 12. Hard-stop rules

The decision is **NO-GO** if **any** of the following is true:

1. Any external blocker (1–5) is incomplete.
2. Live webhook has not been tested with a real signed event from the provider.
3. Refund test has not been performed AND has not been explicitly deferred in writing by the business owner.
4. `expire-orders` cron is not scheduled (or last run > 15 min ago).
5. Sentry DSN is unset OR uptime monitor is not active.
6. Any legal page still shows `REQUIRES LEGAL REVIEW`.
7. `ENFORCE_ADMIN_2FA != true`.
8. CI is not green on the deploying commit.
9. Secret scan or dependency audit is failing on the deploying commit.
10. `PAYMENT_PROVIDER_DEFAULT=mock` OR any payment key is a test/sandbox key.
11. `MAIL_PROVIDER=mock` OR DNS is not verified.
12. No on-call engineer for the first week.
13. No tested rollback path.

---

## 13. Decision

```
[ ] GO for soft launch (≤10 invited customers)
[ ] NO-GO — reason: __________________________________________
```

**Soft-launch window:** start `____________________` end `____________________`

---

## 14. Approvers

| Role | Name | Signature / approval ref | Date / time |
|---|---|---|---|
| Technical owner | | | |
| Business owner | | | |
| Support owner | | | |
| Security / on-call | | | |

> File this completed sheet under `ops/launch-evidence/<YYYY-MM-DD>/SOFT_LAUNCH_GO_NO_GO.signed.pdf`.
