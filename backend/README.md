# LUXE Commerce Backend

Production-style REST API for the jewelry and bags e-commerce frontend.

## Stack

- Node.js + Express + TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication
- Role-based admin access
- API mail provider support: Resend, SendGrid, Mailgun, or mock mode

## Quick start

```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

API runs at:

```txt
http://localhost:8080/api
```

Demo accounts after seeding:

```txt
Admin: admin@luxe.test / password123
Customer: customer@luxe.test / password123
```

## API mail setup

Set one provider in `.env`:

```env
MAIL_PROVIDER=resend
MAIL_FROM="LUXE Jewelry & Bags <orders@yourdomain.com>"
RESEND_API_KEY=your_resend_key
```

Or SendGrid:

```env
MAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_key
MAIL_FROM="LUXE Jewelry & Bags <orders@yourdomain.com>"
```

Or Mailgun:

```env
MAIL_PROVIDER=mailgun
MAILGUN_API_KEY=your_mailgun_key
MAILGUN_DOMAIN=mg.yourdomain.com
MAIL_FROM="LUXE Jewelry & Bags <orders@yourdomain.com>"
```

For development, leave:

```env
MAIL_PROVIDER=mock
```

The order creation endpoint sends an order confirmation email through `src/mail.service.ts`.

## Main routes

```txt
POST   /api/auth/register
POST   /api/auth/login
GET    /api/me
GET    /api/categories
GET    /api/products
GET    /api/products/:slug
GET    /api/cart
POST   /api/cart
POST   /api/orders
GET    /api/orders/me
GET    /api/admin/dashboard
POST   /api/admin/products
GET    /api/admin/orders
PATCH  /api/admin/orders/:id/status
GET    /api/admin/reports/sales
POST   /api/mail/test
```
