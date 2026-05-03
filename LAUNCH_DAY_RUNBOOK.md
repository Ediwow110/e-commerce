# Launch Day Runbook

> **Audience:** the on-call engineer running the soft launch.
> **Goal:** zero customer-facing incidents from T-60 minutes through T+24 hours.
> Do every step in order. Do **not** skip a check because "the previous one was fine."

---

## 0. The night before launch (T-12h)

- [ ] Confirm all five [external blockers](./EXTERNAL_BLOCKERS.md) are **DONE**, not "in progress."
- [ ] Confirm last `main` commit on GitHub is the one you intend to ship.
- [ ] Confirm CI is green on that commit (Backend, Frontend, Dependency audit, Secret scan).
- [ ] Database backup has run in the last 24 hours and a test restore was performed at least once. See `BACKUPS.md`.
- [ ] On-call rota for the next 24 hours is posted somewhere both engineers and support can see.
- [ ] Status-page (or equivalent customer comms channel) is ready to publish to.
- [ ] You have **read access** to: hosting platform dashboard, managed Postgres dashboard, Sentry, uptime monitor, all three payment-provider dashboards, email-provider dashboard.

---

## 1. Pre-launch checklist (T-60 minutes)

Run these in a fresh shell. **Stop and abort** if any item fails.

- [ ] `curl -fsS https://yourdomain.example.com/health` returns `{"ok":true,...}`
- [ ] `curl -fsS https://yourdomain.example.com/ready` returns `{"ready":true,...}`
- [ ] Hosting platform dashboard shows **only one** active deployment of the API. (No half-rolled-out replicas.)
- [ ] Database connections in the platform dashboard are below 50% of the connection cap.
- [ ] Sentry is receiving heartbeats from a staging request you make right now.
- [ ] Uptime monitor shows green for `/health` and `/ready` for the last 30 minutes.
- [ ] Latest backup timestamp is < 24h old.
- [ ] All three payment-provider dashboards are open in browser tabs and signed in.
- [ ] Email-provider dashboard is open and signed in. SPF/DKIM/DMARC all show "verified."
- [ ] Customer-facing legal pages (`/terms`, `/privacy`, `/refunds`, `/shipping`) **do not** show the yellow "REQUIRES LEGAL REVIEW" banner. If they do — abort: legal review is incomplete.

---

## 2. Exact deploy order

The app is two artifacts: **backend (api-server)** and **frontend**. Always deploy backend first.

```
T-30:  pg_dump snapshot (one-off, label "pre-launch-<date>")
T-25:  Run database migrations against production (see §3)
T-20:  Deploy backend (api-server) to production
T-18:  Smoke-test backend (see §4)
T-15:  Deploy frontend to production
T-12:  Smoke-test frontend (see §5)
T-08:  End-to-end test order (see §6)
T-04:  End-to-end test payment (see §7)
T-02:  Verify webhook (see §8) and cron (see §9)
T+00:  Announce / open the doors
T+01:  First post-launch sweep (see POST_LAUNCH_24H_WATCHLIST.md)
```

Never deploy frontend before backend. The frontend may call new backend endpoints; the reverse is safe.

---

## 3. Database migration step

```bash
# From the deploy host or your laptop with prod DATABASE_URL exported
cd backend
pnpm install --frozen-lockfile
DATABASE_URL="$PROD_DATABASE_URL" pnpm run db:migrate
```

Verify:

- [ ] Command exited 0.
- [ ] No "skipped" or "pending" migrations in the output.
- [ ] `psql "$PROD_DATABASE_URL" -c "select count(*) from drizzle_migrations"` matches the file count in `backend/drizzle/`.

If migration fails: **do not deploy backend**. Restore from the snapshot taken at T-30 (`ROLLBACK.md` §2).

---

## 4. Env var verification

Before promoting a backend deploy, confirm the running container has all required vars set. See `ENV_PRODUCTION_CHECKLIST.md` for the full list. Quick gate:

```bash
curl -fsS https://yourdomain.example.com/ready | jq
```

A `200 {"ready":true,...}` means the **boot-time preflight passed**. The preflight refuses to start the process when:

- `LAUNCH_MODE=production` and any required secret is missing/short/reused
- payment keys are still in test mode in production
- `ENFORCE_ADMIN_2FA` is not `true`
- `RATE_LIMIT_STORE` is `memory` (multi-replica unsafe)
- CORS / CSRF settings contradict each other

If `/ready` returns `503` — read the container logs for the `[preflight]` lines and fix the env var.

---

## 5. Backend health check

```bash
curl -fsS https://yourdomain.example.com/health    # liveness
curl -fsS https://yourdomain.example.com/ready     # readiness (DB, redis if used, env)
curl -fsS https://yourdomain.example.com/api/products?limit=1   # real DB read
```

All three must return `200`. The third proves DB connectivity end-to-end.

---

## 6. Frontend smoke test

Open these in an incognito window (so no cached service worker / cookies):

- [ ] `https://yourdomain.example.com/` — homepage renders, no console errors.
- [ ] `/shop` — product grid renders, images load.
- [ ] Click a product — detail page renders, "Add to cart" works.
- [ ] `/cart` — cart line item appears.
- [ ] `/customer/register` — registration form renders.
- [ ] Footer links open `/terms`, `/privacy`, `/refunds`, `/shipping` — **none** show the REQUIRES LEGAL REVIEW banner.
- [ ] DevTools Network tab — every request returns 2xx or 3xx, no 4xx/5xx.

