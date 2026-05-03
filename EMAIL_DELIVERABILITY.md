# Email deliverability

`MAIL_PROVIDER=mock` is **rejected by preflight** in `LAUNCH_MODE=production`.
This document covers DNS setup so transactional mail actually reaches the
inbox once a real provider is configured.

## Pick a provider

| Provider | Env vars | Sandbox | Notes |
|---|---|---|---|
| Resend | `RESEND_API_KEY` | yes | Easiest setup, good defaults. |
| SendGrid | `SENDGRID_API_KEY` | yes | Mature, solid deliverability. |
| Mailgun | `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` | yes | Good if you already use Mailgun. |

## DNS records for your sender domain

Replace `yourdomain.com` with your real domain and `<provider>` with the
selected provider; copy the exact values from the provider dashboard.

### 1. SPF — authorise the provider to send for you

`TXT @  "v=spf1 include:<provider-spf-host> -all"`

For Resend: `include:_spf.resend.com`. SendGrid: `include:sendgrid.net`.
Mailgun: `include:mailgun.org`.

### 2. DKIM — provider signs every message; receivers verify

Each provider gives you 1–3 CNAME records like:

```
TXT  resend._domainkey         "k=rsa; p=MIGfMA0..."
CNAME s1._domainkey            s1.domainkey.u<id>.wl<x>.sendgrid.net
```

Paste them exactly as the dashboard shows.

### 3. DMARC — tell receivers what to do with failures

Start lenient, tighten over a week:

```
TXT _dmarc  "v=DMARC1; p=none; rua=mailto:dmarc-reports@yourdomain.com; pct=100"
```

After a week of clean reports, raise to `p=quarantine`, then `p=reject`.

### 4. MX (only if you also receive email at the domain)

Out of scope for transactional sending — only set MX if `support@yourdomain.com`
should be a real inbox.

## Sender identity

| Var | Example |
|---|---|
| `MAIL_FROM` | `LUXE Commerce <orders@yourdomain.com>` |
| `MAIL_REPLY_TO` | `support@yourdomain.com` |
| `SUPPORT_EMAIL` | `support@yourdomain.com` (also shown in the UI) |

The `From:` domain MUST be one you have completed SPF + DKIM for. Free webmail
domains (gmail.com, yahoo.com) as the From address are blocked by most ISPs
since 2024.

## Mail flows the app expects to send

| Trigger | Status | Notes |
|---|---|---|
| Order created (PENDING_PAYMENT) | ✅ implemented | Includes payment instructions / link. |
| Payment paid (order → PAID) | ✅ implemented | Only after verified webhook. |
| Payment failed | ⚠️ TODO stub | Tracked in mail.service. |
| Order shipped | ⚠️ TODO stub | Triggered when admin updates status. |
| Order delivered | ⚠️ TODO stub | |
| Order cancelled | ⚠️ TODO stub | |
| Order refunded | ⚠️ TODO stub | |
| Password reset | ✅ implemented | Token never logged. Email content does not reveal whether the address exists. |
| Admin invitation | ✅ implemented | Single-use token. |
| Order EXPIRED (cart abandoned) | optional | Recommend NOT to send — looks like spam. |

The TODO items are wired in `backend/src/mail.service.ts` as no-op stubs that
log `mail_skipped` so you can see when they should fire.

## Verification

After DNS propagates (~30 min):

1. Send a test order in staging.
2. Check the receiving inbox's "Show original" view:
   - `SPF: PASS`
   - `DKIM: PASS`
   - `DMARC: PASS`
3. Check <https://www.mail-tester.com> — aim for 9/10 or higher.
4. Bounce-test with a known-bad address; confirm your provider dashboard logs
   the bounce.

## Privacy / safety guarantees

- We never log full email bodies in production.
- Password reset / refresh tokens are never included in mail logs.
- Pino redactor strips `password`, `passwordHash`, `accessToken`,
  `refreshToken`, `authorization`, `cookie`, and `paymentMethodId`.

## When mail breaks

See `RUNBOOK.md → "Email delivery failure"`.
