# Monitoring & Alert Execution Packet

Operational steps to make outages wake the on-call instead of the customer. Owner: platform / DevOps owner. Backup: technical owner.

---

## 1. Sentry

### 1.1 Setup

1. Sentry → **Projects → Create project → Node.js**.
2. Copy DSN.
3. Set `SENTRY_DSN=<dsn>` in production env.
4. Restart backend; the SDK initialises on boot.

### 1.2 Test event

1. Sentry project → **Issues → Send test event**.
2. Confirm event appears within 60 s.
3. Screenshot the inbox showing the test event → `05-mon-sentry.png` (redact DSN).

---

## 2. Uptime monitors

| Endpoint | Frequency | Expected |
|---|---|---|
| `/health` | every 1 min | HTTP 200, body `{"ok":true,...}` |
| `/ready` | every 5 min | HTTP 200 (DB reachable, migrations applied) |

Use UptimeRobot, BetterStack, Pingdom, or Datadog Synthetics. Both must be ✅ before launch.

Screenshot dashboard with both ✅ → `05-mon-uptime.png`.

---

## 3. Alert channel test

1. Wire alerts to a real channel: PagerDuty / Opsgenie / SMS / Slack on-call channel with @here that page the on-call phone.
2. Trigger one test alert (use the monitoring tool's "Send test alert" button OR pause the API for 90 s OR block the monitor's IP at the LB).
3. Confirm the on-call phone received the page within the SLA window.
4. Screenshot the page delivery → `05-mon-alert-test.png` (redact phone number).

---

## 4. The 9 alert rules

For each rule below, fill the row in your monitoring tool. After all are wired, export the names list to `05-mon-rules.txt`.

### 4.1 `/health` first failure

| | |
|---|---|
| Signal | HTTP non-200 from `/health` |
| Threshold | first failure |
| Destination | on-call pager (P1) |
| Owner | platform |
| Test method | pause API 90 s |
| Evidence | `05-mon-uptime.png` shows red event + `05-mon-alert-test.png` |
| Remediation | Restart service; check `RUNBOOK.md` |

### 4.2 `/ready` 3 consecutive failures

| | |
|---|---|
| Signal | HTTP non-200 from `/ready` ×3 |
| Threshold | 3 in 15 min window |
| Destination | on-call pager (P1) |
| Owner | platform |
| Test method | block DB temporarily on a staging clone |
| Evidence | `05-mon-uptime.png` |
| Remediation | Check DB connectivity, run migrations, see `RUNBOOK.md` |

### 4.3 Unhandled error in critical paths

| | |
|---|---|
| Signal | Sentry issue tagged `routes.ts`, `payment.service.ts`, or `expireOrders.ts` |
| Threshold | first occurrence in production |
| Destination | on-call pager (P1) |
| Owner | technical owner |
| Test method | trigger known-safe debug error |
| Evidence | Sentry rule screenshot |
| Remediation | Triage in Sentry; hotfix or rollback per severity |

### 4.4 HTTP 5xx > 1% / 5 min

| | |
|---|---|
| Signal | 5xx rate > 1% in 5-min window |
| Threshold | 1% sustained 5 min |
| Destination | on-call pager (P1) |
| Owner | platform |
| Test method | trigger 5xx via debug route |
| Evidence | rule screenshot |
| Remediation | Investigate, scale, rollback per severity |

### 4.5 Database connection error

| | |
|---|---|
| Signal | `ECONNREFUSED` / `ETIMEDOUT` to `DATABASE_URL` host |
| Threshold | first occurrence |
| Destination | on-call pager (P0) |
| Owner | platform |
| Test method | DB host firewall test on staging |
| Evidence | rule screenshot |
| Remediation | Failover; restore DB; see `RUNBOOK.md` |

### 4.6 Webhook failure

| | |
|---|---|
| Signal | HTTP 4xx/5xx response from `/api/payments/webhook/*` |
| Threshold | any in 5 min |
| Destination | on-call pager (P1) + payments owner |
| Owner | technical + payments |
| Test method | replay malformed signature on staging |
| Evidence | rule screenshot |
| Remediation | Inspect provider dashboard; rotate secret if needed |

### 4.7 `MANUAL_REVIEW` payment created

| | |
|---|---|
| Signal | `Payment` row inserted with status `MANUAL_REVIEW` |
| Threshold | first occurrence |
| Destination | payments owner + business owner |
| Owner | payments |
| Test method | force a flagged provider response on staging |
| Evidence | rule screenshot |
| Remediation | Inspect order; reconcile with provider; resolve to PAID or REFUNDED within 30 min |

### 4.8 Failed admin login spike

| | |
|---|---|
| Signal | `/api/auth/login` for admin role returning 401 |
| Threshold | ≥ 10 failures in 5 min |
| Destination | security on-call (P1) |
| Owner | security |
| Test method | repeated bad-password attempts on staging |
| Evidence | rule screenshot |
| Remediation | Identify source IP; block at WAF/LB; rotate admin creds if compromise suspected |

### 4.9 Stale cron

| | |
|---|---|
| Signal | absence of `cron.expire-orders complete` log line |
| Threshold | 15 min |
| Destination | platform on-call (P1) |
| Owner | platform |
| Test method | pause cron on staging |
| Evidence | `04-cron-alert.png` |
| Remediation | Restart cron; run manually until restored; see `CRON_EXECUTION_PACKET.md` §1 |

### 4.10 Dependency / security alert (continuous)

| | |
|---|---|
| Signal | GitHub Dependabot / npm audit high or critical |
| Threshold | any open high+ |
| Destination | technical owner (email) |
| Owner | technical |
| Test method | introduce known-vulnerable dep on a branch |
| Evidence | weekly review |
| Remediation | Patch within 7 days for high, 24h for critical |

---

## 5. Pass / fail

- **Pass:** Sentry receives test event, both uptime monitors green, alert channel paged on test, all 9 rules wired and named in `05-mon-rules.txt`.
- **Fail:** any of the above missing.

## 6. Evidence filenames

| File | Classification |
|---|---|
| `05-mon-sentry.png` | SAFE TO COMMIT REDACTED |
| `05-mon-uptime.png` | SAFE TO COMMIT REDACTED |
| `05-mon-alert-test.png` | SAFE TO COMMIT REDACTED (redact phone number) |
| `05-mon-rules.txt` | SAFE TO COMMIT RAW (rule names only) |
