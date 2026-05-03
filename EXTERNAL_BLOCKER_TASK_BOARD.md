# External Blocker Task Board

Operational tracker for the five remaining external launch blockers. One row = one task. Owners update this file as work progresses.

**Status model:** `TODO` → `IN_PROGRESS` → `BLOCKED` → `EVIDENCE_COLLECTED` → `REDACTED` → `VERIFIED` → `DONE`

> A blocker reaches **DONE** only when the evidence is filed in `SANITIZED_LAUNCH_EVIDENCE_INDEX.md` and verified by a second reviewer.

---

## Blocker 1 — Legal review

| Field | Value |
|---|---|
| Owner | Business owner |
| Backup owner | Technical owner |
| Status | `TODO` |
| Due date | `____________________` |
| Dependency | None |

**Steps**

1. Send `/terms`, `/privacy`, `/refunds`, `/shipping` URLs and the business-info packet (see `LEGAL_LAUNCH_PACKET.md`) to the lawyer.
2. Apply edits to `frontend/src/pages/Home.jsx`.
3. Remove `REVIEW_BANNER` from each section.
4. Update `Last updated` dates.
5. Re-deploy frontend.

**Evidence required:** `01-legal-approval.pdf`, `01-legal-{terms,privacy,refunds,shipping}.png`, `01-legal-banner-grep.txt`
**Private evidence location:** `PRIVATE_LOCATION_PLACEHOLDER`
**Sanitized evidence location:** `ops/launch-evidence/<YYYY-MM-DD>/01-legal-*` (per `EVIDENCE_SECURITY_POLICY.md`)
**Verification command:** `grep -c "REVIEW_BANNER" frontend/src/pages/Home.jsx` → must print `0`
**Pass/fail rule:** PASS = grep is `0` AND signed approval is filed AND four screenshots show no yellow banner.
**Escalation rule:** No lawyer reply in 5 business days → escalate to business owner; consider a second-opinion lawyer.
**Launch impact:** Refund / privacy / dispute claims unenforceable; consumer-protection violation risk.
**Done:** ☐

---

## Blocker 2 — Email DNS / deliverability

| Field | Value |
|---|---|
| Owner | DNS owner for sender domain |
| Backup owner | Technical owner |
| Status | `TODO` |
| Due date | `____________________` |
| Dependency | Email provider account exists |

**Steps**

1. Provider dashboard → add sender domain.
2. Add SPF (TXT), DKIM (CNAME ×1–2), DMARC (TXT) at DNS host.
3. Wait for propagation; click Verify.
4. Set `MAIL_PROVIDER`, `EMAIL_FROM`, `SUPPORT_EMAIL` in production env.

**Evidence required:** `02-dns-provider.png`, `02-dns-dig.txt`, `02-dns-mailtester.png`, `02-dns-headers.txt`
**Private evidence location:** `PRIVATE_LOCATION_PLACEHOLDER` (provider dashboard, raw mail-tester URL)
**Sanitized evidence location:** `ops/launch-evidence/<YYYY-MM-DD>/02-dns-*`
**Verification command:**
```bash
dig +short TXT mail.example.com
dig +short TXT _dmarc.mail.example.com
dig +short CNAME <selector>._domainkey.mail.example.com
```
**Pass/fail rule:** PASS = all 3 records resolve, mail-tester ≥ 9/10, Gmail headers all `pass`.
**Escalation rule:** Records not propagated after 24 h → escalate to DNS host support; check TTL.
**Launch impact:** Customer verification / order / 2FA / password-reset emails go to spam or bounce.
**Done:** ☐

---

## Blocker 3 — Payment KYC + live keys + live test + refund

| Field | Value |
|---|---|
| Owner | Business owner |
| Backup owner | Technical owner |
| Status | `TODO` |
| Due date | `____________________` |
| Dependency | Bank account ready for settlement; business documents available |

**Steps**

1. Provider dashboard → complete KYC.
2. Switch to live mode; copy live keys.
3. Set live keys + `PAYMENT_WEBHOOK_SECRET` + `PAYMENT_PROVIDER_DEFAULT` in production env.
4. Configure live webhook URL on provider dashboard.
5. Restart backend; preflight passes.
6. Run real low-value payment test (`REAL_PAYMENT_TEST_RECORD.md` Section A).
7. Run refund test (Section B).
8. Reconcile (Section C).

