# Launch Execution Plan

**Reference commit:** `22bf992` &nbsp;·&nbsp; **CI:** green &nbsp;·&nbsp; **Tests:** 74 passing &nbsp;·&nbsp; **Code blockers:** none &nbsp;·&nbsp; **Remaining blockers:** 5 external

This is the operator playbook for finishing the launch. Do these five blockers in order. Save every artefact under:

```
ops/launch-evidence/<YYYY-MM-DD>/
```

Use today's date for the folder. Every screenshot/file name below is exact — match it so the evidence packet is automatically complete.

> Companion docs: `LAUNCH_EVIDENCE_PACKET.md` (the spec), `REAL_PAYMENT_TEST_RECORD.md` (the form to fill), `SOFT_LAUNCH_GO_NO_GO.md` (the sign-off sheet), `FIRST_10_CUSTOMERS_RUNBOOK.md` (the live runbook), `FULL_PRODUCTION_PROMOTION_CHECKLIST.md` (after the soft launch).

---

## Blocker 1 — Legal review of policy pages

**Owner:** Business owner (and your lawyer)
**Blocks soft launch?** **YES**

### Steps

1. Email the lawyer with the four URLs:
   - `https://yourdomain.example.com/terms`
   - `https://yourdomain.example.com/privacy`
   - `https://yourdomain.example.com/refunds`
   - `https://yourdomain.example.com/shipping`
2. Provide jurisdiction, return window, carrier list, refund timeline, data-controller name, support email.
3. Apply the lawyer's edits in `frontend/src/pages/Home.jsx`. Search for `TermsPage`, `PrivacyPage`, `RefundsPage`, `ShippingPage`.
4. Remove the `REVIEW_BANNER` JSX block from each of the four sections.
5. Update the `Last updated` date at the top of each page to the sign-off date.
6. Re-deploy the frontend.

### Where to record evidence

`ops/launch-evidence/<YYYY-MM-DD>/`

| File | What to capture |
|---|---|
| `01-legal-approval.pdf` | Lawyer's signed approval (email PDF or letter) |
| `01-legal-terms.png` | Live `/terms` page screenshot, no yellow banner, URL bar visible |
| `01-legal-privacy.png` | Live `/privacy` page screenshot, no yellow banner |
| `01-legal-refunds.png` | Live `/refunds` page screenshot, no yellow banner |
| `01-legal-shipping.png` | Live `/shipping` page screenshot, no yellow banner |
| `01-legal-banner-grep.txt` | Output of the verification grep below |

### Verification

```bash
# Local source check (must print 0)
grep -c "REVIEW_BANNER" frontend/src/pages/Home.jsx > ops/launch-evidence/<YYYY-MM-DD>/01-legal-banner-grep.txt

# Live runtime check (all four must print 0)
for p in terms privacy refunds shipping; do
  printf "%s: " "$p"
  curl -s "https://yourdomain.example.com/$p" | grep -ci "REQUIRES LEGAL REVIEW"
done | tee -a ops/launch-evidence/<YYYY-MM-DD>/01-legal-banner-grep.txt
```

### Pass / fail

- **Pass:** all 5 grep counts return 0 AND signed approval is filed.
- **Fail:** any count > 0 OR no signed approval.

### If it fails

- If grep > 0: the deploy didn't update or you missed a banner. Re-check `Home.jsx`, redeploy, re-screenshot.
- If no approval: hold the launch — see `LAUNCH_EVIDENCE_PACKET.md` Blocker 1 fallback (closed invite-only soft launch under written customer consent only).

---

## Blocker 2 — Email DNS (SPF / DKIM / DMARC)

**Owner:** Whoever controls DNS for the sender domain (placeholder: `mail.example.com`)
**Blocks soft launch?** **YES**

### Steps

