# Post-Launch 24-Hour Watchlist

The first 24 hours of a soft launch decide whether the next 24 weeks go well. Most production failures show signal in the first hour — but you have to actually look. This is the explicit "what to check at minute X" list.

Print this. Set timers.

---

## T+0 → T+60 minutes — every 15 minutes

**Owner: on-call engineer, eyes on the dashboards continuously.**

At minutes **+15, +30, +45, +60**, walk through this checklist:

- [ ] Sentry inbox — any new issues? If yes: read, decide impact, fix or rollback.
- [ ] Uptime monitor — `/health` and `/ready` showing 100% for the last 15 minutes.
- [ ] 5xx rate (platform metrics or `grep '"status":5' logs | wc -l`) — must be `< 0.5%` of total requests.
- [ ] DB connection count — `< 50%` of the pool cap.
- [ ] Order count — query (see §"Queries" below). Should grow as expected for the announcement traffic.
- [ ] Successful payment count vs failed — failure ratio `< 5%`.
- [ ] Newest order in admin — status moved off `PENDING_PAYMENT` within 2 minutes after the payment succeeded in the provider dashboard.
- [ ] No orders stuck in `MANUAL_REVIEW`. If any: triage immediately.
- [ ] No alerts firing in Slack `#alerts` that are unacknowledged.

If **any** check fails: pause and investigate before the next 15-minute mark.

---

## T+1h → T+8h — every hour

**Owner: on-call engineer, primary attention.**

Each hour:

- [ ] Run all 9 checks from the 15-minute list above.
- [ ] **Payment reconciliation pass** (see §1).
- [ ] **Order/payment mismatch check** (see §2).
- [ ] **Stock anomaly check** (see §3).
- [ ] **Abandoned order check** (see §4).
- [ ] **Failed webhook check** (see §5).
- [ ] **Support inbox check** (see §6).
- [ ] Note in the launch log (a shared doc): "T+Xh — all green" or "T+Xh — issue: ..."

---

## T+8h → T+24h — every 2 hours

**Owner: backup engineer takes over T+8 → T+16; primary back T+16 → T+24.**

Same hourly checks, but every 2 hours.

At **T+12h** and **T+24h**, also do a **finance reconciliation** with the business owner: compare provider-dashboard total vs admin-orders total for the period.

---

## §1. Payment reconciliation

**Goal:** every payment that the provider says succeeded is reflected in our DB as `PAID`, and vice versa.

For each provider:

1. Open the provider dashboard → Payments → filter by date = today.
2. Note the count and total amount of `succeeded`/`paid` transactions.
3. Compare to:

```sql
SELECT count(*), sum(total_amount)
FROM orders
WHERE status = 'PAID'
  AND payment_provider = 'paymongo'   -- change per provider
  AND paid_at >= current_date;
```

- [ ] Counts match.
- [ ] Sums match (allow for fees if the provider reports gross-of-fees).

If they don't match → investigate **before** the next reconciliation cycle. Most likely cause: a webhook that didn't land. Replay it from the provider dashboard.

---

## §2. Order / payment mismatch checks

```sql
-- Orders that should be paid by now but aren't
SELECT id, customer_email, total_amount, payment_provider, created_at
FROM orders
WHERE status = 'PENDING_PAYMENT'
  AND created_at < now() - interval '20 minutes'
ORDER BY created_at;

-- Orders marked PAID but with no provider reference (data corruption)
SELECT id, customer_email, total_amount, payment_provider, paid_at
FROM orders
WHERE status = 'PAID'
  AND (provider_reference IS NULL OR provider_reference = '')
ORDER BY paid_at DESC;

-- Orders marked PAID but webhook never verified (suspicious)
SELECT id, customer_email, total_amount, payment_provider
FROM orders
WHERE status = 'PAID'
  AND webhook_verified IS NOT TRUE
ORDER BY paid_at DESC;
```

- [ ] First query: results should be expected — these are unpaid orders heading toward expiry. Anything that's been there > 1 hour with the customer claiming to have paid → check the provider dashboard, replay webhook.
- [ ] Second query: should be **zero rows**. Any rows here = bug, escalate.
- [ ] Third query: should be **zero rows**. Any rows here = something marked an order paid without a webhook. Investigate immediately.

---

## §3. Stock anomaly checks

```sql
-- Variants with stock changes more than X in last hour (X depends on your scale)
SELECT v.sku, v.in_stock, count(o.id) AS order_count
FROM variants v
LEFT JOIN order_items oi ON oi.variant_id = v.id
LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at > now() - interval '1 hour'
WHERE v.in_stock < 0   -- impossible state
   OR v.in_stock > 100000;  -- absurdly high
```

