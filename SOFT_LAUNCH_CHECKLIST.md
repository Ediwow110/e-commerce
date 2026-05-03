# Soft-launch checklist

Goal: real money flows through LUXE Commerce, but with a small enough audience
that any unforeseen bug affects ≤10 customers. Tick everything before
announcing the store.

> If any **❌ blocker** below is unchecked, do NOT launch.

## Pre-launch (T minus 1 week → T minus 1 day)

### Code & infrastructure

- [ ] CI green on the deploying commit (`https://github.com/Ediwow110/e-commerce/actions`).
- [ ] All 74 tests pass against live Postgres in CI.
- [ ] Latest commit reviewed by at least one human besides the author.
- [ ] Container image tagged with the commit SHA.
- [ ] `LAUNCH_MODE=production` in the deployed env.
- [ ] Preflight passes at boot (no error-level findings).

### Database

- [ ] Daily backup verified (see `BACKUPS.md`).
- [ ] PITR enabled (or single-snapshot restore drill done in last 90 days).
- [ ] **Restore drill completed and documented.** ❌ blocker.
- [ ] Migration history matches between dev / staging / prod
      (`prisma migrate status` returns clean on prod).

### Env vars & secrets

- [ ] Every required var in `PRODUCTION_ENV.md` set in production env.
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` rotated specifically for
      production (not reused from staging).
- [ ] `PAYMENT_WEBHOOK_SECRET` rotated specifically for production.
- [ ] Secrets stored in a manager (1Password / Doppler / Secrets Manager),
      not in the deploy panel UI alone.

### Payments — pick provider, complete checklist

- [ ] Provider selected (PayMongo / Maya / Xendit / manual). ❌ blocker.
- [ ] `PAYMENT_PROVIDER_LAUNCH_CHECKLIST.md` walked end-to-end for that
      provider. ❌ blocker.
- [ ] Webhook URL configured on provider dashboard with the production
      secret.
- [ ] One real low-value live payment placed and refunded successfully.
      ❌ blocker.

### Admin 2FA

- [ ] First super-admin account created with a unique strong password.
- [ ] Super-admin enrolled in 2FA (TOTP scanned, code verified).
- [ ] **All 10 backup codes printed / saved in a password manager.** ❌ blocker.
- [ ] All other admins enrolled in 2FA.
- [ ] `ENFORCE_ADMIN_2FA=true` in env. ❌ blocker.

### Cron / background jobs

- [ ] `expire:orders` scheduled to run every minute (see `JOBS.md`).
      ❌ blocker.
- [ ] First scheduled run logged `expire-orders completed` successfully.
- [ ] Alert configured: "no completed log in 5 min" (see `MONITORING.md`).

### Monitoring

- [ ] Sentry project created, `SENTRY_DSN` set.
- [ ] Uptime monitor pinging `/health` and `/ready` every 60s.
- [ ] All alerts in `MONITORING.md` configured and routed to on-call.
- [ ] On-call rotation defined (at minimum: one human reachable 24/7 for
      the first week).

### Email

- [ ] `MAIL_PROVIDER` set to a real provider (not `mock`). ❌ blocker.
- [ ] SPF / DKIM / DMARC records published and verified
      (`mail-tester.com` ≥ 9/10). ❌ blocker.
- [ ] Test order email reaches a Gmail inbox out of spam.
- [ ] `SUPPORT_EMAIL` mailbox is monitored by a human.

### Customer trust pages

- [ ] Terms of Service reviewed by a lawyer or business owner. ❌ blocker.
- [ ] Privacy Policy reviewed and lists every third party
      (PayMongo/Maya/Xendit/Resend/Sentry/Google). ❌ blocker.
- [ ] Refund policy is clear and links from checkout.
- [ ] Shipping policy lists carriers and zones.
- [ ] Contact / Support page reachable from the footer.

### Legal / business

- [ ] Business is registered for the markets you sell into.
- [ ] Tax handling (VAT / GST / sales tax) configured at checkout.
- [ ] Cookie / consent banner compliant with your jurisdiction (GDPR / CCPA
      / DPA).

## Launch day (T = 0)

In order:

1. [ ] **08:00** — final CI green.
2. [ ] **08:15** — take pre-deploy DB snapshot.
3. [ ] **08:30** — deploy backend (new container).
4. [ ] **08:31** — `prisma migrate deploy` runs in CI, succeeds.
5. [ ] **08:32** — verify `/health` 200.
6. [ ] **08:33** — verify `/ready` 200.
7. [ ] **08:35** — deploy frontend.
8. [ ] **08:40** — place a test customer order with a real card.
9. [ ] **08:42** — webhook received, order shows PAID in admin.
10. [ ] **08:43** — order confirmation email received in test inbox.
11. [ ] **08:45** — verify variant stock decremented by the right amount.
12. [ ] **08:46** — admin "Orders" view shows the test order.
13. [ ] **08:50** — first `expire-orders completed` log line of the new
       deploy.
14. [ ] **09:00** — open the storefront publicly / send the launch email.
15. [ ] **09:00 → 21:00** — engineer on standby, watching:
        - Sentry error rate
        - 5xx HTTP rate
        - Webhook delivery dashboard
        - Failed login spike
        - Manual-review payments queue

## Post-launch (T+1 day → T+1 week)

Daily for the first week:

- [ ] Reconcile yesterday's PAID orders against provider settlement report.
      Any mismatch → `RUNBOOK.md → 3`.
- [ ] Review every `MANUAL_REVIEW` payment, resolve to PAID or REFUNDED.
- [ ] Review every failed webhook on the provider dashboard.
- [ ] Spot-check 5 random orders for correct stock decrement.
- [ ] Review abandoned carts older than `ORDER_PAYMENT_EXPIRY_MINUTES` —
      confirm they were EXPIRED.
- [ ] Triage every Sentry issue; resolve, snooze, or open a fix ticket.
- [ ] Read every customer-support email; track recurring complaints.

After the first quiet week, you can ramp marketing and consider this a full
launch.

---

## Go / no-go gate

If **any ❌ blocker is unchecked, the answer is NO-GO.**

If all blockers are checked and ≥90% of remaining items are checked, the
answer is GO with a flagged list of debt items the team commits to closing
in the first 2 weeks.

If you are uncertain, default to NO-GO and reconvene in 24h.
