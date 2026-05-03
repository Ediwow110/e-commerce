# Launch Evidence Packet

**Reference commit:** `876c59e` &nbsp;·&nbsp; **CI:** green &nbsp;·&nbsp; **Tests:** 74 passing &nbsp;·&nbsp; **Code & infra:** 9.5 / 10 &nbsp;·&nbsp; **Whole-system:** 6 / 10 (blocked on items below).

This packet collects every piece of **external** evidence that must be produced — and stored — before real payments are turned on. The repo is launch-ready; this packet is the launch.

> **Where to file evidence.** Create `ops/launch-evidence/<YYYY-MM-DD>/` and drop the screenshots, dig outputs, dashboard PDFs, and signed approvals named after the section below (`01-legal-tos.png`, `02-dns-spf-dig.txt`, etc.).

> **Hard rule.** Do not flip any production switch until the row's checkbox is ✅ and the linked evidence file exists.

---

## 1. Legal review

| Field | Value |
|---|---|
| **Owner** | Business owner / external lawyer |
| **Status** | ⬜ TODO |
| **Launch impact if incomplete** | Legal exposure; refund / privacy / dispute claims unenforceable; possible consumer-protection violation |
| **Done** | ☐ |

**Steps**

1. Send the four pages (`/terms`, `/privacy`, `/refunds`, `/shipping`) to the reviewer with the business context (jurisdiction, return window, carrier list, refund timeline, data-controller name, support email).
2. Apply the reviewer's edits to `frontend/src/pages/Home.jsx` (sections `TermsPage`, `PrivacyPage`, `RefundsPage`, `ShippingPage`).
3. Remove the `REVIEW_BANNER` JSX block from each page.
4. Update each page's `Last updated` date to the sign-off date.
5. Re-deploy the frontend.

**Required evidence**

- Reviewer name and date.
- Signed approval (email or letter) — file as `01-legal-approval.pdf`.
- Screenshot of each of the four pages **without** the yellow banner — `01-legal-{terms,privacy,refunds,shipping}.png`.

**Acceptable proof examples**

- "Reviewed by Atty. <name>, <firm>, on <date>. Approved for production."
- Screenshot showing the page, the URL bar, and no yellow `REQUIRES LEGAL REVIEW` banner.

**Verification**

```bash
# Must return 0 (i.e. banner removed everywhere)
grep -c "REVIEW_BANNER" frontend/src/pages/Home.jsx

# Live check
curl -s https://yourdomain.example.com/terms    | grep -ci "REQUIRES LEGAL REVIEW"
curl -s https://yourdomain.example.com/privacy  | grep -ci "REQUIRES LEGAL REVIEW"
curl -s https://yourdomain.example.com/refunds  | grep -ci "REQUIRES LEGAL REVIEW"
curl -s https://yourdomain.example.com/shipping | grep -ci "REQUIRES LEGAL REVIEW"
# All four must print 0
```

**Pass / fail**

- **Pass:** all four checks return 0 AND signed approval exists.
- **Fail:** any banner still present OR no signed approval on file.

**Rollback / fallback**

If approval can't be obtained before the planned launch date, run a closed invite-only soft launch under written customer consent — pages must still link a working contact for refunds and privacy requests. Do **not** open public production.

---

## 2. Email DNS and deliverability

| Field | Value |
|---|---|
| **Owner** | DNS owner for the sender domain (placeholder: `mail.example.com`) |
| **Status** | ⬜ TODO |
| **Launch impact if incomplete** | Verification, order, password-reset, and 2FA emails go to spam or bounce; new customers cannot complete signup |
| **Done** | ☐ |

**Steps**

1. Pick the email provider (Resend / SendGrid / Mailgun) — same one set in `MAIL_PROVIDER` and `EMAIL_FROM`.
2. In the provider dashboard, add the sender domain.
3. Add the issued SPF (TXT), DKIM (CNAME ×1–2), DMARC (TXT) records at your DNS host.
4. Wait for propagation (5 min – 24 h) and click **Verify**.
5. Set `MAIL_PROVIDER` to the chosen provider and `EMAIL_FROM` to the verified sender.
6. Configure a monitored mailbox as `SUPPORT_EMAIL` / reply-to.

