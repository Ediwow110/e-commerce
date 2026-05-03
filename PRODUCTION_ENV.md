# PRODUCTION ENV CONTRACT

Every env var the backend reads in production. The boot-time preflight in
`backend/src/preflight.ts` will refuse to start the process if any **error-level**
check below is unmet.

## `LAUNCH_MODE` — the master switch

| Value        | Allowed payments  | Allowed mail        | Admin 2FA forced | Localhost CORS | Notes                              |
|--------------|-------------------|---------------------|------------------|----------------|------------------------------------|
| `local`      | mock / sandbox    | mock                | no               | yes            | Dev defaults are tolerated.        |
| `staging`    | sandbox           | sandbox / live      | no (recommended) | no             | Strong secrets required.           |
| `production` | LIVE only         | LIVE only           | **yes**          | no             | Strictest gate — real money.       |

`LAUNCH_MODE` is independent of `NODE_ENV`. You may run `NODE_ENV=production`
locally for build testing without tripping production checks.

---

## Required in every environment

| Var | Example | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Standard Node convention. |
| `LAUNCH_MODE` | `production` | See table above. |
| `PORT` | `8080` | Backend HTTP listener. |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/luxe?sslmode=require` | In production must NOT point at localhost; should include `sslmode=require`. |
| `JWT_ACCESS_SECRET` | `<random 48+ chars>` | Must be ≥32 chars and not match weak patterns (`secret`, `changeme`, `test...`). |
| `JWT_REFRESH_SECRET` | `<random 48+ chars, different from access>` | Must differ from `JWT_ACCESS_SECRET`. |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Optional; default `15m`. |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Optional; default `7d`. |
| `CORS_ORIGIN` | `https://shop.example.com,https://admin.example.com` | Comma-separated. In production must NOT be `*` or contain `localhost`. |
| `FRONTEND_URL` | `https://shop.example.com` | In production must be `https://` and not localhost. |

## Generate strong secrets

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Run twice — once for `JWT_ACCESS_SECRET`, once for `JWT_REFRESH_SECRET`.

---

## Payments

| Var | Required when | Notes |
|---|---|---|
| `PAYMENT_PROVIDER_DEFAULT` | always | One of `paymongo \| maya \| xendit \| manual \| mock`. **`mock` is forbidden in production.** |
| `PAYMENT_WEBHOOK_SECRET` | production | ≥32 random chars. Used to verify PayMongo + mock webhooks. |
| `PAYMONGO_SECRET_KEY` | provider=paymongo | Production must NOT start with `sk_test_`. |
| `PAYMONGO_PUBLIC_KEY` | provider=paymongo (frontend) | |
| `MAYA_PUBLIC_KEY`, `MAYA_SECRET_KEY` | provider=maya | |
| `MAYA_WEBHOOK_AUTH` | provider=maya | The `Authorization` header value Maya sends to your webhook. |
| `XENDIT_SECRET_KEY` | provider=xendit | Production must NOT contain `xnd_development`. |
| `XENDIT_CALLBACK_TOKEN` | provider=xendit | The static token Xendit sends as `x-callback-token`. |
| `ORDER_PAYMENT_EXPIRY_MINUTES` | always (default `30`) | 1–1440. After this, unpaid orders are EXPIRED and stock restored. |

See `PAYMENT_PROVIDER_LAUNCH_CHECKLIST.md` for live-mode cutover steps.

---

## Mail

| Var | Required when | Notes |
|---|---|---|
| `MAIL_PROVIDER` | always | One of `mock \| resend \| sendgrid \| mailgun`. **`mock` is forbidden in production.** |
| `MAIL_FROM` | always | e.g. `LUXE <orders@yourdomain.com>`. |
| `MAIL_REPLY_TO` | optional | |
| `RESEND_API_KEY` | provider=resend | |
| `SENDGRID_API_KEY` | provider=sendgrid | |
| `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` | provider=mailgun | |
| `SUPPORT_EMAIL` | recommended in production | Used in customer-facing pages and runbooks. |

See `EMAIL_DELIVERABILITY.md` for SPF/DKIM/DMARC setup.

---

## Auth

