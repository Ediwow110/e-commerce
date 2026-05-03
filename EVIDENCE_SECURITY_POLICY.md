# Evidence Security Policy

This policy governs how launch-readiness evidence is captured, redacted, stored, and committed.

> **Golden rule.** This repo is publicly cloneable on GitHub. Treat every commit as if it were a public press release. **Raw sensitive evidence never enters Git history.** Originals live in a private store; only sanitized derivatives are committed.

---

## 1. What MAY be committed (raw)

- Static page screenshots that contain only public marketing copy and **no** customer data, PII, or admin URLs (e.g. `/terms`, `/privacy`, `/refunds`, `/shipping` after redaction below).
- Plain text outputs that contain only public DNS records (`dig` of public TXT/CNAME records).
- Greps over source files (e.g. `01-legal-banner-grep.txt`) where the content is just `0` or a count.
- Synthetic logs that contain only loglines, no identifiers (`cron.expire-orders complete`).
- Lists of alert rule names, schedule strings, monitor names — names only, no thresholds tied to internal infra hostnames.
- Sanitized derivatives produced under the rules in §4.

## 2. What MUST stay private (originals only)

Store under `PRIVATE_LOCATION_PLACEHOLDER` (1Password / Vault / S3 with KMS / Google Drive with restricted ACL).

- The full lawyer approval PDF if it includes the lawyer's home address, email, or signature image.
- Provider dashboard screenshots that show secret keys, webhook signing secrets, account IDs, settlement bank accounts, statement balances, business KYC documents, IDs.
- Any screenshot of `/admin/*`.
- Any log line containing `Authorization:`, `cookie:`, `pk_live_…`, `sk_live_…`, `whsec_…`, JWTs, refresh tokens, customer email + name + amount triple, full card data (PAN, CVC), bank statements.
- Customer support inbox screenshots (always contain emails and order IDs).
- Sentry stack traces if they contain customer email, order ID, or payment provider reference.
- Mail-tester result page with the random unique mailbox visible (it can be replayed for ~24h).
- Gmail "Show original" headers raw (contains internal Message-IDs, full sender domain config).

## 3. What may be committed as SUMMARY ONLY

When the underlying artefact is private but you must prove it exists:

- Replace the artefact with a one-line entry in `SANITIZED_LAUNCH_EVIDENCE_INDEX.md` of the form
  `category | filename | original at: <PRIVATE_LOCATION_PLACEHOLDER> | reviewer | date | PASS/FAIL`.

## 4. Redaction rules

Redact **before** the file ever touches a Git working tree.

### 4.1 Always redact

| Field | Redaction |
|---|---|
| Live API keys (`sk_live_…`, `pk_live_…`, `xnd_…`, `whsec_…`) | replace with `sk_live_REDACTED` |
| Webhook signing secrets | `whsec_REDACTED` |
| JWTs / session tokens / refresh tokens | `eyJ…REDACTED` |
| Customer email | `customer@REDACTED` |
| Customer full name | `[REDACTED]` |
| Customer phone | `+63-XXX-XXX-XXXX` |
| Shipping address | `[ADDRESS REDACTED]` |
| Card PAN / CVC / expiry | never appear; if they do, **destroy and re-capture** |
| Order amount with name + email | redact the email + name pair |
| Bank account / IBAN / settlement account | `BANK-XXXX-1234` (last 4 only) |
| Government IDs in KYC | redact entirely |
| Internal hostnames / IPs | `internal-host.REDACTED` |
| Sentry DSN | `https://REDACTED@oXXXXX.ingest.sentry.io/XXXXX` |
| Database URL | `postgres://REDACTED` |
| Provider account ID | `acct_REDACTED` |

### 4.2 Image redaction tooling

- macOS Preview / Markup: solid black rectangle, then **flatten** (export as PNG, do not save with annotation layers — those can be removed).
- Or `oxipng` / `magick mogrify` to strip EXIF after redaction.
- Verify: open in a hex editor or `exiftool` and confirm no metadata leaks the unredacted original.

### 4.3 Text/log redaction

```bash
# Generic redactor (adjust patterns to your situation; review the diff before committing)
sed -E \
  -e 's/(sk_live_)[A-Za-z0-9]+/\1REDACTED/g' \
  -e 's/(pk_live_)[A-Za-z0-9]+/\1REDACTED/g' \
  -e 's/(whsec_)[A-Za-z0-9]+/\1REDACTED/g' \
  -e 's/(Bearer )[A-Za-z0-9._-]+/\1REDACTED/g' \
  -e 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/customer@REDACTED/g' \
  -e 's/postgres:\/\/[^ ]+/postgres:\/\/REDACTED/g' \
  raw.log > redacted.log
```

## 5. Per-category redaction rules

### 5.1 Payment evidence

- **Provider dashboard screenshot:** redact API keys, account IDs, bank accounts, settlement balances, business KYC docs.
- **Preflight log:** redact `DATABASE_URL`, any token, any `sk_live_…` if accidentally echoed.
- **Filled payment test record:** redact customer email/phone/address; keep order number, provider reference (last 6), webhook event ID (last 8), amount, currency, status.
- **Refund screenshot:** redact customer name + amount + email triple; keep refund reference (last 6), date, status.

### 5.2 Legal evidence

- **Lawyer approval PDF:** redact lawyer's home address, signature image, personal email; keep firm name, date, scope of approval.
- **Page screenshots:** redact any contact email shown on the page that isn't already public.

### 5.3 DNS evidence

