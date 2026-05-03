# Final External Launch Tracker

**Audited commit:** `2ee1553` &nbsp;·&nbsp; **CI:** green &nbsp;·&nbsp; **Tests:** 74 passing &nbsp;·&nbsp; **Code & infra readiness:** 9.5 / 10 &nbsp;·&nbsp; **Whole-system readiness:** 6 / 10 (blocked on the five external items below).

This document is the **single source of truth** for the external work that stands between this repo and a real launch. Everything in code is done; everything below has to be done by a human with access to a DNS panel, a payment provider dashboard, a legal reviewer, a platform scheduler, and a monitoring vendor.

> **Hard rule.** Do not launch real payments while *any* row below is unchecked. Do not promote to public production until soft launch has run clean for **24–72 hours**.

---

## How to use this doc

1. Work top-to-bottom. Each blocker has its own owner and verification.
2. Tick the **Done** checkbox only after the verification command/screenshot is captured. Paste evidence into the linked ops folder (e.g. `ops/launch-evidence/2026-05-XX/`).
3. When all five blockers read ✅, move to the **Final pre-soft-launch checklist**.
4. After the **Real low-value payment** + **Refund** tests pass, open the storefront to ≤10 invited customers.
5. After **First 24h monitoring checklist** is clean, consult the **Soft-launch GO/NO-GO decision table**.
6. After **24–72h** of clean soft launch, consult **Full-production promotion criteria**.

---

## Blocker 1 — Legal review of policy pages

| Field | Value |
|---|---|
| **Owner** | Business owner / lawyer |
| **Current status** | ⬜ TODO — pages render the explicit `REQUIRES LEGAL REVIEW` banner |
| **Launch impact if skipped** | Legal exposure; refund/privacy/dispute claims unenforceable; possible consumer-protection violation in your jurisdiction |
| **Done** | ☐ |

**Action steps**

1. Open the running site at `/terms`, `/privacy`, `/refunds`, `/shipping`.
2. For each page, replace the placeholder text with text appropriate to the actual business — jurisdiction, return window, carrier names, refund timeline, data-controller name, support email.
3. File: `frontend/src/pages/Home.jsx`. Search for `TermsPage`, `PrivacyPage`, `RefundsPage`, `ShippingPage`.
4. Remove the `REVIEW_BANNER` JSX block from each page once the lawyer signs off.
5. Update the `Last updated` date at the top of each page.
6. Re-deploy the frontend.

**Required evidence**

- Screenshot of each of the four pages **without** the yellow banner.
- `Last updated` date matches sign-off date.
- Lawyer's email/letter approving the four texts (file under `ops/legal/`).

**Verification**

```bash
# Local sanity — must return zero matches
grep -c "REVIEW_BANNER" frontend/src/pages/Home.jsx
```

**Rollback / fallback**

If legal sign-off cannot be obtained before launch, **do not launch publicly**. You may run a closed soft launch under a written invite-only agreement with the test customers, but the four pages must still link a working contact for refund/privacy requests.

---

## Blocker 2 — Email DNS (SPF / DKIM / DMARC) and sender domain

| Field | Value |
|---|---|
| **Owner** | DNS owner for the sender domain (placeholder: `mail.example.com`) |
| **Current status** | ⬜ TODO |
| **Launch impact if skipped** | Verification, order, password-reset, 2FA emails go to spam or bounce; new customers cannot complete signup; existing customers cannot recover accounts |
| **Done** | ☐ |

**Action steps**

1. Pick the email provider (Resend, SendGrid, or Mailgun) — same one set in `MAIL_PROVIDER` and `EMAIL_FROM`.
2. In the provider dashboard, add the sender domain.
3. Provider issues ~3 records (1 SPF TXT, 1–2 DKIM CNAMEs, 1 DMARC TXT). Add them at your DNS host.
4. Wait for propagation (5 min – 24 h), then click **Verify** in the provider dashboard.
5. Set `MAIL_PROVIDER` to the chosen provider in production env (preflight will refuse `mock`).
6. Set a monitored mailbox as `SUPPORT_EMAIL` / reply-to.

**Required evidence**

- Provider dashboard screenshot — all three records ✅ verified.
- Test message to a Gmail address; **Show original** shows `SPF: pass`, `DKIM: pass`, `DMARC: pass`.
- `mail-tester.com` score ≥ 9 / 10.

**Verification**

