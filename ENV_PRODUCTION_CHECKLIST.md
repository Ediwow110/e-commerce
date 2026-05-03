# Production Environment Variables — Checklist

Every variable below must be set on your production hosting platform (e.g. managed container platform → "Environment / Secrets" panel) **before** the API is allowed to serve traffic. The boot-time preflight in `backend/src/preflight.ts` will refuse to start the process when `LAUNCH_MODE=production` and any **Required** variable below is missing, weak, or contradictory.

**Where to set:** your platform's secrets panel (e.g. Kubernetes Secret, container platform "env" tab, Replit Deployment Secrets). Never commit any of these to the repo. Never paste them into chat or logs.

**How to verify (after setting):** call `GET /ready` from outside the cluster — `200 {"ready":true}` means preflight passed. Container logs will print `[preflight] ok` on successful boot.

---

## Legend

- **Boot-refuses?** = "Yes" if `LAUNCH_MODE=production` will refuse to start when this is missing/invalid. "No" if the app will boot but the related feature is degraded.

---

## Core / runtime

| Var | Required? | Boot-refuses? | Safe example | Notes |
|---|---|---|---|---|
| `NODE_ENV` | yes | yes | `production` | Must equal `production`. |
| `LAUNCH_MODE` | yes | yes | `production` | One of `local` / `staging` / `production`. Drives the strict preflight. |
| `PORT` | yes | no | `8080` | Set by the platform; do not hard-code. |
| `LOG_LEVEL` | optional | no | `info` | One of `debug`/`info`/`warn`/`error`. Default `info`. |

---

## Domains & CORS

| Var | Required? | Boot-refuses? | Safe example | Notes |
|---|---|---|---|---|
| `PUBLIC_BASE_URL` | yes | yes | `https://yourdomain.example.com` | Used in email links, webhook URLs, OAuth callbacks. Must be HTTPS in production. |
| `FRONTEND_URL` | yes | yes | `https://yourdomain.example.com` | Same as above unless the SPA is on a separate domain. Must be HTTPS. |
| `CORS_ORIGIN` | yes | yes | `https://yourdomain.example.com` | Comma-separated allow-list. Preflight refuses `*` in production. |

---

## Database

| Var | Required? | Boot-refuses? | Safe example | Notes |
|---|---|---|---|---|
| `DATABASE_URL` | yes | yes | `postgres://user:****@db.internal:5432/luxe?sslmode=require` | Managed Postgres. `sslmode=require` is mandatory in production. |
| `DATABASE_POOL_MAX` | optional | no | `10` | Default 10. Tune to your provider's connection limit. |

---

## Sessions / JWT / CSRF

| Var | Required? | Boot-refuses? | Safe example | Notes |
|---|---|---|---|---|
| `SESSION_SECRET` | yes | yes | a random 64-char string | Refused if length < 32 or matches a known weak pattern. |
| `JWT_ACCESS_SECRET` | yes | yes | random 64-char string | Refused if length < 32 **or** equal to `JWT_REFRESH_SECRET`. |
| `JWT_REFRESH_SECRET` | yes | yes | random 64-char string, different from above | Refused if length < 32 or equal to access secret. |
| `JWT_ACCESS_TTL` | optional | no | `15m` | Default `15m`. |
| `JWT_REFRESH_TTL` | optional | no | `30d` | Default `30d`. |
| `CSRF_SECRET` | yes | yes | random 64-char string | Refused if length < 32. |
| `COOKIE_SECURE` | yes | yes | `true` | Refused as `false` in production. |
| `COOKIE_SAMESITE` | optional | no | `lax` | One of `lax`/`strict`/`none`. Default `lax`. |

To generate a strong secret locally without leaking it:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Paste the output **directly into your platform's secrets UI**. Do not write it to a file.

---

## 2FA / admin

| Var | Required? | Boot-refuses? | Safe example | Notes |
|---|---|---|---|---|
| `ENFORCE_ADMIN_2FA` | yes | yes | `true` | Refused as `false` in production. (And `twoFactor.ts::isTwoFactorRequired` enforces it anyway as defence-in-depth.) |
| `TWO_FA_ISSUER` | optional | no | `LUXE Commerce` | Shown in the user's authenticator app. |

---

## Rate limiting

| Var | Required? | Boot-refuses? | Safe example | Notes |
|---|---|---|---|---|
| `RATE_LIMIT_STORE` | yes | yes | `redis` (or `memory` only if single-replica) | Refused as `memory` in production unless single-replica deployment is explicitly acknowledged. Use `redis` if you have ≥ 2 replicas. |
| `REDIS_URL` | conditional | yes if `RATE_LIMIT_STORE=redis` | `redis://default:****@redis.internal:6379` | Required only when `RATE_LIMIT_STORE=redis`. |

---

## Email

| Var | Required? | Boot-refuses? | Safe example | Notes |
|---|---|---|---|---|
| `EMAIL_PROVIDER` | yes | yes | `resend` | One of `resend`/`sendgrid`/`mailgun`. |
| `EMAIL_FROM` | yes | yes | `LUXE Commerce <noreply@mail.example.com>` | Sender domain must match SPF/DKIM/DMARC. |
| `SUPPORT_EMAIL` | yes | yes | `support@example.com` | Shown in customer-facing error messages and emails. |
| `RESEND_API_KEY` | conditional | yes if provider=resend | `re_********` | |
| `SENDGRID_API_KEY` | conditional | yes if provider=sendgrid | `SG.********` | |
| `MAILGUN_API_KEY` | conditional | yes if provider=mailgun | `********` | Plus `MAILGUN_DOMAIN`. |
| `MAILGUN_DOMAIN` | conditional | yes if provider=mailgun | `mail.example.com` | |