| Var | Default | Notes |
|---|---|---|
| `LOGIN_LOCKOUT_THRESHOLD` | `8` | Failed logins per account before lockout. Range 3–50. |
| `LOGIN_LOCKOUT_DURATION_MINUTES` | `15` | How long the account is locked. Range 1–1440. |
| `ENFORCE_ADMIN_2FA` | `false` | **MUST be `true` in `LAUNCH_MODE=production`.** |
| `GOOGLE_CLIENT_ID` | optional | For Sign in with Google. |

---

## Rate limiting

| Var | Default | Notes |
|---|---|---|
| `RATE_LIMIT_STORE` | `memory` | `memory` is per-process. For multi-instance deploys set `redis`. |
| `REDIS_URL` | — | Required when `RATE_LIMIT_STORE=redis`. |

If you stay on `memory`, **either run a single backend instance** or rely on
your platform / WAF / load balancer to do the rate limiting.

---

## Observability

| Var | Default | Notes |
|---|---|---|
| `LOG_LEVEL` | `info` (`debug` in dev) | One of `fatal error warn info debug trace`. |
| `SENTRY_DSN` | — | Strongly recommended in production. Boot warns if missing. |
| `RELEASE_VERSION` | — | Tags Sentry events. Set to git SHA on deploy. |

---

## Operational flags

| Var | Default | Notes |
|---|---|---|
| `ALLOW_PROD_SEED` | unset | Set to any non-empty value to allow `prisma/seed.ts` against production DB. **Do NOT set unless you know what you are doing.** |

---

## Boot-time preflight summary

`backend/src/preflight.ts` runs before the listener. It will:

- **`process.exit(1)`** on any of:
  - `LAUNCH_MODE=production` + `PAYMENT_PROVIDER_DEFAULT=mock`
  - `LAUNCH_MODE=production` + `MAIL_PROVIDER=mock`
  - `LAUNCH_MODE=production` + `ENFORCE_ADMIN_2FA!=true`
  - `LAUNCH_MODE=production` + unsafe CORS / FRONTEND_URL
  - `LAUNCH_MODE=production` + missing live payment credentials
  - `LAUNCH_MODE=production` + sandbox keys (`sk_test_*`, `xnd_development_*`)
  - `JWT_ACCESS_SECRET == JWT_REFRESH_SECRET`
  - Weak / short JWT secrets in staging or production
  - `RATE_LIMIT_STORE=redis` without `REDIS_URL`
  - Out-of-range numeric flags
- **Log a warning** but allow boot for missing `SENTRY_DSN`, missing
  `SUPPORT_EMAIL`, or `RATE_LIMIT_STORE=memory` in production.

---

## Sample `.env.production` (sanitised)

```dotenv
NODE_ENV=production
LAUNCH_MODE=production
PORT=8080

DATABASE_URL=postgresql://luxe:REDACTED@db.example.com:5432/luxe?sslmode=require

JWT_ACCESS_SECRET=REDACTED_48_RANDOM_CHARS_FROM_OPENSSL
JWT_REFRESH_SECRET=A_DIFFERENT_REDACTED_48_RANDOM_CHARS_FROM_OPENSSL
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=https://shop.example.com,https://admin.example.com
FRONTEND_URL=https://shop.example.com
GOOGLE_CLIENT_ID=REDACTED.apps.googleusercontent.com

PAYMENT_PROVIDER_DEFAULT=paymongo
PAYMONGO_SECRET_KEY=sk_live_REDACTED
PAYMONGO_PUBLIC_KEY=pk_live_REDACTED
PAYMENT_WEBHOOK_SECRET=REDACTED_40_RANDOM_CHARS
ORDER_PAYMENT_EXPIRY_MINUTES=30

MAIL_PROVIDER=resend
MAIL_FROM=LUXE <orders@yourdomain.com>
MAIL_REPLY_TO=support@yourdomain.com
RESEND_API_KEY=re_REDACTED
SUPPORT_EMAIL=support@yourdomain.com

LOGIN_LOCKOUT_THRESHOLD=8
LOGIN_LOCKOUT_DURATION_MINUTES=15
ENFORCE_ADMIN_2FA=true

RATE_LIMIT_STORE=memory      # ← set to redis if running multiple backend instances
# REDIS_URL=redis://...

LOG_LEVEL=info
SENTRY_DSN=https://REDACTED@o123.ingest.sentry.io/4567
RELEASE_VERSION=git-sha-here
```