---

## 7. Test order flow (uses a real customer account)

Use a real test email address you control.

1. Register a brand-new customer.
2. Open the verification email — copy the link, click it, account verified.
3. Add a low-value product (≤ smallest currency unit you can charge) to cart.
4. Check out, choose a real shipping address (yours).
5. **Stop before paying** — verify the order appears in `/admin/orders` with status `PENDING_PAYMENT`.
6. Note the order ID — you'll use it in §8 and §9.

---

## 8. Test payment flow

Pick **one** provider per the [Payment Live Mode Checklist](./PAYMENT_LIVE_MODE_CHECKLIST.md). Pay the test order from §7 with a real card or e-wallet you own.

- [ ] Provider dashboard shows the payment as `succeeded` / `paid`.
- [ ] Within 60 seconds, `/admin/orders/<id>` shows status `PAID`.
- [ ] Customer received the order-confirmation email.
- [ ] Stock for the purchased SKU decremented by the right amount.

If status stays `PENDING_PAYMENT` for > 2 minutes after the provider says `paid` — it's a **webhook problem**. See §8.

Repeat for the other two providers if all three are live.

---

## 9. Webhook verification

For **each** provider:

1. In the provider dashboard, open the test payment from §7 → "Webhook attempts" / "Event log."
2. Confirm the most recent attempt to `https://yourdomain.example.com/api/payments/webhook` returned **HTTP 200**.
3. In the API logs, find the corresponding `payment.webhook.received` log entry — signature verification must say `verified=true`.
4. If the provider supports manual replay, replay the event once. Confirm the order is **not** double-charged or double-marked-paid (idempotency check).

Failure mode → see RUNBOOK.md scenario 1.

---

## 10. Order expiration cron verification

The cron `node backend/scripts/expire-orders.ts` must be scheduled per `JOBS.md` and protected by the Postgres advisory lock.

- [ ] Hosting platform "Scheduled jobs" section shows the job, schedule = every 5 minutes.
- [ ] Last execution timestamp is within the last 10 minutes.
- [ ] Last execution exit code is 0.
- [ ] In the API logs, you can find the lock-acquisition line: `cron.expire-orders lock acquired key=...`
- [ ] To prove it's working: create a `PENDING_PAYMENT` order, do not pay it, wait `ORDER_EXPIRY_MINUTES + 5` minutes, confirm it transitions to `EXPIRED` and the held stock is returned.

---

## 11. Email delivery verification

- [ ] Provider dashboard (Resend / SendGrid / Mailgun) shows recent successful sends (the verification + order-confirmation emails from §7 and §8).
- [ ] Bounce rate < 5%, complaint rate < 0.1% — if either is higher, your DNS records are wrong; see `EMAIL_DELIVERABILITY.md`.
- [ ] Test email arrived in the inbox — **not** spam folder. If spam — check SPF / DKIM / DMARC alignment in the email header (`Authentication-Results`).

---

## 12. Rollback trigger conditions

Pull the trigger in `ROLLBACK.md` if **any** of the following are true:

- 5xx error rate > **2%** for 5 consecutive minutes.
- Sentry error volume > **10x** baseline within any 10-minute window.
- Any customer is double-charged or charged for a wrong amount.
- Webhooks failing (provider attempts returning non-2xx) for > **15 minutes**.
- Order/payment mismatch detected (paid in provider, not paid in admin) and not recoverable by manual webhook replay within 30 minutes.
- Database connection pool saturated (> 90% used) and not recovering.
- The site returns 5xx on `/health` for > 3 minutes.

When in doubt: rollback. Reverting a launch is recoverable; serving broken checkouts is not.

---

## 13. Who watches what for the first 24 hours

| Role | What they watch | Cadence | Alert contact |
|---|---|---|---|
| **On-call engineer** | Sentry, uptime monitor, container logs, DB connection count | continuous T+0 → T+8h, then hourly | phone |
| **Backup engineer** | Same as above, takes over T+8 → T+24 | continuous | phone |
| **Support / ops** | Customer support inbox, social mentions, refund requests | every 30 min | email |
| **Finance / owner** | Payment-provider dashboards (succeeded vs failed), refund queue | every 2 hours | email |

See [`POST_LAUNCH_24H_WATCHLIST.md`](./POST_LAUNCH_24H_WATCHLIST.md) for the explicit "what to check at minute X" list.

---

## Appendix: useful commands

```bash
# Tail backend logs (replace with your platform's command)
<your platform> logs api-server --tail 200 --follow

# Last 50 errors only
<your platform> logs api-server --tail 1000 | grep '"level":"error"'

# Quick DB sanity (read-only)
psql "$PROD_DATABASE_URL" -c "select count(*) from orders where created_at > now() - interval '1 hour';"
psql "$PROD_DATABASE_URL" -c "select status, count(*) from orders group by status order by 2 desc;"

# Expire-orders cron — run manually if you suspect the scheduler is dead
node backend/scripts/expire-orders.ts
```