**Required evidence**

- Provider dashboard screenshot — all three records ✅ verified — `02-dns-provider.png`.
- `dig` output for SPF, DMARC, DKIM — `02-dns-dig.txt`.
- `mail-tester.com` score ≥ 9 / 10 — `02-dns-mailtester.png`.
- One real Gmail message; **Show original** showing `SPF: pass`, `DKIM: pass`, `DMARC: pass` — `02-dns-headers.txt`.

**Verification**

```bash
dig +short TXT mail.example.com
dig +short TXT _dmarc.mail.example.com
# DKIM selector varies by provider, e.g.:
dig +short CNAME resend._domainkey.mail.example.com
```

**Pass / fail**

- **Pass:** all three records resolve, mail-tester ≥ 9/10, Gmail headers show all three `pass`.
- **Fail:** any record missing OR mail-tester < 9 OR any header `softfail` / `fail` / `none`.

**Rollback / fallback**

Use the provider's own sender domain (`noreply@yourbrand.resend.app`) until DNS verifies. Acceptable for late-stage soft launch only — **not** for full production.

---

## 3. Payment provider readiness

| Field | Value |
|---|---|
| **Owner** | Business owner |
| **Status** | ⬜ TODO |
| **Launch impact if incomplete** | No real payments settle; every checkout fails or routes to `MANUAL_REVIEW` |
| **Done** | ☐ |

**Steps** (per provider — finish at least one; full walk-throughs in `PAYMENT_LIVE_MODE_CHECKLIST.md`)

1. Complete KYC / business verification with PayMongo, Maya, or Xendit.
2. Switch the dashboard to **live mode** and copy the live API keys.
3. Set live keys in production env (`ENV_PRODUCTION_CHECKLIST.md`):
   - PayMongo: `PAYMONGO_SECRET_KEY=sk_live_…`, `PAYMONGO_PUBLIC_KEY=pk_live_…`
   - Maya: `MAYA_SECRET_KEY=…`, `MAYA_PUBLIC_KEY=…`
   - Xendit: `XENDIT_SECRET_KEY=…` (no `xnd_development`)
4. Set the live webhook URL on the provider dashboard:
   `https://yourdomain.example.com/api/payments/webhook/<provider>`
5. Copy the live webhook signing secret into `PAYMENT_WEBHOOK_SECRET` (≥32 chars).
6. Set `PAYMENT_PROVIDER_DEFAULT` to the chosen provider.
7. Run the **real low-value payment test** (see `REAL_PAYMENT_TEST_RECORD.md`).
8. Run the **refund test** (see `REAL_PAYMENT_TEST_RECORD.md`).

**Required evidence**

- Provider dashboard screenshot — live mode, webhook URL, secret rotated — `03-payment-dashboard.png`.
- Production preflight log — no `sk_test_` / `xnd_development` / `mock` errors — `03-payment-preflight.log`.
- Completed `REAL_PAYMENT_TEST_RECORD.md` row with order ID, provider reference, webhook event ID — `03-payment-test-record.pdf`.
- Refund reference — `03-payment-refund.png`.

**Verification**

```bash
# Preflight must exit 0 against the production env
LAUNCH_MODE=production node -e "import('./backend/dist/preflight.js').then(m=>m.runPreflight()).then(r=>{if(r.ok)process.exit(0);console.error(r);process.exit(1)})"

# Webhook endpoint reachable; signature gate live
curl -i -X POST https://yourdomain.example.com/api/payments/webhook/paymongo -d '{}'
# expect 401 "Invalid payment webhook signature"
```

**Pass / fail**

- **Pass:** preflight exit 0, real payment test PASS, refund test PASS, webhook reachable and rejects unsigned.
- **Fail:** any of the above missing.

**Rollback / fallback**

Set `PAYMENT_PROVIDER_DEFAULT=manual` (cash on delivery / bank transfer). Customers see manual instructions. Not recommended for full production.

---

## 4. Cron / background job — `expire-orders`

| Field | Value |
|---|---|
| **Owner** | Platform / DevOps owner |
| **Status** | ⬜ TODO |
| **Launch impact if incomplete** | Abandoned carts hold stock forever; inventory shows `inStock=0` for SKUs you physically have |
| **Done** | ☐ |

