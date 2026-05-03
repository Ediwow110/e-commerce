# External Blockers — Soft Launch Gate

These are the **only** items between the current build (`2ee1553`, 74 tests green, code & infra readiness 9.5/10) and a green-light soft launch. None can be solved in code; each requires an external account, a human decision, or a DNS/legal action. Whole-system readiness stays 6/10 until every row below reads ✅ — see `FINAL_EXTERNAL_LAUNCH_TRACKER.md` for owner, evidence, verification command, and rollback per blocker.

**Update the Status column as you complete each item.** The launch is **not go** until every row reads ✅ DONE.

---

## Summary table

| # | Blocker | Owner | Status | Launch impact if skipped |
|---|---|---|---|---|
| 1 | Legal review of policy pages | Business owner / lawyer | ⬜ TODO | Legal exposure; customers shown placeholder text |
| 2 | Email DNS (SPF/DKIM/DMARC) | Whoever owns the domain DNS | ⬜ TODO | Verification + order emails go to spam or bounce |
| 3 | Payment-provider KYC + live keys | Business owner | ⬜ TODO | No real payments can be taken |
| 4 | Schedule the order-expiration cron | Platform / DevOps owner | ⬜ TODO | Stock stays held by abandoned orders forever |
| 5 | Sentry DSN + uptime monitoring | Platform / DevOps owner | ⬜ TODO | No visibility when the site breaks |

---

## 1. Legal review

**Owner:** Business owner / lawyer
**Status:** ⬜ TODO

**Action:**

1. Open `/terms`, `/privacy`, `/refunds`, `/shipping` in the running site.
2. For each page, read the placeholder text and replace it with text appropriate to the actual business — jurisdiction, return window, carrier names, refund timeline, data-controller name, support email.
3. Files to edit: `frontend/src/pages/Home.jsx` — search for `TermsPage`, `PrivacyPage`, `RefundsPage`, `ShippingPage`.
4. Remove the `REVIEW_BANNER` JSX block from each page once the lawyer signs off.
5. Update the "Last updated" date at the top of each page.

**Verify completion:**

- Visit each of the four pages in production. The yellow "REQUIRES LEGAL REVIEW" banner is **gone**.
- The "Last updated" date is today's date (or the day legal signed off).

**Launch impact if incomplete:** Customers see explicit "REQUIRES LEGAL REVIEW" warnings on legal pages. Refund / privacy / dispute claims become unenforceable and you may be operating in violation of consumer-protection law in your jurisdiction.

---

## 2. Email DNS (SPF / DKIM / DMARC)

**Owner:** Whoever controls the DNS for the sender domain (placeholder: `mail.example.com`)
**Status:** ⬜ TODO

**Action:** see `EMAIL_DELIVERABILITY.md` for the per-provider records. In short:

1. Pick the email provider (Resend, SendGrid, or Mailgun) — same one you set in `EMAIL_PROVIDER` and `EMAIL_FROM`.
2. In that provider's dashboard, add the sender domain (e.g. `mail.example.com`).
3. Provider will issue ~3 DNS records (1 SPF TXT, 1–2 DKIM CNAMEs, 1 DMARC TXT). Add them at your DNS host.
4. Wait for propagation (5 minutes – 24 hours), then click "Verify" in the provider dashboard.

**Verify completion:**

- Provider dashboard shows all three records as ✅ verified.
- Send a test email to a Gmail address. Open the message → "Show original" → confirm `SPF: pass`, `DKIM: pass`, `DMARC: pass`.
- Run `dig TXT mail.example.com` and `dig TXT _dmarc.mail.example.com` — records resolve.

**Launch impact if incomplete:** Verification emails, order confirmations, password resets, and 2FA setup messages will be classified as spam or rejected. New customers cannot complete signup, existing customers cannot recover their accounts.

---

## 3. Payment-provider KYC + live keys

**Owner:** Business owner (KYC is a business / banking process)
**Status:** ⬜ TODO