**Evidence required:** `03-payment-dashboard.png`, `03-payment-preflight.log`, completed `REAL_PAYMENT_TEST_RECORD.md`, `03-payment-refund.png`
**Private evidence location:** `PRIVATE_LOCATION_PLACEHOLDER` (originals always private — contain customer PII / keys)
**Sanitized evidence location:** `ops/launch-evidence/<YYYY-MM-DD>/03-payment-preflight.log` (redacted) + summary rows in `SANITIZED_LAUNCH_EVIDENCE_INDEX.md`
**Verification command:**
```bash
LAUNCH_MODE=production node -e "import('./backend/dist/preflight.js').then(m=>m.runPreflight()).then(r=>{if(r.ok)process.exit(0);console.error(r);process.exit(1)})"
curl -i -X POST https://yourdomain.example.com/api/payments/webhook/<provider> -d '{}'  # expect 401
```
**Pass/fail rule:** PASS = preflight exit 0 AND payment test PASS AND refund test PASS AND webhook 401-on-unsigned.
**Escalation rule:** KYC stuck > 5 business days → escalate to provider account manager. Refund test FAIL → halt entire launch.
**Launch impact:** No real payments settle; checkout fails or routes to `MANUAL_REVIEW`.
**Done:** ☐

---

## Blocker 4 — `expire-orders` cron

| Field | Value |
|---|---|
| Owner | Platform / DevOps owner |
| Backup owner | Technical owner |
| Status | `TODO` |
| Due date | `____________________` |
| Dependency | Backend deployed in production; DB reachable |

**Steps**

1. Pick scheduler (Render / Railway / Fly / VPS / GH Actions); see `CRON_EXECUTION_PACKET.md`.
2. Schedule `node backend/scripts/expire-orders.ts` every 5 min.
3. Configure stale-cron alert (no `cron.expire-orders complete` in 15 min).
4. Wait one tick; confirm log line.
5. Run manual proof (test order with past `paymentExpiresAt`).

**Evidence required:** `04-cron-schedule.png`, `04-cron-log.txt`, `04-cron-alert.png`, `04-cron-manual-proof.txt`
**Private evidence location:** `PRIVATE_LOCATION_PLACEHOLDER`
**Sanitized evidence location:** `ops/launch-evidence/<YYYY-MM-DD>/04-cron-*`
**Verification command:**
```bash
your-platform logs --filter "cron.expire-orders" --since 10m
```
**Pass/fail rule:** PASS = scheduler shows job, last run < 10 min ago, alert configured, manual proof shows `EXPIRED` + `stockRestoredAt`.
**Escalation rule:** Cron silent > 15 min → page on-call; switch to manual every-5-min runs from a workstation as fallback.
**Launch impact:** Abandoned carts hold stock forever; SKUs show `inStock=0` while physical stock exists.
**Done:** ☐

---

## Blocker 5 — Sentry + uptime + alerts

| Field | Value |
|---|---|
| Owner | Platform / DevOps owner |
| Backup owner | Technical owner |
| Status | `TODO` |
| Due date | `____________________` |
| Dependency | Backend deployed in production; on-call rotation defined |

**Steps**

1. Create Sentry project; set `SENTRY_DSN`; restart backend.
2. Send Sentry test event.
3. Configure uptime monitors: `/health` 1-min, `/ready` 5-min.
4. Wire 9 alert rules (see `MONITORING_EXECUTION_PACKET.md`).
5. Test alert channel end-to-end.

**Evidence required:** `05-mon-sentry.png`, `05-mon-uptime.png`, `05-mon-alert-test.png`, `05-mon-rules.txt`
**Private evidence location:** `PRIVATE_LOCATION_PLACEHOLDER`
**Sanitized evidence location:** `ops/launch-evidence/<YYYY-MM-DD>/05-mon-*`
**Verification command:**
```bash
curl -i https://yourdomain.example.com/health
curl -i https://yourdomain.example.com/ready
```
**Pass/fail rule:** PASS = Sentry test event received AND both monitors green AND alert paged on test AND 9 rules wired.
**Escalation rule:** No alert delivery on test → fix before any other launch step. Outages must wake the on-call; if not, the gate fails.
**Launch impact:** You learn about outages from customer complaints — hours after lost orders.
**Done:** ☐

---

## Aggregate

- [ ] Blocker 1 DONE
- [ ] Blocker 2 DONE
- [ ] Blocker 3 DONE
- [ ] Blocker 4 DONE
- [ ] Blocker 5 DONE
- [ ] All five rows in `SANITIZED_LAUNCH_EVIDENCE_INDEX.md` show PASS
- [ ] `SOFT_LAUNCH_GO_NO_GO.signed.pdf` filed
