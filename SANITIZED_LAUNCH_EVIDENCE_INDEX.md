# Sanitized Launch Evidence Index

This file proves launch readiness without exposing sensitive artefacts. Every required evidence file gets one row. Originals stay in `PRIVATE_LOCATION_PLACEHOLDER` (set this in your `EVIDENCE_SECURITY_POLICY.md` §6 store).

> **Rule:** no row may be marked PASS unless the **Sanitized committed** column is `yes` (when the policy allows commit) or the **Original stored at** field points to a real, named location in your private store.

**Date of evidence cycle:** `____________________`
**Sanitization sign-off (security / on-call):** `____________________`

---

## Legal

| Filename | Original stored at | Sanitized committed | Redaction completed | Reviewer | Date | PASS / FAIL | Notes | Launch impact if FAIL |
|---|---|---|---|---|---|---|---|---|
| `01-legal-approval.pdf` | `PRIVATE_LOCATION_PLACEHOLDER` | no (summary only) | yes / no | | | PASS / FAIL | Commit only a one-line attest in this file | Refund / privacy claims unenforceable |
| `01-legal-terms.png` | `PRIVATE_LOCATION_PLACEHOLDER` | yes / no | yes / no | | | PASS / FAIL | | Cannot prove banner gone |
| `01-legal-privacy.png` | `PRIVATE_LOCATION_PLACEHOLDER` | yes / no | yes / no | | | PASS / FAIL | | Cannot prove banner gone |
| `01-legal-refunds.png` | `PRIVATE_LOCATION_PLACEHOLDER` | yes / no | yes / no | | | PASS / FAIL | | Cannot prove banner gone |
| `01-legal-shipping.png` | `PRIVATE_LOCATION_PLACEHOLDER` | yes / no | yes / no | | | PASS / FAIL | | Cannot prove banner gone |
| `01-legal-banner-grep.txt` | n/a — public | yes | n/a | | | PASS / FAIL | Must be `0` | Banner still in source |

- [ ] Legal evidence reviewed and safe

## Email DNS

| Filename | Original stored at | Sanitized committed | Redaction completed | Reviewer | Date | PASS / FAIL | Notes | Launch impact if FAIL |
|---|---|---|---|---|---|---|---|---|
| `02-dns-provider.png` | `PRIVATE_LOCATION_PLACEHOLDER` | no (private only) | yes / no | | | PASS / FAIL | Dashboard shows account IDs / keys | Cannot prove provider verification |
| `02-dns-dig.txt` | n/a — public | yes | n/a | | | PASS / FAIL | DNS is public | Records not propagated |
| `02-dns-mailtester.png` | `PRIVATE_LOCATION_PLACEHOLDER` | yes / no | yes / no | | | PASS / FAIL | Redact unique mailbox URL | Score < 9/10 |
| `02-dns-headers.txt` | `PRIVATE_LOCATION_PLACEHOLDER` | yes / no | yes / no | | | PASS / FAIL | Redact server names + Message-IDs | SPF/DKIM/DMARC fail |

- [ ] DNS evidence reviewed and safe

## Payments

| Filename | Original stored at | Sanitized committed | Redaction completed | Reviewer | Date | PASS / FAIL | Notes | Launch impact if FAIL |
|---|---|---|---|---|---|---|---|---|
| `03-payment-dashboard.png` | `PRIVATE_LOCATION_PLACEHOLDER` | no (private only) | yes / no | | | PASS / FAIL | Contains live keys / settlement | Live mode unproven |
| `03-payment-preflight.log` | `PRIVATE_LOCATION_PLACEHOLDER` | yes / no | yes / no | | | PASS / FAIL | Redact DB URL / tokens | Sandbox keys still in env |
| Completed `REAL_PAYMENT_TEST_RECORD.md` | `PRIVATE_LOCATION_PLACEHOLDER` | no (summary only) | yes / no | | | PASS / FAIL | Customer PII in original | No proof real payment settled |
| `03-payment-refund.png` | `PRIVATE_LOCATION_PLACEHOLDER` | no (private only) | yes / no | | | PASS / FAIL | Customer name + amount visible | No proof refund executed |

- [ ] Payment evidence reviewed and safe

## Cron

| Filename | Original stored at | Sanitized committed | Redaction completed | Reviewer | Date | PASS / FAIL | Notes | Launch impact if FAIL |
|---|---|---|---|---|---|---|---|---|
| `04-cron-schedule.png` | `PRIVATE_LOCATION_PLACEHOLDER` | yes / no | yes / no | | | PASS / FAIL | Redact internal hostnames | Cron not scheduled |
| `04-cron-log.txt` | `PRIVATE_LOCATION_PLACEHOLDER` | yes / no | yes / no | | | PASS / FAIL | Keep `complete` line + timestamp | Cron not running |
| `04-cron-alert.png` | `PRIVATE_LOCATION_PLACEHOLDER` | yes / no | yes / no | | | PASS / FAIL | Redact account IDs | No stale-cron alert |
| `04-cron-manual-proof.txt` | `PRIVATE_LOCATION_PLACEHOLDER` | yes / no | yes / no | | | PASS / FAIL | Use a test order | Expiry doesn't restore stock |

- [ ] Cron evidence reviewed and safe

## Monitoring

| Filename | Original stored at | Sanitized committed | Redaction completed | Reviewer | Date | PASS / FAIL | Notes | Launch impact if FAIL |
|---|---|---|---|---|---|---|---|---|
| `05-mon-sentry.png` | `PRIVATE_LOCATION_PLACEHOLDER` | yes / no | yes / no | | | PASS / FAIL | Redact DSN | Sentry not receiving |
| `05-mon-uptime.png` | `PRIVATE_LOCATION_PLACEHOLDER` | yes / no | yes / no | | | PASS / FAIL | Redact monitor account ID | /health or /ready not monitored |
| `05-mon-alert-test.png` | `PRIVATE_LOCATION_PLACEHOLDER` | yes / no | yes / no | | | PASS / FAIL | Redact phone number | Alerts don't page |
| `05-mon-rules.txt` | n/a — names only | yes | n/a | | | PASS / FAIL | Rule names only | Alerts not configured |

- [ ] Monitoring evidence reviewed and safe

## Final sign-off

| Filename | Original stored at | Sanitized committed | Redaction completed | Reviewer | Date | PASS / FAIL | Notes | Launch impact if FAIL |
|---|---|---|---|---|---|---|---|---|
| `SOFT_LAUNCH_GO_NO_GO.signed.pdf` | `PRIVATE_LOCATION_PLACEHOLDER` | no (summary only) | yes / no | | | PASS / FAIL | Signatures private; commit summary row only | No authorisation to launch |

- [ ] Final signoff reviewed and safe

---

## Master attestation

Every box above must be ticked AND every row above must show PASS before `SOFT_LAUNCH_GO_NO_GO.md` may be signed.

| Role | Name | Signature / approval ref | Date |
|---|---|---|---|
| Technical owner | | | |
| Security / on-call | | | |
| Business owner | | | |
| Support owner | | | |
