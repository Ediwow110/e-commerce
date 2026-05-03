# Email DNS Execution Packet

Operational steps to make customer email actually deliver. Owner: DNS owner for the sender domain. Backup: technical owner.

> Replace `mail.example.com` with your real sender domain. Replace `<selector>` with the DKIM selector your provider tells you to use (Resend uses `resend`, SendGrid uses `s1`/`s2`, Mailgun uses `mta`/`k1`, etc.).

---

## 1. Sender domain verification

1. Provider dashboard → **Domains → Add domain** → enter `mail.example.com`.
2. Provider issues 3 records: 1 SPF (TXT), 1–2 DKIM (CNAME), 1 DMARC (TXT).
3. Copy them exactly. Do not edit.

## 2. SPF (TXT)

Add at root or `mail.example.com`:

```
v=spf1 include:<provider-spf-include> ~all
```

> If you already have an SPF record, **do not** add a second one. Merge `include:` clauses into the existing record. Two SPF records = automatic SPF fail.

## 3. DKIM (CNAME ×1–2)

Provider tells you the exact selector:

```
<selector>._domainkey.mail.example.com   CNAME   <selector>.<provider-host>
```

## 4. DMARC (TXT)

Add at `_dmarc.mail.example.com`:

```
v=DMARC1; p=none; rua=mailto:dmarc@mail.example.com; pct=100
```

Start with `p=none` (monitor only). After SPF + DKIM are passing in real traffic for 7 days, raise to `p=quarantine`, then later to `p=reject`.

## 5. Sender domain verification — final

1. Wait 5 min – 24 h for propagation.
2. Provider dashboard → **Verify**. All three records must turn ✅.
3. Set in production env:
   - `MAIL_PROVIDER=<resend|sendgrid|mailgun>`
   - `EMAIL_FROM=noreply@mail.example.com`
   - `SUPPORT_EMAIL=support@mail.example.com` (a mailbox a human reads)

## 6. Verification commands

```bash
# SPF
dig +short TXT mail.example.com

# DMARC
dig +short TXT _dmarc.mail.example.com

# DKIM (selector varies)
dig +short CNAME <selector>._domainkey.mail.example.com

# Save all three for evidence
{
  echo "== SPF =="; dig +short TXT mail.example.com
  echo "== DMARC =="; dig +short TXT _dmarc.mail.example.com
  echo "== DKIM =="; dig +short CNAME <selector>._domainkey.mail.example.com
} > ops/launch-evidence/<YYYY-MM-DD>/02-dns-dig.txt
```

## 7. Test email

1. From provider dashboard, send test to a fresh Gmail address.
2. Open in Gmail → 3-dot menu → **Show original**.
3. Confirm `SPF: pass`, `DKIM: pass`, `DMARC: pass`.
4. Save the page (redacted) as `02-dns-headers.txt`.

## 8. mail-tester.com

1. Visit mail-tester.com → copy the unique mailbox.
2. From provider, send a real-looking test email to that address.
3. Click "Then check your score". Score must be **≥ 9 / 10**.
4. Screenshot the result page (redact the unique mailbox URL) → `02-dns-mailtester.png`.

## 9. Pass / fail criteria

- **Pass:** All three `dig` queries return non-empty results matching the provider's spec; Gmail headers show all three `pass`; mail-tester ≥ 9 / 10.
- **Fail:** Any record missing or wrong; any header `none`/`softfail`/`fail`; mail-tester < 9.

## 10. Screenshots to capture

| File | What |
|---|---|
| `02-dns-provider.png` | Provider dashboard, all three records ✅ (private only — heavy redaction) |
| `02-dns-dig.txt` | Output of §6 |
| `02-dns-mailtester.png` | mail-tester result page, score ≥ 9/10 (redact mailbox) |
| `02-dns-headers.txt` | Gmail "Show original" headers (redact server names + Message-IDs) |

## 11. Fallbacks

- **Records not propagating after 24 h:** lower TTL, contact DNS host support, double-check there is no shadowing wildcard record.
- **DKIM fail:** confirm selector matches provider; some providers require two CNAMEs.
- **DMARC fail:** keep at `p=none` until SPF + DKIM are stable.
- **Late soft-launch only:** use the provider's own sender domain (`noreply@<brand>.resend.app`). Acceptable for soft launch only — **not** for full production.

## 12. Security warning

- **Never** commit raw provider-dashboard screenshots — they show account IDs and sometimes API keys.
- **Never** commit the mail-tester unique mailbox URL — it can be replayed for ~24 h.
- **Never** commit raw Gmail headers — they leak internal Message-IDs and server names. Redact per `EVIDENCE_SECURITY_POLICY.md` §5.3.
