# Soft-Launch Dry Run

Full rehearsal **before** any real customer is invited. Run end-to-end against a production-like environment using the launch team only. The dry run must PASS before `SOFT_LAUNCH_GO_NO_GO.md` may be signed.

> If any row FAILS, fix the root cause and re-run from step 1. Do not promote partial passes.

---

## 1. Environment & deploy

| # | Step | Pass criterion |
|---|---|---|
| 1.1 | Deploy commit `<SHA>` to staging or prod-like environment | Deploy completes; service answers HTTP |
| 1.2 | Confirm CI green on `<SHA>` | GH Actions: CI + Secret scan = success |
| 1.3 | Confirm latest 74 tests passing | CI logs show `Tests 74 passed (74)` |

## 2. Environment variables / preflight

| # | Step | Pass criterion |
|---|---|---|
| 2.1 | `LAUNCH_MODE=production` | Confirmed in deployed env |
| 2.2 | Run preflight (per `PAYMENT_LIVE_EXECUTION_PACKET.md` A.4) | exit 0, no `sk_test_` / `xnd_development` / `mock` / weak-secret findings |
| 2.3 | `JWT_ACCESS_SECRET` ≥ 32 chars and ≠ `JWT_REFRESH_SECRET` | Manual check via secret store |
| 2.4 | `PAYMENT_WEBHOOK_SECRET` ≥ 32 chars | Manual check |
| 2.5 | `CORS_ORIGIN` = production domain only | Manual check |
| 2.6 | `ENFORCE_ADMIN_2FA=true` | Manual check |

## 3. Legal pages

| # | Step | Pass criterion |
|---|---|---|
| 3.1 | `grep -c "REVIEW_BANNER" frontend/src/pages/Home.jsx` | `0` |
| 3.2 | `curl` each of `/terms`, `/privacy`, `/refunds`, `/shipping` and grep for `REQUIRES LEGAL REVIEW` | all `0` |
| 3.3 | Lawyer approval on file | yes |

## 4. Email DNS

| # | Step | Pass criterion |
|---|---|---|
| 4.1 | `dig` SPF, DMARC, DKIM (per `EMAIL_DNS_EXECUTION_PACKET.md` §6) | all 3 resolve correctly |
| 4.2 | Send test mail to fresh Gmail; check headers | SPF/DKIM/DMARC = `pass` |
| 4.3 | mail-tester | ≥ 9/10 |

## 5. Monitoring

| # | Step | Pass criterion |
|---|---|---|
| 5.1 | `SENTRY_DSN` set; test event received | Event visible in Sentry inbox |
| 5.2 | `/health` monitor green | Last 24h 100% (or only deploy blip) |
| 5.3 | `/ready` monitor green | Same |
| 5.4 | All 9 alert rules wired | `05-mon-rules.txt` lists 9 names |
| 5.5 | Alert channel test page received | Phone/Slack screenshot |

## 6. Cron

| # | Step | Pass criterion |
|---|---|---|
| 6.1 | `expire-orders` scheduled `*/5 * * * *` | Scheduler screen |
| 6.2 | Last run < 10 min ago | Log shows `cron.expire-orders complete` |
| 6.3 | Manual proof: test order with past `paymentExpiresAt` expires + restores stock + no double-restore | All three observed |
| 6.4 | Stale-cron alert configured | Rule screenshot |

## 7. Internal live low-value order (the heart of the dry run)

| # | Step | Pass criterion |
|---|---|---|
| 7.1 | Tester (real customer email) places one real order at lowest amount | Order created |
| 7.2 | Pay with a real card on the live provider | Provider returns success |
| 7.3 | Webhook arrives within 60 s | `WebhookEvent` row inserted, `verified=true` |
| 7.4 | Order status `PAID` | Admin + DB |
| 7.5 | Variant stock decremented by exactly `quantity` | DB |
| 7.6 | Confirmation email arrived in customer inbox (not spam) within 5 min | Tester confirms |
| 7.7 | Sentry: 0 new issues for this request id | Sentry inbox |
| 7.8 | No `MANUAL_REVIEW` payment created | DB / admin |

Fill `REAL_PAYMENT_TEST_RECORD.md` Section A as you go.

## 8. Refund

| # | Step | Pass criterion |
|---|---|---|
| 8.1 | Admin (2FA) issues refund from order detail | Refund accepted |
| 8.2 | Refund row visible in provider dashboard | Yes, with reference |
| 8.3 | `Payment` row updates to `REFUNDED` | DB |
| 8.4 | Audit log row created with admin email | DB |
| 8.5 | Refund-confirmation email sent | Tester confirms |

Fill `REAL_PAYMENT_TEST_RECORD.md` Section B as you go.

## 9. Reconciliation

| # | Step | Pass criterion |
|---|---|---|
| 9.1 | Provider settlement preview shows charge + refund | Net = 0 |
| 9.2 | DB sums match (order total = payment amount; payment refund = same) | Yes |
| 9.3 | Section C of `REAL_PAYMENT_TEST_RECORD.md` filled and signed | Yes |

## 10. Go / No-Go meeting

| # | Step | Pass criterion |
|---|---|---|
| 10.1 | All four owners present (technical / business / support / security) | Attendance recorded |
| 10.2 | Walk through `SOFT_LAUNCH_GO_NO_GO.md` row by row | Every row PASS |
| 10.3 | Decision recorded | GO or NO-GO with rationale |
| 10.4 | If GO: signed PDF saved as `SOFT_LAUNCH_GO_NO_GO.signed.pdf` | Yes |

---

## Pass / fail table

| Section | PASS | FAIL |
|---|---|---|
| 1. Environment & deploy | ☐ | ☐ |
| 2. Env vars / preflight | ☐ | ☐ |
| 3. Legal pages | ☐ | ☐ |
| 4. Email DNS | ☐ | ☐ |
| 5. Monitoring | ☐ | ☐ |
| 6. Cron | ☐ | ☐ |
| 7. Internal live payment | ☐ | ☐ |
| 8. Refund | ☐ | ☐ |
| 9. Reconciliation | ☐ | ☐ |
| 10. Go / No-Go meeting | ☐ | ☐ |

**PASS** = all 10 sections PASS → may proceed to signed `SOFT_LAUNCH_GO_NO_GO.md` and the first-10-customers window.
**FAIL** = fix the root cause and **repeat the entire dry run from §1**. Partial re-runs are not acceptable.