1. Pick the email provider (Resend / SendGrid / Mailgun) — same one set in `MAIL_PROVIDER` and `EMAIL_FROM`.
2. **Provider dashboard → Domains → Add domain.** Enter your sender domain.
3. Provider issues ~3 records (1 SPF TXT, 1–2 DKIM CNAMEs, 1 DMARC TXT). Copy them.
4. **DNS host (Cloudflare / Route53 / Namecheap / etc.) → DNS records → Add record.** Add each issued record exactly as the provider shows.
5. Wait 5 min – 24 h for propagation.
6. **Provider dashboard → Verify.** All three records must turn ✅.
7. Set `MAIL_PROVIDER=<chosen>` and `EMAIL_FROM=<verified sender>` in production env.
8. Set `SUPPORT_EMAIL` to a mailbox a human reads.

### Where to record evidence

| File | What to capture |
|---|---|
| `02-dns-provider.png` | Provider dashboard with all three records ✅ verified |
| `02-dns-dig.txt` | Output of the `dig` commands below |
| `02-dns-mailtester.png` | mail-tester.com result page showing ≥ 9 / 10 |
| `02-dns-headers.txt` | Gmail "Show original" headers showing SPF/DKIM/DMARC = pass |

### Verification

```bash
{
  echo "== SPF =="
  dig +short TXT mail.example.com
  echo "== DMARC =="
  dig +short TXT _dmarc.mail.example.com
  echo "== DKIM (selector varies) =="
  dig +short CNAME resend._domainkey.mail.example.com
} | tee ops/launch-evidence/<YYYY-MM-DD>/02-dns-dig.txt
```

Then send a test message:

1. From the provider dashboard, send a test message to a fresh Gmail address.
2. Open the message → **Show original**.
3. Confirm `SPF: pass`, `DKIM: pass`, `DMARC: pass`. Save the page as `02-dns-headers.txt`.
4. Use `mail-tester.com`: get the unique address, send a test from your provider, capture the result page.

### Pass / fail

- **Pass:** all three records resolve in dig, mail-tester ≥ 9/10, Gmail headers show all three `pass`.
- **Fail:** any record missing OR mail-tester < 9 OR any header is `none`/`softfail`/`fail`.

### If it fails

- Records not propagating: wait longer (some hosts take up to 24 h), then re-verify. Lower TTL if possible.
- DKIM fail: confirm the selector matches what the provider expects.
- DMARC fail: start with `p=none`; once SPF + DKIM pass, raise to `p=quarantine` or `p=reject`.
- Fallback (late soft launch only): use the provider's own sender domain (`noreply@yourbrand.resend.app`). Not acceptable for full production.

---

## Blocker 3 — Payment KYC + live keys + real payment + refund

**Owner:** Business owner
**Blocks soft launch?** **YES**

### Steps

1. **Provider dashboard (PayMongo / Maya / Xendit) → KYC.** Submit business registration, valid IDs, settlement bank account. Wait for approval (often a few business days).
2. **Provider dashboard → Switch to Live Mode.** Copy the live API keys.
3. Set live keys in production env. Use your secret manager — never paste into chat or commit:
   - PayMongo: `PAYMONGO_SECRET_KEY=sk_live_…`, `PAYMONGO_PUBLIC_KEY=pk_live_…`
   - Maya: `MAYA_SECRET_KEY=…`, `MAYA_PUBLIC_KEY=…`
   - Xendit: `XENDIT_SECRET_KEY=…` (must NOT contain `xnd_development`)
4. **Provider dashboard → Webhooks → Add endpoint.** Set URL to `https://yourdomain.example.com/api/payments/webhook/<provider>`.
5. Copy the webhook signing secret into `PAYMENT_WEBHOOK_SECRET` (≥32 chars).
6. Set `PAYMENT_PROVIDER_DEFAULT=<chosen>` in production env.
7. Restart / redeploy backend so preflight runs against the new env.
8. Run the **real low-value payment test**: open `REAL_PAYMENT_TEST_RECORD.md` Section A. Place a real order with a real card for the smallest possible amount (e.g. PHP 20). Fill every field.
9. Run the **refund test**: complete `REAL_PAYMENT_TEST_RECORD.md` Section B from the admin (must be 2FA-authenticated). Fill every field.
10. Reconcile in `REAL_PAYMENT_TEST_RECORD.md` Section C.

