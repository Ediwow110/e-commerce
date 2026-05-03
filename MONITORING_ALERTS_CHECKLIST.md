# Monitoring & Alerts Checklist

Every alert below must be configured **before** launch. The system is designed to fail loudly; if you skip these, the failures will stay quiet until customers complain.

Recommended stack (any equivalents work): **Sentry** for errors and traces, **UptimeRobot / BetterStack / Pingdom** for HTTP uptime, **Slack / PagerDuty / SMS** for alert delivery. The platform-native log search (e.g. your hosting platform's "logs explorer") covers the log-based alerts.

---

## 1. Sentry setup

- [ ] Create a Sentry project of platform = **Node.js** (backend) and **React** (frontend).
- [ ] Copy the backend DSN → set as production env `SENTRY_DSN`.
- [ ] Copy the frontend DSN → set as build-time env `VITE_SENTRY_DSN` (or your equivalent).
- [ ] Set `SENTRY_ENVIRONMENT=production` and `SENTRY_TRACES_SAMPLE_RATE=0.1` (10% performance sampling — adjust later).
- [ ] In Sentry → Project Settings → **Alerts**, create:
  - "New issue" → notify Slack channel #alerts on **first occurrence** of any error.
  - "Issue frequency" → notify on `>50 events / 1 hour` for any single issue.
  - "Spike protection" → enable.
- [ ] Verify by triggering a test event (Sentry has a "Send test event" button in Project Settings → Client Keys).

**Acceptance:** test event arrives in your Sentry inbox **and** in your Slack channel within 60 seconds.

---

## 2. Uptime monitor — `/health` (liveness)

This is the most important alert. `/health` answers "is the process up at all?"

- [ ] Add HTTP GET monitor for `https://yourdomain.example.com/health`.
- [ ] Frequency: every **1 minute**.
- [ ] Expected status: `200`.
- [ ] Expected response body contains: `"ok":true`.
- [ ] Alert on: **first** failure.
- [ ] Notification channel: **phone (SMS or push) + Slack #alerts**.
- [ ] Add monitor from at least **two geographic regions** so you can distinguish a real outage from a regional network glitch.

**Acceptance:** stop the API container for 90 seconds — phone alert fires within 2 minutes.

---

## 3. Readiness monitor — `/ready`

`/ready` answers "can the process actually serve a request?" — it checks DB connectivity, Redis if used, and that the boot preflight passed.

- [ ] HTTP GET `https://yourdomain.example.com/ready`.
- [ ] Frequency: every **5 minutes**.
- [ ] Expected status: `200`.
- [ ] Expected body contains: `"ready":true`.
- [ ] Alert after **3 consecutive failures** (so a one-off DB blip doesn't page you).
- [ ] Notification: Slack first, phone after **15 minutes** if still failing.

**Acceptance:** kill the DB connection (or stop the DB) for 16 minutes — Slack notice within 15 minutes, phone after.

---

## 4. Webhook failure alert

**Why this matters:** if the payment-provider webhook stops landing, paid orders stay stuck in `PENDING_PAYMENT` while the customer's card was charged. This is the worst silent failure mode in commerce.

Two layers of detection:

### 4a. Log-based (your hosting platform's log alerts or Sentry)

- [ ] Alert when `payment.webhook.signature_invalid` log message appears `>= 3 times in 10 minutes`.
- [ ] Alert when `payment.webhook.error` log message appears `>= 5 times in 10 minutes`.
- [ ] Alert when **any** `payment.webhook.*` HTTP response was `5xx` `>= 1 time` (these should never happen).

### 4b. Provider-side

- [ ] In each payment provider's dashboard (PayMongo, Maya, Xendit), enable their built-in "webhook delivery failure" alert. Each provider can email/SMS you when our endpoint returns non-2xx for N attempts.

**Acceptance:** in a provider's test mode, deliberately point their webhook at `/api/payments/webhook` with a wrong signature → alert fires within 10 minutes.

---

## 5. MANUAL_REVIEW payment alert

Orders end up in `MANUAL_REVIEW` when the system can't safely auto-decide (e.g. webhook arrived but amount mismatch, or fraud-rule trip). Each one needs a human within hours.

- [ ] Log alert: `order.status_changed status=MANUAL_REVIEW` → Slack `#payments` immediately, **per event** (no aggregation).
- [ ] Cron-based daily summary: at 09:00 local time, post to `#payments` the count of orders in `MANUAL_REVIEW` older than 24 hours.

**Query for the daily summary:**

```sql
SELECT id, total_amount, currency, customer_email, created_at
FROM orders
WHERE status = 'MANUAL_REVIEW'
  AND created_at < now() - interval '24 hours'
ORDER BY created_at ASC;
```

**Acceptance:** manually transition an order in staging to `MANUAL_REVIEW` → Slack notice within 1 minute.

---

## 6. Failed admin login spike alert

Brute force or credential stuffing against admin accounts.

- [ ] Log alert: `auth.admin.login_failed` count `>= 20 in 5 minutes` from any single IP → Slack `#alerts` + phone for security on-call.
- [ ] Log alert: `auth.admin.login_failed` count `>= 100 in 1 hour` regardless of IP → Slack + phone.
- [ ] Log alert: `auth.account_locked role=ADMIN|SUPER_ADMIN|MANAGER` (any single occurrence) → Slack + phone.

**Acceptance:** from a test machine, hit `/api/auth/admin/login` 25 times with bad credentials → IP-based credential limiter (30/15min) kicks in **and** the spike alert fires.

---

## 7. Expiration-cron stale alert

If the cron stops running, abandoned orders permanently hold stock.

- [ ] Log alert: **absence** of `cron.expire-orders complete` in the last `30 minutes` (cron runs every 5 → 6× expected). Severity: high.
- [ ] Log alert: any `cron.expire-orders error` log line — Slack immediately.
- [ ] Cron-system-level alert: your scheduler's "job failed" or "job missed" alert wired to Slack.

**Acceptance:** disable the scheduled job in staging for 35 minutes → "stale cron" alert fires.

---

## 8. High 5xx alert

- [ ] Log / metric alert: API returns 5xx `>= 1% of requests` over **5 minutes** → Slack + phone.
- [ ] Log / metric alert: API returns 5xx `>= 5% of requests` over **2 minutes** → phone immediately, Slack.
- [ ] Sentry: any **new** error issue tagged `level:error` in `production` → Slack.

**Why two thresholds:** the 1%-over-5min catches a slow degradation; the 5%-over-2min catches a sudden break and pages you faster.

---

## 9. Database connection alert

A saturated DB pool causes cascading 5xx and is the most common scaling failure for early launches.

- [ ] Managed-Postgres dashboard alert: connection count `>= 80%` of cap for 5 minutes → Slack.
- [ ] Managed-Postgres dashboard alert: connection count `>= 95%` for 1 minute → phone.
- [ ] Managed-Postgres dashboard alert: replication lag `> 10 seconds` (if you have a replica) → Slack.
- [ ] Managed-Postgres dashboard alert: storage `>= 80%` of disk → Slack with 24-hour grace period.
- [ ] Log alert: `database connection pool exhausted` or equivalent → phone immediately.

**Acceptance:** open a transaction and hold it open for 10 minutes from `psql` while the API is under light load → connection-count alert fires (or, in staging, simulate by setting `DATABASE_POOL_MAX=2` and hitting the API with concurrency).

---

## Notification routing summary

| Alert | First notice | Escalate |
|---|---|---|
| `/health` down | phone | — already at top |
| `/ready` down | Slack | phone after 15 min |
| Webhook signature invalid | Slack | phone if persists 30 min |
| MANUAL_REVIEW order | Slack | daily summary 09:00 |
| Admin login spike | Slack + phone | — |
| Cron stale | Slack | phone after 60 min |
| 5xx ≥ 1% / 5min | Slack | phone if reaches 5%/2min |
| DB connections ≥ 80% | Slack | phone at 95% |
| New Sentry error | Slack | — |

Adjust to your team size; the principle is **page sparingly, log everything**.