```bash
dig +short TXT mail.example.com
dig +short TXT _dmarc.mail.example.com
# DKIM selector varies by provider, e.g.:
dig +short CNAME resend._domainkey.mail.example.com
```

**Rollback / fallback**

If DNS verification fails, you can temporarily fall back to a transactional provider that uses its own domain (e.g. `noreply@yourbrand.resend.app`). Update `EMAIL_FROM` accordingly. Customers will still receive mail but you lose brand trust signals; **not acceptable for full production**, only for late-stage soft launch.

---

## Blocker 3 — Payment provider KYC + live keys

| Field | Value |
|---|---|
| **Owner** | Business owner |
| **Current status** | ⬜ TODO |
| **Launch impact if skipped** | No real payments can settle; every checkout fails or falls back to `MANUAL_REVIEW` |
| **Done** | ☐ |

**Action steps** (per provider; finish at least one — see `PAYMENT_LIVE_MODE_CHECKLIST.md` for full walk-throughs)

1. Complete KYC / business verification with PayMongo, Maya, **or** Xendit. Requires business registration, valid IDs, and a settlement bank account.
2. In the provider dashboard, switch to **live mode** and copy the live API keys.
3. Set the live keys in production env (per `ENV_PRODUCTION_CHECKLIST.md`):
   - PayMongo → `PAYMONGO_SECRET_KEY=sk_live_…`, `PAYMONGO_PUBLIC_KEY=pk_live_…`
   - Maya → `MAYA_SECRET_KEY=…`, `MAYA_PUBLIC_KEY=…`
   - Xendit → `XENDIT_SECRET_KEY=…` (no `xnd_development`)
4. Configure the live webhook URL on the provider dashboard:
   `https://yourdomain.example.com/api/payments/webhook/<provider>`
5. Copy the live webhook signing secret into `PAYMENT_WEBHOOK_SECRET` (≥32 chars, preflight refuses weak values).
6. Set `PAYMENT_PROVIDER_DEFAULT` to the chosen provider (preflight refuses `mock` in production).

**Required evidence**

- Provider dashboard screenshot — live mode active, webhook URL configured, secret rotated.
- Production preflight log line: `PAYMENT_PROVIDER_DEFAULT=<provider>` and **no** `sk_test_` / `xnd_development` errors.

**Verification**

```bash
# Run preflight against the production env (must exit 0)
LAUNCH_MODE=production node -e "import('./backend/dist/preflight.js').then(m=>m.runPreflight()).then(r=>{if(r.ok)process.exit(0);console.error(r);process.exit(1)})"

# Confirm webhook reachable from provider IP space
curl -i -X POST https://yourdomain.example.com/api/payments/webhook/paymongo -d '{}'
# expect 401 "Invalid payment webhook signature" (proves endpoint is live; signature gate works)
```

**Rollback / fallback**

If live keys cannot be obtained, set `PAYMENT_PROVIDER_DEFAULT=manual` (cash on delivery / bank transfer) — preflight allows this. Customers see manual instructions instead of a hosted checkout. **Not recommended** but documented in `RUNBOOK.md`.

---

## Blocker 4 — Schedule the order-expiration cron

| Field | Value |
|---|---|
| **Owner** | Platform / DevOps owner |
| **Current status** | ⬜ TODO |
| **Launch impact if skipped** | Abandoned carts permanently hold stock; inventory shows `inStock=0` for SKUs you physically still have; revenue silently drops |
| **Done** | ☐ |

**Action steps**

1. Schedule the job (recommended: every **5 minutes**). The job is idempotent and protected by a Postgres advisory lock — safe on multiple replicas.

   ```bash
   node backend/scripts/expire-orders.ts
   ```

2. See `JOBS.md` for platform-specific recipes (Linux cron, Replit Scheduled Deployments, Kubernetes CronJob).
3. Configure a stale-cron alert: page the on-call if no `cron.expire-orders complete` log line appears for **15 minutes**.

**Required evidence**

- Platform scheduler shows the job exists; last execution succeeded < 10 min ago.
- Logs contain both `cron.expire-orders lock acquired` and `cron.expire-orders complete` lines.
- Manual proof: create an unpaid order, set `paymentExpiresAt` to a past timestamp, wait one tick, confirm order is `EXPIRED` and stock returned.

**Verification**

```bash
# Tail the platform logs for the most recent run
your-platform logs --filter "cron.expire-orders" --since 10m
# Expect at least one "complete" line within the last 5 min
```

**Rollback / fallback**

