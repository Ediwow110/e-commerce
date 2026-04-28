# Production Restrictions Implemented

## User types

- `GUEST`: no database role; can browse public storefront only.
- `CUSTOMER`: can manage their own account, wishlist, cart, checkout, orders, and reviews.
- `STAFF` roles: `STAFF`, `MANAGER`, `INVENTORY_STAFF`, `ORDER_STAFF`, `CONTENT_STAFF`, `SUPPORT_STAFF`.
- `SUPER_ADMIN`: owner-level account with full access.

## Customer rules

- Public browsing does not require login.
- Wishlist, account, order history, tracking, and checkout require a customer token.
- Admin/staff users cannot place customer orders from the storefront.
- Google Sign-In can create customer accounts only. It cannot create public admin accounts.

## Checkout rules

- Cart cannot be empty.
- Product must still be active.
- Variant stock must be enough before order creation.
- Store pickup has no delivery address requirement.
- Delivery orders require delivery address before order creation.
- Shipping fee is calculated by the backend, not trusted from the frontend.
- Payment checkout is created only after a valid order exists.

## Payment rules

- Final order total comes from backend product, variant, discount, and shipping logic.
- Payment status cannot be marked paid by the frontend.
- Webhooks are signature checked with `PAYMENT_WEBHOOK_SECRET` in production.
- Duplicate webhook events are ignored through the `WebhookEvent` table.

## Admin rules

- No public admin registration.
- Super Admin creates staff/admin accounts from `/admin/users`.
- `/admin/users` and `/admin/settings` require `SUPER_ADMIN`.
- Staff modules are restricted by role in both frontend route guards and backend middleware.
- Mutating admin API calls are recorded in `AuditLog`.

## Seed accounts

Password for demo accounts: `password123`

- `owner@luxe.test` → `SUPER_ADMIN`
- `admin@luxe.test` → `ADMIN`
- `inventory@luxe.test` → `INVENTORY_STAFF`
- `orders@luxe.test` → `ORDER_STAFF`
- `customer@luxe.test` → `CUSTOMER`