### Where to record evidence

| File | What to capture |
|---|---|
| `03-payment-dashboard.png` | Provider dashboard: live mode active, webhook URL configured, secret rotated |
| `03-payment-preflight.log` | Production preflight log on boot — no `sk_test_` / `xnd_development` / `mock` errors |
| `REAL_PAYMENT_TEST_RECORD.md` (filled, signed) | Sections A, B, C complete with order ID, provider reference, webhook event ID |
| `03-payment-refund.png` | Provider dashboard refund row with reference ID |

### Verification

```bash
# Preflight against the production env (must exit 0)
LAUNCH_MODE=production node -e \
  "import('./backend/dist/preflight.js').then(m=>m.runPreflight()).then(r=>{if(r.ok)process.exit(0);console.error(r);process.exit(1)})" \
  | tee ops/launch-evidence/<YYYY-MM-DD>/03-payment-preflight.log

# Webhook endpoint is reachable and the signature gate works
curl -i -X POST https://yourdomain.example.com/api/payments/webhook/paymongo -d '{}'
# Expect HTTP 401 with body "Invalid payment webhook signature"
```

### Pass / fail

- **Pass:** preflight exit 0, real payment test PASS, refund test PASS, webhook endpoint reachable and rejects unsigned payloads with 401.
- **Fail:** any of the above missing or wrong.

### If it fails

- Preflight still flags `sk_test_` or `xnd_development` → the env still holds sandbox keys. Re-set in your secret manager and restart.
- Real payment fails at provider → fix the integration in the provider dashboard before touching code. If the provider rejects the card, retry with a different card.
- Webhook never arrives → check provider dashboard webhook delivery log; confirm endpoint URL is HTTPS and reachable from the internet.
- Refund fails → check the admin user has 2FA enabled and the role has `payment.refund` permission. **Do NOT proceed to soft launch.**
- Fallback: set `PAYMENT_PROVIDER_DEFAULT=manual` (cash on delivery / bank transfer). See `RUNBOOK.md`.

---

## Blocker 4 — `expire-orders` cron scheduled every 5 minutes

**Owner:** Platform / DevOps owner
**Blocks soft launch?** **YES**

### Steps

1. **Pick the platform.** Pick the recipe in `JOBS.md` matching your hosting (Linux cron / Replit Scheduled Deployments / Kubernetes CronJob / Render cron / etc.).
2. **Create the scheduled job** with command:

   ```bash
   node backend/scripts/expire-orders.ts
   ```

   Schedule: every **5 minutes** (`*/5 * * * *` for cron-syntax platforms).
3. The job is idempotent and protected by a Postgres advisory lock (`withAdvisoryLock('expire:orders')`). Safe on multiple replicas — only one acquires the lock per tick.
4. **Configure a stale-cron alert** in your monitoring tool: page on-call if no `cron.expire-orders complete` log line appears for **15 minutes**.
5. Wait one tick (5 min) and confirm the first successful run logs `cron.expire-orders complete`.

### Where to record evidence

| File | What to capture |
|---|---|
| `04-cron-schedule.png` | Platform scheduler screen: job exists, schedule = `*/5 * * * *` (or platform equivalent) |
| `04-cron-log.txt` | Tail of the most recent run logs containing `cron.expire-orders lock acquired` and `cron.expire-orders complete` |
| `04-cron-alert.png` | Monitoring tool screen showing the stale-cron alert rule |
| `04-cron-manual-proof.txt` | Output of the manual proof below |

### Verification