If the platform scheduler is down, run the job manually every few minutes from a workstation:

```bash
NODE_ENV=production node backend/scripts/expire-orders.ts
```

Document the start/stop in the incident channel. **Not acceptable** for >2 hours.

---

## Blocker 5 — Sentry DSN + uptime monitoring + alerts

| Field | Value |
|---|---|
| **Owner** | Platform / DevOps owner |
| **Current status** | ⬜ TODO |
| **Launch impact if skipped** | When the site breaks you find out via customer email, hours later — by which time you have lost orders and trust |
| **Done** | ☐ |

**Action steps** (full alert matrix in `MONITORING_ALERTS_CHECKLIST.md`)

1. Create a Sentry project. Copy the DSN.
2. Set `SENTRY_DSN` in production env.
3. Sign up for an uptime monitor (UptimeRobot / BetterStack / Pingdom — free tier is fine).
4. Add two checks:
   - HTTP GET `https://yourdomain.example.com/health` every **1 minute**
   - HTTP GET `/ready` every **5 minutes**
5. Configure alerts to page the on-call on:
   - first failure of `/health`
   - 3 consecutive failures of `/ready`
   - Sentry: any unhandled error in `routes.ts`, `payment.service.ts`, `expireOrders.ts`
   - HTTP 5xx rate > 1% for 5 min
   - Database connection error
   - Webhook failure (HTTP 4xx/5xx from `/payments/webhook`)
   - `MANUAL_REVIEW` payment created
   - Failed admin login spike (≥10 failures / 5 min)
   - Stale cron (no `cron.expire-orders complete` in 15 min)

**Required evidence**

- Sentry inbox shows a test event you triggered manually.
- Uptime monitor dashboard shows both checks green.
- Test page-out via the alert channel (PagerDuty / SMS / push).

**Verification**

```bash
# Test event from the running production app (any unhandled throw):
curl https://yourdomain.example.com/__test_sentry  # if you exposed a test endpoint
# OR trigger a known-safe error like a 404 to a debug route while watching Sentry inbox
```

**Rollback / fallback**

If Sentry is unavailable, you can ship logs to a file + use `your-platform logs --severity error --watch` as a temporary substitute. **Not acceptable** for >24 hours.

---

# Final pre-soft-launch checklist

> All five blockers above must read ✅ before working through this section.

### Code & infrastructure
- [ ] CI green on the deploying commit (`https://github.com/Ediwow110/e-commerce/actions`)
- [ ] All **74** tests pass against live Postgres in CI
- [ ] Latest commit reviewed by at least one human besides the author
- [ ] Container image / deploy artifact tagged with the commit SHA
- [ ] `LAUNCH_MODE=production` set in the deployed env
- [ ] Boot preflight emits no error-level findings

### Database
- [ ] Daily backup verified (`BACKUPS.md`)
- [ ] PITR enabled, **or** restore drill completed within last 90 days
- [ ] `prisma migrate status` clean on prod

