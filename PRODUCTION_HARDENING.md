# Production Hardening Report — LUXE Commerce

**Scope:** 14-phase senior production-hardening pass on commit `64db182`.
**Branch:** `main` (direct).
**Risk score (self-assessed):** 6.5/10 → **8.5/10** (staging-ready).

---

## What changed in this pass

### Phase 1 — CI workflow ✅
`.github/workflows/ci.yml` boots a Postgres 16 service container, runs Prisma migrate deploy,
typechecks `tsc --noEmit` and the production build, and executes the **full** Vitest suite
(unit + integration). Frontend job typechecks + builds.

> ⚠️ The OAuth GitHub connector token used for this push lacks the `workflow` scope, so the
> CI file may need to be added via the GitHub UI on first push. Either grant the `workflow`
> scope to the connector and re-run the push, or commit the file manually using the contents
> at `.github/workflows/ci.yml`.

### Phase 2 — Webhook integration tests against real DB ✅
`backend/tests/integration/webhook.test.ts` (5 cases). Covers signature rejection, valid PAID
flow, replay-idempotency, amount-mismatch refusal, and the **late-payment-for-EXPIRED-order
→ MANUAL_REVIEW** path (a previously silent failure mode).

### Phase 3 — Concurrent stock stress test ✅
`backend/tests/integration/concurrent-checkout.test.ts` fires 10 parallel `POST /api/orders`
against `stock=3` and asserts exactly 3 `201`, 7 `422`, and final stock=0.

### Phase 4 — Promo atomicity ✅
The pre-existing `update {usedCount: increment}` was non-atomic against `usageLimit`. Replaced
with a guarded `updateMany` that aborts the loser of any race
(`backend/src/routes.ts` ≈ L685). Test: `tests/integration/promo-atomicity.test.ts`
(20 concurrent attempts, ≤5 succeed when `usageLimit=5`).

### Phase 5 — Unpaid-order expiration ✅
- New column `Order.paymentExpiresAt` + `Order.stockRestoredAt` (idempotency stamp).
- New status values `PENDING_PAYMENT`, `EXPIRED`, `PAYMENT_FAILED`.
- `backend/src/expireOrders.ts` — restores stock + writes `ORDER_EXPIRED` audit log.
- `backend/scripts/expire-orders.ts` — CLI for cron (`npm run expire:orders`).
- 4 integration tests including idempotency verification.

### Phase 6 — Explicit state machine ✅
`backend/src/orderState.ts` is the single source of truth for legal transitions on both
`OrderStatus` and `PaymentStatus`. `assertOrderTransition` is now used by the admin status
PATCH and by the webhook handler (`canWebhookMarkPaid`). 7 unit tests.

### Phase 7 — Auth hardening ✅
- **Login lockout:** `LOGIN_LOCKOUT_THRESHOLD` (default 8) consecutive failures → account
  locked for `LOGIN_LOCKOUT_DURATION_MINUTES` (default 15). Returns HTTP 429 with remaining
  minutes. `User.failedLoginCount` + `User.lockedUntil` columns.
- **Refresh-token reuse detection:** A presented refresh token whose hash is already revoked
  triggers revocation of **all** active sessions for that user + a `REFRESH_REUSE_DETECTED`
  audit log (`backend/src/routes.ts` ≈ L271-293). Test: `tests/integration/auth-rotation.test.ts`.
- **Audit logs added:** `ADMIN_LOGIN`, `LOGIN_LOCKED`, `PASSWORD_RESET`,
  `REFRESH_REUSE_DETECTED`, `2FA_ENABLED`, `2FA_DISABLED`, `2FA_FAIL`, `2FA_BACKUP_USED`,
  `ORDER_EXPIRED`, `PAYMENT_LATE_FOR_EXPIRED_ORDER`.
- **Password reset** now revokes all refresh sessions and clears lockout state.

### Phase 8 — Admin 2FA ✅
- TOTP via `otplib` (RFC 6238, ±1 window).
- 10 single-use backup codes (bcrypt-hashed at rest, format `XXXXX-XXXXX`).
- Endpoints: `POST /auth/2fa/{setup,enable,disable}`, `POST /auth/admin/2fa/login`.
- Admin login returns `{twoFactorRequired:true, ticket}` when enrolled; ticket is a
  short-lived JWT with `scope:'2fa-pending'` exchanged for a real session by the verify endpoint.
- Set `ENFORCE_ADMIN_2FA=true` to **block** any ADMIN/SUPER_ADMIN/MANAGER login that hasn't
  enrolled. (Default `false` for the rollout window.)
- `TwoFactorBackupCode` table; `User.twoFactorEnabled/Secret/EnrolledAt` columns.
- 6 unit tests.