```bash
# Tail the platform logs for the most recent run
your-platform logs --filter "cron.expire-orders" --since 10m \
  | tee ops/launch-evidence/<YYYY-MM-DD>/04-cron-log.txt
# Expect at least one "cron.expire-orders complete" within the last 5 min

# Manual proof: create an unpaid order, expire it, observe stock restore
# (Run from a console with DATABASE_URL pointing at production)
psql "$DATABASE_URL" -c "
  -- pick any unpaid test order
  SELECT id, \"orderNumber\", status, \"paymentExpiresAt\", \"stockRestoredAt\"
  FROM \"Order\" WHERE \"paymentStatus\" = 'UNPAID' LIMIT 5;
" | tee -a ops/launch-evidence/<YYYY-MM-DD>/04-cron-manual-proof.txt
```

For the manual proof, set one test order's `paymentExpiresAt` to a past timestamp (in admin or via SQL on a test order), wait one tick, then re-query and confirm `status='EXPIRED'` and `stockRestoredAt IS NOT NULL`. Append the result to `04-cron-manual-proof.txt`.

### Pass / fail

- **Pass:** scheduler shows the job, last run < 10 min ago with `complete` line, stale-cron alert exists, manual proof captured.
- **Fail:** any of the above missing.

### If it fails

- Job not running: check the platform's job logs for an error (likely missing env var or DB unreachable).
- Lock contention: that's normal — the second runner just exits. Confirm the *first* one completed.
- No `complete` line: increase log verbosity or check for a thrown exception in the job.
- Fallback: run manually every few minutes from a workstation, document start/stop in incident channel. Not acceptable >2 h.

---

## Blocker 5 — Sentry + uptime monitoring + alerts

**Owner:** Platform / DevOps owner
**Blocks soft launch?** **YES**

### Steps

1. **Sentry → Create Project (Node.js).** Copy the DSN.
2. Set `SENTRY_DSN=<copied>` in production env.
3. Restart backend; Sentry SDK initialises on boot.
4. **Sentry → Send a test event** (or trigger a known-safe error). Confirm event appears in inbox within 60 s.
5. **Uptime monitor (UptimeRobot / BetterStack / Pingdom).** Add two checks:
   - HTTP GET `https://yourdomain.example.com/health` every **1 min**
   - HTTP GET `https://yourdomain.example.com/ready` every **5 min**
6. **Configure alerts** (page the on-call). Wire all 9 rules:

   | # | Rule |
   |---|---|
   | 1 | First failure of `/health` |
   | 2 | 3 consecutive failures of `/ready` |
   | 3 | Any unhandled error in `routes.ts`, `payment.service.ts`, `expireOrders.ts` |
   | 4 | HTTP 5xx rate > 1% over 5 min |
   | 5 | Database connection error |
   | 6 | Webhook failure (HTTP 4xx/5xx from `/payments/webhook`) |
   | 7 | `MANUAL_REVIEW` payment created |
   | 8 | Failed admin login spike (≥10 failures / 5 min) |
   | 9 | Stale cron (no `cron.expire-orders complete` in 15 min) |

7. **Test the alert channel** end-to-end (PagerDuty SMS / push / Slack page). Confirm receipt on the on-call phone.

### Where to record evidence

| File | What to capture |
|---|---|
| `05-mon-sentry.png` | Sentry inbox showing the test event |
| `05-mon-uptime.png` | Uptime monitor dashboard with both checks ✅ |
| `05-mon-alert-test.png` | Phone / pager / Slack screenshot of the alert delivery |
| `05-mon-rules.txt` | Plain-text list of the 9 rule names + the tool they live in |

### Verification

```bash
# Health endpoint
curl -i https://yourdomain.example.com/health
# Expect HTTP 200 with body {"ok":true,...}

# Readiness endpoint
curl -i https://yourdomain.example.com/ready
# Expect HTTP 200 (DB reachable, migrations applied)
```

