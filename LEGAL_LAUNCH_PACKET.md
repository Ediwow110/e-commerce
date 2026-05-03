# Legal Launch Packet

Send this packet to your reviewing lawyer. It includes everything they need to review the four policy pages.

---

## 1. Pages requiring review

| # | Page | URL placeholder |
|---|---|---|
| 1 | Terms of Service | `https://yourdomain.example.com/terms` |
| 2 | Privacy Policy | `https://yourdomain.example.com/privacy` |
| 3 | Refund Policy | `https://yourdomain.example.com/refunds` |
| 4 | Shipping Policy | `https://yourdomain.example.com/shipping` |

Source location: `frontend/src/pages/Home.jsx` (sections `TermsPage`, `PrivacyPage`, `RefundsPage`, `ShippingPage`).

---

## 2. Business information for the lawyer

| Field | Value |
|---|---|
| Business legal name | `____________________` |
| Trading name (if different) | `____________________` |
| Jurisdiction (country / state / province) | `____________________` |
| Registered business address | `____________________` |
| Support email | `____________________` |
| Reply-to / customer-service email | `____________________` |
| Return / refund window (days) | `____________________` |
| Refund processing timeline (business days) | `____________________` |
| Shipping carriers used | `____________________` |
| Countries served | `____________________` |
| Data controller (legal entity name) | `____________________` |
| Data Protection Officer / contact | `____________________` |
| Payment providers in use | PayMongo / Maya / Xendit / `____________________` |
| Customer data collected | name, email, phone, shipping address, order history, payment metadata, IP, device info |
| Cookies / tracking tools in use | session cookie, CSRF cookie, `____________________` |
| Marketing email opt-in default | opt-in / opt-out: `____________________` |
| Age requirement for purchase | `____________________` |
| Dispute resolution venue | `____________________` |
| Governing law | `____________________` |

---

## 3. Lawyer sign-off checklist

The lawyer must confirm in writing:

- [ ] Terms of Service reviewed and approved
- [ ] Privacy Policy reviewed and approved
- [ ] Refund Policy reviewed and approved
- [ ] Shipping Policy reviewed and approved
- [ ] Cookie / tracking disclosures sufficient for jurisdiction
- [ ] Data-controller information complete
- [ ] Refund timeline matches actual operational capability
- [ ] Customer-rights language complete (right to access / delete / port)
- [ ] Marketing-email language complies with local rules
- [ ] No required clauses missing for jurisdiction

Reviewer name: `____________________`
Firm: `____________________`
Date of review: `____________________`
Approval reference: `____________________`

---

## 4. Launch hard-stop rules (legal)

The launch is **NO-GO** if **any** of these is true:

1. Terms of Service unreviewed.
2. Privacy Policy unreviewed.
3. Refund Policy unreviewed.
4. Shipping Policy unreviewed.
5. Any of the four pages still shows `REQUIRES LEGAL REVIEW` banner.
6. Refund timeline on the page does not match what operations can actually deliver.
7. Customer rights (access / delete / port) not described.
8. Data controller not named.

---

## 5. Evidence filenames to produce

| Filename | What |
|---|---|
| `01-legal-approval.pdf` | Lawyer's signed approval (private; commit summary row only) |
| `01-legal-terms.png` | Live `/terms` screenshot, no banner |
| `01-legal-privacy.png` | Live `/privacy` screenshot, no banner |
| `01-legal-refunds.png` | Live `/refunds` screenshot, no banner |
| `01-legal-shipping.png` | Live `/shipping` screenshot, no banner |
| `01-legal-banner-grep.txt` | Output of `grep -c "REVIEW_BANNER" frontend/src/pages/Home.jsx` (must be `0`) |

---

## 6. Redaction guidance

- **Lawyer approval PDF:** redact lawyer's home address, signature image, personal email. Keep firm name, date, scope of approval. If signature image cannot be redacted cleanly, keep PDF private and commit only the index row.
- **Page screenshots:** redact any non-public contact email shown on the page (use the public `support@…` only).
- See `EVIDENCE_SECURITY_POLICY.md` §4 for tooling.