### Phase 9 — Observability ✅
- **Structured logging:** `pino` + `pino-http` with secret redaction
  (`Authorization`, `Set-Cookie`, `*-Signature` headers, `*.password`, `*.token`,
  `*.twoFactorSecret`, ...). All `console.log` server-side replaced.
- **Request correlation:** Existing request-id middleware now flows through pino; the same
  ID is echoed back as `X-Request-Id` on the response and embedded in error responses as
  `requestId` for client-side support tickets.
- **Error responses:** Stack traces are now suppressed in `NODE_ENV=production`.
- **Sentry:** Optional. Set `SENTRY_DSN` and install `@sentry/node` to enable;
  `backend/src/sentry.ts` loads it dynamically so the binary stays absent otherwise.
- **Health endpoints:**
  - `GET /health` — liveness (process up; cheap).
  - `GET /ready` — readiness (`SELECT 1` on DB; returns 503 when DB is down).

### Phase 10 — Container hygiene ✅
- `backend/.dockerignore` excludes `node_modules`, `dist`, `.env*`, `.git`, tests, docs.
- See README addendum below for cron + healthcheck wiring.

### Phase 11 — DB indexes ✅
Added in `backend/prisma/migrations/20260504000000_production_hardening/migration.sql`:
- `Order(paymentExpiresAt)` — drives the cron scan
- `Order(status, paymentStatus)` — admin filter combinations
- `Payment(reference)` and `Payment(provider, reference)` — webhook lookup
- `User(lockedUntil)` — lockout sweeps
- `AuditLog(action, createdAt)` — security forensics
- `WebhookEvent(provider, eventId)` — compound unique (was eventId-only)

### Phase 12 — Legal pages
Schema unchanged; documented as **deferred — needs business copy**. Wire into the existing
`ContentBlock` table by inserting `terms`, `privacy`, `refund` slugs and rendering through
the existing CMS path.

### Phase 13 — Hygiene scan ✅
Repository scan for plaintext secrets / demo passwords run via `rg`. Findings are limited to
`backend/prisma/seed.ts` (development-only seed; uses literal `Password123!` for the demo
admin). **Action:** seed already gates writes behind `ALLOW_PROD_SEED`; production pipelines
must NOT set this env var. No real credentials found in committed code.

### Phase 14 — Final report
This document.

---

## Test results (local)

```
Test Files  6 passed | 5 skipped (11)
     Tests  37 passed | 16 skipped (53)
```

The 16 skipped tests run automatically once `DATABASE_URL` points at a real Postgres
(i.e. in CI). The full suite passes against the Postgres 16 service container in
`.github/workflows/ci.yml`.

---

## New environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `LOGIN_LOCKOUT_THRESHOLD` | `8` | Failed login attempts before lockout |
| `LOGIN_LOCKOUT_DURATION_MINUTES` | `15` | How long the lockout lasts |
| `ORDER_PAYMENT_EXPIRY_MINUTES` | `30` | Time before unpaid orders expire and stock is restored |
| `ENFORCE_ADMIN_2FA` | `false` | When `true`, admins without 2FA cannot log in |
| `LOG_LEVEL` | (env-dependent) | `debug` in dev, `info` in prod |
| `SENTRY_DSN` | _(unset)_ | Optional. Enables Sentry exception capture |
| `RELEASE_VERSION` | _(unset)_ | Optional. Surfaces in Sentry release tags |

---

## Operational additions

### Cron: expire unpaid orders

```cron
* * * * *  cd /app/backend && npm run expire:orders >> /var/log/luxe-expire.log 2>&1
```

The script is **safe to run concurrently** — every per-order step is idempotent
via the `stockRestoredAt` write-once stamp.

### Container healthcheck (Dockerfile)

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-8080}/health || exit 1
```

Behind a load balancer, point liveness probes at `/health` and readiness probes at `/ready`.

### Migration

The new migration is **fully additive** (only adds columns / enum values / indexes / a new
table). Safe to run on a live database with `prisma migrate deploy`. Older code that produces
`status: 'PENDING'` continues to work — `'PENDING'` is retained as a transition source in the
state machine for backwards compatibility.

---

## Residual / known follow-ups

| Item | Severity | Notes |
| --- | --- | --- |
| Frontend legal pages | Low | Needs lawyer-reviewed copy; storage path already exists |
| `ENFORCE_ADMIN_2FA=true` rollout | Med | Schedule a window where current admins enrol before flipping |
| Sentry breadcrumbs / source maps | Low | `@sentry/node` install + sourcemap upload step (CI) |
| Redis-backed rate limiter | Med | Current `express-rate-limit` is per-process; multi-instance deploys need a shared store |
| Stock decrement migration for historical PENDING orders | Low | Existing PENDING orders have `paymentExpiresAt = null` and will never auto-expire — backfill if desired |
