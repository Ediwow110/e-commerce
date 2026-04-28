# LUXE Commerce Full Stack

This package contains:

```txt
frontend/  React + Vite premium storefront/admin UI
backend/   Production-style REST API with auth, products, cart, orders, admin, reports, and API mail
```

## Setup overview

This refactor hardens the app toward production behavior:

- Customer login and admin login are separate backend endpoints.
- Google Sign-In is customer-only.
- Admin write routes validate and allowlist request bodies.
- Password reset tokens and refresh sessions are persisted.
- Audit logs redact sensitive payload fields.
- Frontend mock mode is restricted to development when `VITE_API_URL` is absent.

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

## Run backend

```bash
cd backend
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Create `backend/.env` from `backend/.env.example` before starting the API.

## Environment variables

### Backend

Required values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/luxe_commerce?schema=public
JWT_ACCESS_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
PAYMENT_WEBHOOK_SECRET=replace_me
```

`PAYMENT_WEBHOOK_SECRET` is mandatory in production. The backend now fails fast if it is missing while `NODE_ENV=production`.

Optional seed values:

```env
SEED_SUPER_ADMIN_EMAIL=owner@luxe.test
SEED_SUPER_ADMIN_PASSWORD=set_a_unique_password_to_create_initial_super_admin
SEED_CUSTOMER_PASSWORD=password123
```

If `SEED_SUPER_ADMIN_PASSWORD` is empty, the seed will not create a staff/admin account.

### Frontend

```env
VITE_API_URL=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

## Mail API

The backend supports API-based mail providers: Resend, SendGrid, Mailgun, or mock mode. Configure it in `backend/.env`.

## Payment Provider Configuration

### Supported Providers

| Provider | Region | Features | Setup |
|----------|--------|----------|-------|
| **PayMongo** | Philippines | Cards, GCash, Maya, GrabPay | [Dashboard](https://dashboard.paymongo.com) |
| **Maya** | Philippines | QR, Cards, Wallet | [Developers](https://developers.maya.ph) |
| **Xendit** | Southeast Asia | Cards, Virtual Accounts, eWallets | [Dashboard](https://dashboard.xendit.co) |
| **Manual** | Any | Bank transfer, COD, QR (admin verifies) | No API keys needed |
| **Mock** | Development only | Simulated payments | `NODE_ENV=development` only |

### Production Requirements

1. **Set a real provider** - `mock` is rejected in production:
   ```env
   PAYMENT_PROVIDER_DEFAULT=paymongo  # or maya, xendit, manual
   ```

2. **Configure provider API keys** (based on selected provider):
   ```env
   # For PayMongo
   PAYMONGO_SECRET_KEY=sk_test_...
   PAYMONGO_PUBLIC_KEY=pk_test_...

   # For Maya
   MAYA_PUBLIC_KEY=pk-...
   MAYA_SECRET_KEY=sk-...

   # For Xendit
   XENDIT_SECRET_KEY=xnd_...
   ```

3. **Set webhook secret** (required in production):
   ```env
   PAYMENT_WEBHOOK_SECRET=whsec_...  # openssl rand -hex 32
   ```

4. **Configure webhook URLs** in your provider dashboard:
   - PayMongo: `https://your-api.com/api/payments/webhook/paymongo`
   - Maya: `https://your-api.com/api/payments/webhook/maya`
   - Xendit: `https://your-api.com/api/payments/webhook/xendit`

### Webhook Verification

The backend verifies webhook signatures using `PAYMENT_WEBHOOK_SECRET`:
- HMAC-SHA256 signature validation
- Duplicate event protection via `WebhookEvent` table
- Amount/currency validation against stored payment records
- Provider-specific event type allowlisting

### Checkout Flow

1. Customer completes checkout form → `POST /orders` creates order
2. Frontend calls `POST /payments/checkout` with `orderId` and `provider`
3. Backend creates checkout session with provider → returns `checkoutUrl`
4. Frontend redirects customer to `checkoutUrl` (provider's payment page)
5. Customer completes payment on provider's site
6. Provider sends webhook to backend
7. Backend verifies signature, marks order as paid
8. Customer redirected back to confirmation page

## Security + Google Sign-In

The backend now includes production-style security middleware, auth rate limits, JWT auth, RBAC, request validation, mail API support, and Google Sign-In token verification.

See:

```txt
backend/SECURITY.md
```

Configure Google OAuth using:

```env
# backend/.env
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com

# frontend/.env
VITE_API_URL=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

Google Sign-In is intentionally limited to customer accounts. Admin/staff users must use the staff login form.

## Prisma and migrations

New auth persistence tables were added:

- `PasswordResetToken`
- `RefreshSession`

Run Prisma generation after pulling these changes:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

## Added in this build

- Payment provider layer for PayMongo, Maya, Xendit, Manual, and Mock mode.
- Customer checkout payment endpoint: `POST /api/payments/checkout`.
- Payment webhook starter endpoint: `POST /api/payments/webhook/:provider`.
- Admin CRUD API routes for products, categories, variants, inventory, customers, promos, reviews, payments, shipping, content, users, and settings.
- Interactive admin CRUD frontend with API-backed read/write behavior when the backend is configured.

## Authentication routes

```txt
POST /api/auth/customer/login
POST /api/auth/admin/login
POST /api/auth/google
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/invite/:token
POST /api/auth/invite/accept
```

## Staff invitation flow

- `POST /api/admin/users` creates a disabled staff/admin user plus a persisted hashed invitation token.
- The backend sends an invitation email with an accept URL pointing to `/admin/accept-invite?token=...`.
- `GET /api/auth/invite/:token` validates the invite.
- `POST /api/auth/invite/accept` sets the password, marks the invite accepted, activates the user, revokes old refresh sessions, and writes an audit log entry.
- Invitations expire after 72 hours.

## Recommended manual test flows

### Customer login

- Sign in through `/customer/login` with a customer account.
- Confirm a staff/admin account is rejected on the customer login page.
- Confirm Google Sign-In only succeeds for customer accounts.

### Admin login

- Sign in through `/admin/login` with a seeded or invited staff/admin account.
- Confirm a customer account is rejected on the admin login page.
- Confirm a customer cannot open admin routes even if authenticated.

### Password reset

- Request a reset from `/customer/forgot-password`.
- Use the emailed token on `/customer/reset-password?token=...`.
- Confirm the token cannot be reused and old refresh sessions are revoked.

## Current follow-up items

- Remove already-committed build artifacts and `node_modules` from the repository history/worktree.
- Replace development demo customer seed credentials before launch.
- Finalize provider-specific webhook payload mapping for the exact payment provider(s) you will use in production.

See:

- `backend/PAYMENTS.md`
- `frontend/ADMIN_CRUD.md`

## Latest restriction upgrade

This package now includes production-style restrictions:

- Guest / Customer / Staff / Super Admin separation
- Customer-only checkout and account pages
- No public admin registration
- Super Admin-only users/settings management
- Staff role restrictions for admin modules
- Checkout address validation
- Backend stock validation before order creation
- Backend-calculated shipping fee
- Payment webhook signature and idempotency foundation
- Admin mutation audit logs

See `backend/RESTRICTIONS.md` for the detailed rules and demo accounts.