**Steps**

1. Schedule the command every **5 minutes** on your platform (recipes in `JOBS.md`).

   ```bash
   node backend/scripts/expire-orders.ts
   ```

2. The job is idempotent and protected by Postgres advisory lock (`withAdvisoryLock('expire:orders')`). Safe to run on multiple replicas — only one acquires the lock.
3. Configure a stale-cron alert: page on-call if no `cron.expire-orders complete` log line appears for **15 minutes**.

**Required evidence**

- Platform scheduler screenshot — job exists, schedule is `*/5 * * * *` (or platform equivalent) — `04-cron-schedule.png`.
- Last successful run log line — `cron.expire-orders complete` within the last 5 min — `04-cron-log.txt`.
- Stale-cron alert configuration screenshot — `04-cron-alert.png`.
- Manual proof run: created an unpaid order, set `paymentExpiresAt` to past, observed `EXPIRED` and stock returned — `04-cron-manual-proof.txt`.

**Verification**

```bash
# Tail the platform logs for the most recent run
your-platform logs --filter "cron.expire-orders" --since 10m
# Expect at least one "complete" line within the last 5 min

# Confirm advisory-lock behavior (run on a replica when one is already running)
node backend/scripts/expire-orders.ts
# Expect: "lock not acquired, another worker is running" and exit 0
```

**Pass / fail**

- **Pass:** scheduled, last run < 10 min ago, stale alert configured, manual proof captured.
- **Fail:** any of the above missing.

**Rollback / fallback**

Run manually every few minutes from a workstation:

```bash
NODE_ENV=production node backend/scripts/expire-orders.ts
```

Document start/stop in the incident channel. Not acceptable >2 h.

---

## 5. Monitoring and alerts

| Field | Value |
|---|---|
| **Owner** | Platform / DevOps owner |
| **Status** | ⬜ TODO |
| **Launch impact if incomplete** | You learn about outages from customer emails — hours after lost orders |
| **Done** | ☐ |

**Steps** (full alert matrix in `MONITORING_ALERTS_CHECKLIST.md`)

1. Create a Sentry project; copy DSN; set `SENTRY_DSN` in production env.
2. Sign up for an uptime monitor (UptimeRobot / BetterStack / Pingdom).
3. Add HTTP GET checks:
   - `/health` every **1 minute**
   - `/ready` every **5 minutes**
4. Wire alerts (page on-call):
   - first failure of `/health`
   - 3 consecutive failures of `/ready`
   - any unhandled error in `routes.ts`, `payment.service.ts`, `expireOrders.ts`
   - HTTP 5xx rate > 1% for 5 min
   - Database connection error
   - Webhook failure (HTTP 4xx/5xx from `/payments/webhook`)
   - `MANUAL_REVIEW` payment created
   - Failed admin login spike (≥10 failures / 5 min)
   - Stale cron (no `cron.expire-orders complete` in 15 min)
5. Test the alert channel end-to-end (PagerDuty / SMS / push).

**Required evidence**

- Sentry project screenshot showing test event received — `05-mon-sentry.png`.
- Uptime monitor screenshot — both checks green — `05-mon-uptime.png`.
- Alert-channel test screenshot (SMS / page received) — `05-mon-alert-test.png`.
- Each of the 9 alerts above configured — list of rule names — `05-mon-rules.txt`.

**Verification**

```bash
# Trigger a Sentry test event
# (any unhandled throw in a known-safe debug route, OR Sentry's "Send Test Event" button)
# Confirm event appears in inbox within 60 s.

# Trigger an uptime failure
# Pause the API for 90 s OR block the monitor's IP at the LB
# Confirm an alert fires.
```

**Pass / fail**

- **Pass:** Sentry receives test event, both uptime checks green, alert channel paged on test, all 9 rules exist.
- **Fail:** any of the above missing.

**Rollback / fallback**

If Sentry is down, ship logs to a file + use `your-platform logs --severity error --watch` as a temporary substitute. Not acceptable >24 h.

---

## Final gate

When all five rows above are ✅ DONE — and the evidence files exist in `ops/launch-evidence/<date>/` — proceed to `SOFT_LAUNCH_GO_NO_GO.md`.