---

## Payments — PayMongo

| Var | Required? | Boot-refuses? | Safe example | Notes |
|---|---|---|---|---|
| `PAYMONGO_SECRET_KEY` | conditional | yes if PayMongo enabled | `sk_live_********` | Refused if value starts with `sk_test_`. |
| `PAYMONGO_PUBLIC_KEY` | conditional | yes if PayMongo enabled | `pk_live_********` | Refused if value starts with `pk_test_`. |
| `PAYMONGO_WEBHOOK_SECRET` | conditional | yes if PayMongo enabled | `whsec_********` | |

## Payments — Maya

| Var | Required? | Boot-refuses? | Safe example | Notes |
|---|---|---|---|---|
| `MAYA_SECRET_KEY` | conditional | yes if Maya enabled | `sk-live-********` | Refused if `sk-test-`. |
| `MAYA_PUBLIC_KEY` | conditional | yes if Maya enabled | `pk-live-********` | Refused if `pk-test-`. |
| `MAYA_WEBHOOK_SECRET` | conditional | yes if Maya enabled | `********` | |

## Payments — Xendit

| Var | Required? | Boot-refuses? | Safe example | Notes |
|---|---|---|---|---|
| `XENDIT_SECRET_KEY` | conditional | yes if Xendit enabled | `xnd_production_********` | Refused if `xnd_development_`. |
| `XENDIT_PUBLIC_KEY` | conditional | yes if Xendit enabled | `xnd_public_production_********` | |
| `XENDIT_WEBHOOK_TOKEN` | conditional | yes if Xendit enabled | `********` | |

> At least one of {PayMongo, Maya, Xendit} must be fully configured in production, or no checkout will succeed.

---

## Google Sign-In (OAuth)

| Var | Required? | Boot-refuses? | Safe example | Notes |
|---|---|---|---|---|
| `GOOGLE_CLIENT_ID` | conditional | yes if Google login enabled | `********.apps.googleusercontent.com` | |
| `GOOGLE_CLIENT_SECRET` | conditional | yes if Google login enabled | `GOCSPX-********` | |
| `GOOGLE_REDIRECT_URI` | conditional | yes if Google login enabled | `https://yourdomain.example.com/api/auth/google/callback` | Must match what's configured in Google Cloud Console. |

---

## Monitoring

| Var | Required? | Boot-refuses? | Safe example | Notes |
|---|---|---|---|---|
| `SENTRY_DSN` | yes | no (warns) | `https://****@****.ingest.sentry.io/****` | Boot warns if missing in production but does not refuse. Strongly recommended. |
| `SENTRY_ENVIRONMENT` | optional | no | `production` | |
| `SENTRY_TRACES_SAMPLE_RATE` | optional | no | `0.1` | |

---

## Order / business behaviour

| Var | Required? | Boot-refuses? | Safe example | Notes |
|---|---|---|---|---|
| `ORDER_EXPIRY_MINUTES` | optional | no | `30` | How long an unpaid order holds stock. Default `30`. |
| `STORE_CURRENCY` | optional | no | `PHP` | ISO 4217 currency code. |
| `MIN_ORDER_AMOUNT` | optional | no | `100` | Minimum order in smallest currency unit. |

---

## How to verify the whole environment

After setting all variables and (re)deploying:

```bash
# 1. Should return 200 + {"ready":true}
curl -i https://yourdomain.example.com/ready

# 2. In container logs, look for the preflight summary
#    [preflight] ok — LAUNCH_MODE=production, providers=[paymongo,xendit], rateLimit=redis, 2fa=enforced
```

If `/ready` returns `503`, the container logs will list **exactly** which env var failed which check. Fix it, redeploy, retry.

---

## Production env template (for your secrets manager — fill in safely, do not commit)

```
NODE_ENV=production
LAUNCH_MODE=production
PUBLIC_BASE_URL=https://yourdomain.example.com
FRONTEND_URL=https://yourdomain.example.com
CORS_ORIGIN=https://yourdomain.example.com
DATABASE_URL=postgres://user:PASSWORD@host:5432/luxe?sslmode=require
SESSION_SECRET=...           # 48+ random bytes, base64url
JWT_ACCESS_SECRET=...        # 48+ random bytes, distinct
JWT_REFRESH_SECRET=...       # 48+ random bytes, distinct
CSRF_SECRET=...              # 48+ random bytes
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
ENFORCE_ADMIN_2FA=true
RATE_LIMIT_STORE=redis
REDIS_URL=redis://default:PASSWORD@host:6379
EMAIL_PROVIDER=resend
EMAIL_FROM=LUXE Commerce <noreply@mail.example.com>
SUPPORT_EMAIL=support@example.com
RESEND_API_KEY=re_...
PAYMONGO_SECRET_KEY=sk_live_...
PAYMONGO_PUBLIC_KEY=pk_live_...
PAYMONGO_WEBHOOK_SECRET=whsec_...
SENTRY_DSN=https://...@....ingest.sentry.io/...
SENTRY_ENVIRONMENT=production
ORDER_EXPIRY_MINUTES=30
```
