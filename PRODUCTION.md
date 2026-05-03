# LUXE Commerce — Production Readiness

This document is the authoritative production checklist for this repository.
Read it before deploying any environment that handles real customer data or real payments.

---

## Current production readiness score: **6.5 / 10**

**Verdict: release candidate (NOT production-ready for real payments).**
The repo has solid security primitives and now-correct payment/inventory primitives,
but several gaps remain (see Remaining Launch Blockers).

---

## What this hardening pass added

1. **CI is green again** — frontend dependency versions corrected; backend TypeScript errors fixed.
2. **Atomic stock decrement** — `productVariant.updateMany({ where: { stock: { gte: qty } } })` replaces the old non-atomic `update { decrement }`. Two concurrent checkouts for the last item can no longer both succeed.
3. **Provider-specific webhook signature verification** — PayMongo (HMAC of `t.body` + 5-min replay window), Xendit (`x-callback-token` constant-time compare), Maya (Basic Auth header compare). The old single-HMAC verifier is deprecated.
4. **`mock` provider blocked at runtime in production** — even if env validation is bypassed, `createPaymentCheckout` throws.
5. **Production env validation expanded** — provider-specific required keys checked at boot (PayMongo needs `PAYMONGO_SECRET_KEY`; Maya needs `MAYA_WEBHOOK_AUTH`; Xendit needs `XENDIT_CALLBACK_TOKEN`).
6. **Seed script refuses to run in production** unless `ALLOW_PROD_SEED=1`. Demo customer is no longer seeded by default; default `password123` removed.
7. **Demo emails removed from `.env.example`** — `owner@luxe.test` / `customer@luxe.test` defaults gone.
8. **CI now runs tests** and fails the build on critical npm vulnerabilities (`npm audit --audit-level=critical`, no `continue-on-error`).
9. **Vitest test suite added** — webhook signature, RBAC, price integrity invariants.
10. **Backend build separated from tests** — `tsconfig.build.json` excludes `tests/` so CI builds remain lean.

---

## Remaining launch blockers (before accepting real money)

| # | Blocker | Effort |
|---|---|---|
| 1 | **Webhook DB integration tests** with real PayMongo / Xendit fixture payloads (asserts amount/currency/event-id mismatch all reject correctly) | ~1 day |
| 2 | **Concurrent-checkout integration test** with a real Postgres in CI proving the atomic decrement works under load | ~½ day |
| 3 | **Promo concurrency test** proving `usageLimit` is never exceeded under parallel checkouts (currently relies on `@@unique([userId, promoCodeId, orderId])` only — `usedCount` is incremented non-atomically) | ~½ day |
| 4 | **Unpaid-order expiration job** — pending orders currently hold stock indefinitely. Need a scheduled job to cancel orders not paid within N minutes and restore stock. | ~1 day |
| 5 | **Order lifecycle states** — schema currently has `PENDING / CONFIRMED / PREPARING / TO_SHIP / SHIPPED / DELIVERED / CANCELLED / REFUNDED` but no `PENDING_PAYMENT` / `FAILED`. Add these and tighten transitions. | ~½ day |
| 6 | **Sentry (or equivalent) error reporting** — in production, `console.error` goes nowhere useful. Requires the user to provision a DSN. | ~½ day |
| 7 | **Account lockout / auth throttling** — current rate limiter is per-IP and in-memory. Need per-user throttling with Redis for multi-instance deployments. | ~1 day |
| 8 | **Admin 2FA** — schema additions + TOTP setup/verify endpoints + middleware enforcing 2FA on admin sessions. | ~1.5 days |
| 9 | **CSRF protection** — refresh token cookie is httpOnly but state-changing routes accept Bearer tokens; if the frontend ever uses cookies for state-changing requests, add `csurf` or double-submit token. | ~½ day |
| 10 | **Legal pages** (Terms, Privacy, Refund, Shipping) and **email auth records** (SPF, DKIM, DMARC) — both require real-world content/DNS access. | ~1 day |

---

## Required production environment variables

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://USER:PASS@HOST:5432/luxe?sslmode=require
JWT_ACCESS_SECRET=<64-char hex>
JWT_REFRESH_SECRET=<different 64-char hex>
CORS_ORIGIN=https://www.your-domain.com
FRONTEND_URL=https://www.your-domain.com

PAYMENT_PROVIDER_DEFAULT=paymongo   # or maya | xendit | manual
PAYMENT_WEBHOOK_SECRET=<32-char hex>

# If PAYMENT_PROVIDER_DEFAULT=paymongo
PAYMONGO_SECRET_KEY=sk_live_...

# If PAYMENT_PROVIDER_DEFAULT=maya
MAYA_PUBLIC_KEY=pk-live-...
MAYA_SECRET_KEY=sk-live-...
MAYA_WEBHOOK_AUTH=Basic <base64(user:pass configured on Maya dashboard)>

# If PAYMENT_PROVIDER_DEFAULT=xendit
XENDIT_SECRET_KEY=xnd_production_...
XENDIT_CALLBACK_TOKEN=<exact value from Xendit dashboard>

MAIL_PROVIDER=resend                 # or sendgrid | mailgun
RESEND_API_KEY=re_...
MAIL_FROM="LUXE <orders@your-domain.com>"
```

The backend will **refuse to boot** in production if any of:
- `CORS_ORIGIN` is wildcard or contains localhost
- `PAYMENT_WEBHOOK_SECRET` is unset
- `JWT_ACCESS_SECRET === JWT_REFRESH_SECRET`
- `PAYMENT_PROVIDER_DEFAULT === 'mock'`
- Provider-specific keys (above) are missing for the chosen provider

---

## Deployment

```bash
# Production deploy steps
docker build -t luxe-api ./backend
docker run -d --env-file .env.production --name luxe-api -p 8080:8080 luxe-api

# Apply migrations (run once per release)
docker exec luxe-api npx prisma migrate deploy
```

### Rollback

```bash
docker stop luxe-api && docker rm luxe-api
docker run -d --env-file .env.production --name luxe-api -p 8080:8080 luxe-api:<previous-tag>
# Prisma migrations are NOT auto-reverted. To roll back a migration:
#   psql $DATABASE_URL < prisma/migrations/<migration-id>/down.sql   (must be hand-written)
```

### Database backups

Use your managed Postgres provider's PITR (Supabase, Neon, RDS all support this).
Verify a restore monthly.

---

## Go / no-go decision

**No-go for real payments today.** Items 1–4 above (webhook fixture tests, concurrent checkout test, promo concurrency test, unpaid-order expiration) must land first. After that, this is safe for a soft launch with monitoring.