### Env vars & secrets
- [ ] Every required var in `PRODUCTION_ENV.md` set in production env
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` rotated for production (not reused from staging) and **not equal**
- [ ] `PAYMENT_WEBHOOK_SECRET` rotated for production (≥32 chars)
- [ ] Secrets stored in a secret manager (1Password / Doppler / AWS Secrets Manager) — not only in the deploy panel UI

### Admin 2FA
- [ ] First super-admin account exists with a unique strong password
- [ ] Super-admin enrolled in 2FA (TOTP scanned, code verified)
- [ ] **All 10 backup codes saved in a password manager**
- [ ] All other admins enrolled in 2FA
- [ ] `ENFORCE_ADMIN_2FA=true`

### Payments
- [ ] Provider selected and live keys set (Blocker 3 ✅)
- [ ] Webhook URL configured + secret rotated
- [ ] `verifyWebhookSignature` returns true on a test signed payload from the provider dashboard

### Cron
- [ ] `expire-orders` scheduled (Blocker 4 ✅)
- [ ] First scheduled run logged `cron.expire-orders complete`

### Monitoring
- [ ] `SENTRY_DSN` set, test event received
- [ ] Uptime monitor pinging `/health` and `/ready`
- [ ] All alerts in `MONITORING_ALERTS_CHECKLIST.md` configured and routed to on-call
- [ ] On-call rotation defined (one human reachable 24/7 for first week)

### Email
- [ ] `MAIL_PROVIDER` set to a real provider (Blocker 2 ✅)
- [ ] SPF / DKIM / DMARC verified, `mail-tester.com` ≥ 9 / 10
- [ ] Test order email reaches a Gmail inbox out of spam
- [ ] `SUPPORT_EMAIL` mailbox monitored by a human

### Customer trust pages
- [ ] Terms reviewed; banner removed (Blocker 1 ✅)
- [ ] Privacy reviewed and lists every third party (PayMongo/Maya/Xendit/Resend/Sentry/Google)
- [ ] Refund policy clear and linked from checkout
- [ ] Shipping policy lists carriers and zones
- [ ] Contact / Support page reachable from the footer

### Legal / business
- [ ] Business registered for the markets you sell into
- [ ] Tax handling (VAT / GST / sales tax) configured at checkout
- [ ] Cookie / consent banner compliant with your jurisdiction (GDPR / CCPA / DPA)

---

# Real low-value payment test checklist

Run **after** all five blockers and the pre-soft-launch checklist are ✅.

1. [ ] As a real customer (use a personal email, real card, smallest possible amount — e.g. PHP 20), browse → add to cart → checkout.
2. [ ] Hosted checkout opens on the live provider domain (not sandbox).
3. [ ] Complete the payment with the card.
4. [ ] Provider dashboard shows the payment as **paid** within 60 s.
5. [ ] Webhook received within 60 s — log line `webhook verified=true`.
6. [ ] Order in admin shows `PAID`, payment `PAID`.
7. [ ] Stock for the purchased variant decremented by exactly the right amount (verify in admin > Inventory).
8. [ ] Customer received the order-confirmation email at the test address (check inbox **and** spam).
9. [ ] Test customer received the receipt email within 5 min.
10. [ ] No Sentry errors during the flow.
11. [ ] No unhandled HTTP 5xx in platform logs during the flow.
12. [ ] Payment row stored with `providerEventId` (idempotency key).

If any step fails → **STOP**, file an incident, fix, re-run from step 1.

---

# Refund test checklist

Run immediately after the payment test passes (so settlement does not complete).

1. [ ] As an admin (with 2FA), open the test order → **Refund**.
2. [ ] Refund completes in admin within 60 s.
3. [ ] Provider dashboard shows the refund within 5 min.
4. [ ] Order status reflects refund (`REFUNDED` or per your policy).
5. [ ] Stock for the refunded variant restored (check Inventory). *Note: confirm against your business policy — some shops only restore on cancellation, not refund.*
6. [ ] Customer received refund-confirmation email.
7. [ ] No Sentry errors during the refund flow.
8. [ ] Audit log row exists for the refund action with the admin's email.

---

# First 24h monitoring checklist

After opening the storefront to the soft-launch audience:

### Continuous (watch)
- [ ] Sentry inbox — page on any new issue tagged `production`
- [ ] HTTP 5xx rate < 1%
- [ ] Webhook delivery rate ≥ 99% (provider dashboard)
- [ ] `MANUAL_REVIEW` payment count: investigate every one
- [ ] Failed admin login spikes
- [ ] `cron.expire-orders complete` log line every ≤10 min

### Hourly (first 6 h)
- [ ] Reconcile new PAID orders against provider settlement view — count matches
- [ ] Spot-check two random orders for correct stock decrement
- [ ] Read the support inbox; track recurring complaints
- [ ] Confirm uptime monitor still green

### End of day 1
- [ ] Total orders matches admin dashboard count
- [ ] Stock movements match orders × quantities
- [ ] Promo redemptions never exceeded `usageLimit`
- [ ] Email deliverability spot-check from a fresh Gmail account
- [ ] Admin 2FA still working for at least two admins (no lockouts)

---

# Soft-launch GO / NO-GO decision table

| Condition | If true → |
|---|---|
| Any of Blockers 1–5 unchecked | **NO-GO** — stop |
| CI not green on deploying commit | **NO-GO** |
| Real low-value payment test failed at any step | **NO-GO** |
| Refund test failed at any step | **NO-GO** |
| `LAUNCH_MODE` not `production` | **NO-GO** |
| Preflight emits any error-level finding | **NO-GO** |
| `PAYMENT_PROVIDER_DEFAULT=mock` or any `sk_test_` / `xnd_development` key | **NO-GO** |
| `MAIL_PROVIDER=mock` | **NO-GO** |
| `ENFORCE_ADMIN_2FA != true` | **NO-GO** |
| Any super-admin without 2FA + saved backup codes | **NO-GO** |
| Cron not scheduled | **NO-GO** |
| Sentry DSN missing or no uptime monitor | **NO-GO** |
| Legal pages still show `REQUIRES LEGAL REVIEW` | **NO-GO** |
| **All of the above are clean** | **GO** for soft launch (≤10 invited customers) |

---

# Full-production promotion criteria (after 24–72 h of soft launch)

Promote only when **all** of the following are true:

- [ ] ≥ 24 h (target: 72 h) of continuous soft-launch traffic
- [ ] No P0 / P1 incident during the soft-launch window
- [ ] HTTP 5xx rate stayed < 1% across the window
- [ ] Webhook delivery rate stayed ≥ 99%
- [ ] Provider settlement reports reconciled daily — zero unexplained mismatches
- [ ] Every `MANUAL_REVIEW` payment was resolved to `PAID` or `REFUNDED`
- [ ] Every Sentry issue triaged (resolved, snoozed, or ticketed)
- [ ] Every customer-support email triaged
- [ ] Daily DB backup ran successfully every day of the window
- [ ] No admin lockouts that required emergency reset
- [ ] Cron `expire-orders` ran every cycle without gaps
- [ ] Email deliverability remained ≥ 9 / 10 on `mail-tester.com`

If all true → open the storefront publicly, send the launch announcement, keep the on-call rotation in place for at least the first week.

---

# Do not launch if any of these are true

1. **Any of the five external blockers (Legal / DNS / Payments / Cron / Monitoring) is ⬜ TODO.**
2. **CI is not green** on the deployed commit.
3. **Preflight reports any error-level finding** at boot.
4. **Real low-value live payment test** has not been completed end-to-end.
5. **Refund test** has not been completed end-to-end.
6. **A super-admin exists without 2FA** or without saved backup codes.
7. **`ENFORCE_ADMIN_2FA` is not `true`** in production env.
8. **`PAYMENT_PROVIDER_DEFAULT` is `mock`** or any provider key is a test/sandbox key (`sk_test_`, `xnd_development`, etc.).
9. **`MAIL_PROVIDER` is `mock`** or DNS is not verified.
10. **`SENTRY_DSN` is unset** or no uptime monitor exists.
11. **Cron `expire-orders` is not scheduled** or last run > 15 min ago.
12. **Legal pages still display `REQUIRES LEGAL REVIEW`.**
13. **No on-call human** is reachable for the first week.
14. **No tested rollback path** (last successful deploy SHA + `prisma migrate` rollback plan in `ROLLBACK.md`) is documented.

---

## Quick reference

| Doc | Purpose |
|---|---|
| `EXTERNAL_BLOCKERS.md` | The original five-blocker spec |
| `SOFT_LAUNCH_CHECKLIST.md` | Detailed pre-soft-launch list (this tracker is its operational counterpart) |
| `PAYMENT_LIVE_MODE_CHECKLIST.md` | Per-provider live-key walkthrough |
| `PAYMENT_PROVIDER_LAUNCH_CHECKLIST.md` | Per-provider launch checklist |
| `ENV_PRODUCTION_CHECKLIST.md` | Every required env var |
| `MONITORING_ALERTS_CHECKLIST.md` | Full alert matrix |
| `JOBS.md` | Cron platform recipes |
| `EMAIL_DELIVERABILITY.md` | SPF/DKIM/DMARC per provider |
| `LAUNCH_DAY_RUNBOOK.md` | Deploy-day timeline |
| `POST_LAUNCH_24H_WATCHLIST.md` | What to watch after launch |
| `RUNBOOK.md` | General incident response |
| `ROLLBACK.md` | Rollback procedures |
| `BACKUPS.md` | Backup + restore drill |
| `backend/SECURITY.md` | Auth model, 2FA, Google Sign-In rules, staff sign-in |
| `backend/PAYMENTS.md` | Webhook + idempotency contract |

> Notes on doc references the audit asked about:
> - `AUTH_FLOW.md`, `GOOGLE_SIGN_IN_SETUP.md`, `STAFF_AUTH_RUNBOOK.md` are **not** present as separate files. Their content lives in `backend/SECURITY.md` and `RUNBOOK.md`. Do not file a new doc in this pass; reference the existing files.
> - The single backend `console.error` (`routes.ts:1151`, invitation-email failure) is tracked as a P3 cleanup. Migrate to `logger.error` during the post-launch quiet week.
