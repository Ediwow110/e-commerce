# Fixes in this package

## Customer-first public navigation
- Removed the public `Admin Sign In` button from the storefront header.
- Public navbar now shows customer-focused `Sign In` / account icon only.
- Admin login is hidden from normal navigation and available only by direct URL: `/admin/login`.

## Customer authentication UX
- Added customer login route: `/customer/login`.
- Added customer register route: `/customer/register`.
- Added forgot password route: `/customer/forgot-password`.
- Customer Google Sign-In button now uses Google-style button design.
- Google login creates customer accounts only.

## Admin authentication UX
- Added private admin login route: `/admin/login`.
- Admin demo account defaults to `owner@luxe.test`.
- Admin login is separated from customer login.

## Email receipts and mail API
- Added a complete order receipt HTML email template.
- Receipt includes order number, items, totals, payment status, payment method, delivery address, and tracking link support.
- Added password reset email template and `/api/auth/forgot-password` endpoint.

## Smoothness and bug cleanup
- Fixed frontend demo auth role bug.
- Added browser URL route mapping for customer/admin pages.
- Kept admin effects and CRUD UI from previous package.