For the alert test: pause the API for 90 s OR block the monitor's IP at the LB OR hit a known-throw debug route — confirm an alert fires within the configured window.

### Pass / fail

- **Pass:** Sentry receives test event, both uptime checks green, alert channel paged on the test, all 9 rules exist.
- **Fail:** any of the above missing.

### If it fails

- Sentry test event not arriving: verify `SENTRY_DSN` is set in production env (not just local), restart, send another event.
- Uptime check failing immediately: confirm DNS, TLS cert, and that the proxy is forwarding to backend.
- Alert not firing on test: check the rule's threshold and the channel routing in the monitoring tool.

---

## Final master checklist

Tick each item only when its evidence file exists at `ops/launch-evidence/<YYYY-MM-DD>/`.

```
[ ] Legal reviewed and banners removed                 (01-legal-approval.pdf + 01-legal-{terms,privacy,refunds,shipping}.png + 01-legal-banner-grep.txt = "0")
[ ] SPF passes                                         (02-dns-dig.txt + 02-dns-headers.txt)
[ ] DKIM passes                                        (02-dns-dig.txt + 02-dns-headers.txt)
[ ] DMARC passes                                       (02-dns-dig.txt + 02-dns-headers.txt)
[ ] Mail-tester score >= 9/10                          (02-dns-mailtester.png)
[ ] Payment KYC complete                               (03-payment-dashboard.png shows live mode)
[ ] Live keys configured                               (03-payment-preflight.log shows no sandbox-key error)
[ ] Live webhook configured                            (03-payment-dashboard.png shows webhook URL + secret rotated)
[ ] Low-value live payment passed                      (REAL_PAYMENT_TEST_RECORD.md Section A = PASS)
[ ] Refund test passed                                 (REAL_PAYMENT_TEST_RECORD.md Section B = PASS + 03-payment-refund.png)
[ ] expire-orders cron scheduled every 5 minutes       (04-cron-schedule.png)
[ ] Cron ran successfully within last 5 minutes        (04-cron-log.txt has "cron.expire-orders complete" with recent timestamp)
[ ] Stale cron alert configured                        (04-cron-alert.png)
[ ] Sentry test event received                         (05-mon-sentry.png)
[ ] /health uptime monitor green                       (05-mon-uptime.png)
[ ] /ready uptime monitor green                        (05-mon-uptime.png)
[ ] Alert test received                                (05-mon-alert-test.png)
[ ] SOFT_LAUNCH_GO_NO_GO.md signed by all required approvers   (signed PDF in evidence folder)
```

> **Do not tick a row unless its evidence file exists.** No verbal confirmations, no "we'll do it tomorrow" — every tick maps to a file in the evidence folder.

---

## Current status, missing evidence, next action

| Item | Value |
|---|---|
| **Current launch decision** | ⛔ **NO-GO** for real payments — all 5 external blockers are still ⬜ TODO |
| **CI on `22bf992`** | ✅ green (CI + secret scan) |
| **Code blockers** | 0 |
| **Evidence still missing** | All 18 ticks above (no evidence file currently exists in `ops/launch-evidence/`) |
| **Soft launch** | ⛔ **NO-GO** until all 18 ticks are complete and `SOFT_LAUNCH_GO_NO_GO.md` is signed |
| **Full production** | ⛔ **NO-GO** until ≥ 24 h (target 72 h) of clean soft-launch operations per `FULL_PRODUCTION_PROMOTION_CHECKLIST.md` |

### Next single action

**Send the four legal page URLs to your lawyer for review** (Blocker 1, step 1 above). Legal review usually has the longest external lead time, so it should start first while you, in parallel, file payment KYC (Blocker 3, step 1) and the DNS owner adds SPF/DKIM/DMARC records (Blocker 2). Cron (Blocker 4) and monitoring (Blocker 5) are the fastest — DevOps can finish them in a few hours once everything else is on track.