- [ ] No rows with `in_stock < 0`. Any negative stock = race condition leaked through. Stop checkouts on that SKU.
- [ ] Top-selling SKUs match what you'd expect from announcement / marketing.

---

## §4. Abandoned order checks

```sql
SELECT count(*) AS abandoned_count
FROM orders
WHERE status = 'EXPIRED'
  AND created_at > now() - interval '1 hour';
```

- [ ] Compare to `PAID` count for the same window. Abandonment rate `> 70%` is a warning sign — checkout UX is broken or payment provider is rejecting cards.
- [ ] If abandonment is unusually high, check Sentry for frontend errors on `/checkout`.

---

## §5. Failed webhook checks

In each provider's dashboard → Webhooks → Recent attempts. Filter by status = "failed."

- [ ] Zero failed attempts in the last hour, ideally.
- [ ] If any failed: read the response code we returned. If 4xx → bug in our handler, investigate. If 5xx → check Sentry. If timeout → check API latency at that timestamp.
- [ ] **Replay** every failed attempt from the provider dashboard (one click). Then re-check §2 mismatch queries.

Also grep our own logs:

```bash
<your platform> logs api-server | grep -E "payment.webhook.(error|signature_invalid)" | tail -50
```

- [ ] Empty / very few entries.

---

## §6. Support inbox checks

Open the support inbox (the address you set as `SUPPORT_EMAIL`).

- [ ] Read every message that arrived since the last check.
- [ ] Categorise: payment failure, shipping question, account issue, other.
- [ ] Any **payment failure** report = high priority — match it to the order, check our DB vs provider, reply within 1 hour.
- [ ] Any **account access** report (can't log in, didn't get verification email) = check email-provider deliverability dashboard.

Also check:

- Any social-media mentions of the brand reporting issues.
- Any Sentry user-feedback entries.

---

## §7. Rollback criteria — the "pull the plug" thresholds

Trigger `ROLLBACK.md` immediately if any of these is true at any point in the 24-hour window:

| Trigger | Threshold |
|---|---|
| 5xx rate | ≥ 2% sustained for 5 minutes |
| `/health` failing | ≥ 3 minutes |
| New Sentry errors | ≥ 10× baseline in 10 minutes |
| Customer double-charged | even **one** confirmed instance |
| Webhook delivery failing | ≥ 15 minutes for any provider, not recoverable by replay |
| Order/payment mismatch | not reconciled within 30 minutes of detection |
| DB pool saturated | ≥ 90% for 5 minutes, not recovering |
| Negative stock detected | even **one** SKU |
| Stock manipulation suspected | any sign of price/qty tampering in orders |

When in doubt: rollback. The cost of a 30-minute outage to roll back is small compared to the cost of refunding 100 wrongly-charged customers.

---

## Queries — reusable

Save these in your DB tool of choice with one-click run.

```sql
-- Last hour summary (run every 15 min)
SELECT
  date_trunc('minute', created_at) AS minute,
  count(*) FILTER (WHERE status = 'PAID')             AS paid,
  count(*) FILTER (WHERE status = 'PENDING_PAYMENT')  AS pending,
  count(*) FILTER (WHERE status = 'EXPIRED')          AS expired,
  count(*) FILTER (WHERE status = 'MANUAL_REVIEW')    AS manual_review,
  count(*) FILTER (WHERE status = 'CANCELLED')        AS cancelled
FROM orders
WHERE created_at > now() - interval '1 hour'
GROUP BY 1
ORDER BY 1 DESC;

-- Hourly revenue
SELECT
  date_trunc('hour', paid_at) AS hour,
  count(*)                    AS paid_orders,
  sum(total_amount)           AS gross_revenue,
  payment_provider
FROM orders
WHERE status = 'PAID' AND paid_at > now() - interval '24 hours'
GROUP BY 1, payment_provider
ORDER BY 1 DESC, payment_provider;

-- Customers who registered today
SELECT count(*) FROM users WHERE created_at >= current_date;

-- Top failing email types (if you log email send results)
SELECT email_type, status, count(*)
FROM email_log
WHERE created_at > now() - interval '24 hours'
GROUP BY 1, 2
ORDER BY 3 DESC;
```

---

## Final hand-off (T+24h)

At the end of the 24-hour window, if everything stayed green:

- [ ] Post a short summary in the launch log: order count, gross revenue, incident count, any open follow-ups.
- [ ] Schedule a 30-minute retro for the next business day.
- [ ] Move from "launch on-call" cadence to your normal on-call rotation.
- [ ] Continue **daily** checks of §1 (payment reconciliation) and §2 (order/payment mismatch) for the first two weeks.

If anything is **not** green at T+24, do **not** stand down — extend the watch by another 24 hours and identify the root cause first.