**Action:** see `PAYMENT_LIVE_MODE_CHECKLIST.md` for the per-provider walkthrough (PayMongo, Maya, Xendit). Per provider:

1. Complete KYC / business verification with the provider — typically requires business registration, valid IDs, and a settlement bank account.
2. In the provider dashboard, switch to **live mode** and copy the live API keys.
3. Set the live keys as production env vars (see `ENV_PRODUCTION_CHECKLIST.md`). Never paste them into the repo or anywhere committed.
4. Configure the live webhook URL to `https://yourdomain.example.com/api/payments/webhook`.
5. Copy the live webhook secret/signature key into the corresponding env var.

**Verify completion:**

- Boot-time preflight in `LAUNCH_MODE=production` does **not** error with `payment key is in test mode` for the providers you enabled.
- Real test payment from §8 of `LAUNCH_DAY_RUNBOOK.md` succeeds: provider dashboard says `paid`, admin shows `PAID`, webhook log shows `verified=true`.
- Refund of that test payment from the admin succeeds and reflects in the provider dashboard within 5 minutes.

**Launch impact if incomplete:** No real payments can be processed — every checkout will fail, fall back to `MANUAL_REVIEW`, or use test-mode money that never settles.

---

## 4. Schedule the order-expiration cron

**Owner:** Platform / DevOps owner
**Status:** ⬜ TODO

**Action:** see `JOBS.md` for platform-specific recipes (Linux cron, Replit Scheduled Deployments, Kubernetes CronJob).

The job to schedule:

```bash
node backend/scripts/expire-orders.ts
```

Recommended schedule: **every 5 minutes**. The job is idempotent and protected by a Postgres advisory lock — it is safe to run on multiple replicas; only one will do the work.

**Verify completion:**

- Platform shows the scheduled job exists and the last execution succeeded < 10 minutes ago.
- Manual proof: create an unpaid order, set its `expiresAt` to a past timestamp via the admin, wait one cron tick, confirm the order moved to `EXPIRED` and stock was returned.
- Logs contain `cron.expire-orders lock acquired` and `cron.expire-orders complete` lines.

**Launch impact if incomplete:** Customers who add items to their cart and abandon checkout permanently hold stock. Inventory shows `inStock=0` for SKUs that physically still have stock; revenue silently drops.

---

## 5. Sentry DSN + uptime monitoring

**Owner:** Platform / DevOps owner
**Status:** ⬜ TODO

**Action:** see `MONITORING_ALERTS_CHECKLIST.md` for the full alert matrix.

Minimum required:

1. Create a Sentry project (free tier is fine for soft launch). Copy the DSN.
2. Set `SENTRY_DSN` as a production env var (no need to redeploy if your platform supports hot-reload of env, otherwise restart).
3. Sign up for an uptime monitor (UptimeRobot, BetterStack, Pingdom, etc., free tier is fine).
4. Add two checks: HTTP GET `https://yourdomain.example.com/health` every 1 minute, HTTP GET `/ready` every 5 minutes.
5. Configure the monitor to alert your phone (SMS or push) on the first failure of `/health` and after 3 consecutive failures of `/ready`.

**Verify completion:**

- Trigger a test error in Sentry (any provider has a "send test event" button) — appears in the Sentry inbox within 60 seconds.
- Pause the API for a moment (or block the monitor's IP) and confirm the uptime monitor pages you within its expected detection window.

**Launch impact if incomplete:** When the site breaks, you will not know until a customer emails support — typically hours later, by which time you will have lost orders and trust.

---

## Final gate

When all five rows above are ✅ DONE, proceed to `LAUNCH_DAY_RUNBOOK.md` (and the operational tracker in `FINAL_EXTERNAL_LAUNCH_TRACKER.md`). Until then, whole-system readiness remains **6/10** (code & infra is 9.5/10), and the recommendation is **NO-GO** for real payments.