- **Provider dashboard:** redact API keys, account IDs.
- **`dig` output:** safe — DNS is public. (DKIM CNAME selector reveals provider — usually OK.)
- **mail-tester:** redact the unique recipient address (do not re-share that URL).
- **Gmail headers:** redact `Authentication-Results` server names and any internal Message-ID hostnames; keep the `pass`/`fail` verdicts and `dmarc=pass header.from=…`.

### 5.4 Cron evidence

- **Scheduler screenshot:** redact internal hostnames; keep the schedule string, command, last-run time.
- **Run log:** redact DB hostnames; keep `cron.expire-orders complete` line and timestamp.
- **Manual proof:** redact customer order data; keep order number (synthetic test order), `EXPIRED` status, `stockRestoredAt`.

### 5.5 Monitoring evidence

- **Sentry screenshot:** use a known-safe test event; redact DSN; ensure no real customer data appears in the event payload.
- **Uptime monitor:** redact internal monitor account ID; keep monitor name + last 24h status graph.
- **Alert delivery screenshot:** redact phone number; keep timestamp + alert rule name.
- **Rules export:** rule names only.

### 5.6 Customer / support data

- **Never commit** the support inbox raw, ever.
- If a customer interaction must be referenced, summarise: "Order #1234 — customer reported delivery delay; refund issued T+12h." No emails, names, phones, addresses.

## 6. How to store originals privately

Originals live in **one** of:

- **1Password Business vault** named `launch-evidence-<YYYY-MM-DD>` with access limited to: business owner, technical owner, support owner, on-call.
- **AWS S3 bucket** `s3://luxe-launch-evidence/<YYYY-MM-DD>/` with `BlockPublicAccess` ON, KMS encryption, lifecycle rule moving to Glacier after 90 days, CloudTrail enabled.
- **Google Drive shared folder** under the company workspace, restricted to the four owners only, link sharing OFF.

Whichever is chosen, write the canonical location in `SANITIZED_LAUNCH_EVIDENCE_INDEX.md` under "Original stored at".

## 7. Sanitized evidence index

For every required file, the repo gets one row in `SANITIZED_LAUNCH_EVIDENCE_INDEX.md`:

```
category | filename | original at: <PRIVATE_LOCATION_PLACEHOLDER> | sanitized committed: y/n | redacted: y/n | reviewer | date | PASS/FAIL | notes | launch impact
```

## 8. Sign-off

The following must initial each row of the sanitized index before the gate sheet is signed:

- Technical owner — confirms files are technically sound and complete.
- Security / on-call — confirms redaction is correct, no secrets leak, originals are in the private store.
- Business owner — confirms legal and customer data redactions are acceptable.

If any reviewer objects, the file goes back to redaction.

---

## 9. Classification of every required evidence file

| Category | File | Classification | Notes |
|---|---|---|---|
| Legal | `01-legal-approval.pdf` | **COMMIT SUMMARY ONLY** | Lawyer signature + personal address private; commit a redacted excerpt or just the index row |
| Legal | `01-legal-terms.png` | **SAFE TO COMMIT REDACTED** | Public page; redact any non-public contact email |
| Legal | `01-legal-privacy.png` | **SAFE TO COMMIT REDACTED** | Same |
| Legal | `01-legal-refunds.png` | **SAFE TO COMMIT REDACTED** | Same |
| Legal | `01-legal-shipping.png` | **SAFE TO COMMIT REDACTED** | Same |
| Legal | `01-legal-banner-grep.txt` | **SAFE TO COMMIT RAW** | Just a count |
| DNS | `02-dns-provider.png` | **PRIVATE ONLY** | Dashboard contains keys + account IDs; sanitize heavily or keep private |
| DNS | `02-dns-dig.txt` | **SAFE TO COMMIT RAW** | Public DNS data |
| DNS | `02-dns-mailtester.png` | **SAFE TO COMMIT REDACTED** | Redact the unique mailbox URL/handle |
| DNS | `02-dns-headers.txt` | **SAFE TO COMMIT REDACTED** | Redact server names + internal Message-IDs |
| Payments | `03-payment-dashboard.png` | **PRIVATE ONLY** | Likely shows keys/account/settlement; never commit raw |
| Payments | `03-payment-preflight.log` | **SAFE TO COMMIT REDACTED** | Redact DB URLs, any token; keep "preflight ok" line |
| Payments | completed `REAL_PAYMENT_TEST_RECORD.md` | **COMMIT SUMMARY ONLY** | Original signed PDF private; commit only the redacted summary table |
| Payments | `03-payment-refund.png` | **PRIVATE ONLY** | Customer name + email + amount visible |
| Cron | `04-cron-schedule.png` | **SAFE TO COMMIT REDACTED** | Redact internal hostnames |
| Cron | `04-cron-log.txt` | **SAFE TO COMMIT REDACTED** | Redact DB host; keep `complete` line + timestamp |
| Cron | `04-cron-alert.png` | **SAFE TO COMMIT REDACTED** | Redact account IDs |
| Cron | `04-cron-manual-proof.txt` | **SAFE TO COMMIT REDACTED** | Use a test order; redact any incidental customer data |
| Monitoring | `05-mon-sentry.png` | **SAFE TO COMMIT REDACTED** | Redact DSN; use a known-safe test event |
| Monitoring | `05-mon-uptime.png` | **SAFE TO COMMIT REDACTED** | Redact monitor account ID |
| Monitoring | `05-mon-alert-test.png` | **SAFE TO COMMIT REDACTED** | Redact phone number |
| Monitoring | `05-mon-rules.txt` | **SAFE TO COMMIT RAW** | Rule names only |
| Final | `SOFT_LAUNCH_GO_NO_GO.signed.pdf` | **COMMIT SUMMARY ONLY** | Signatures + names private; commit the index row + a redacted summary if needed |
