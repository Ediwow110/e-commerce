# Payment Gateway Setup

The backend uses a provider pattern so you can start with a low-risk mock/manual flow and later enable real gateways without rewriting checkout.

Supported providers:

- `paymongo` - recommended primary gateway for PH e-commerce checkout.
- `maya` - useful for Maya checkout / QR-oriented local payments.
- `xendit` - useful when the client needs wider channels later.
- `manual` - bank transfer, GCash QR screenshot, COD, or staff verification.
- `mock` - local development only.

## Environment variables

```env
PAYMENT_PROVIDER_DEFAULT=paymongo
PAYMONGO_PUBLIC_KEY=
PAYMONGO_SECRET_KEY=
MAYA_PUBLIC_KEY=
MAYA_SECRET_KEY=
XENDIT_SECRET_KEY=
PAYMENT_WEBHOOK_SECRET=
```

## Checkout endpoint

```http
POST /api/payments/checkout
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "orderId": "order_id_here",
  "provider": "paymongo",
  "successUrl": "https://yourstore.com/payment/success",
  "cancelUrl": "https://yourstore.com/payment/cancel"
}
```

The response returns a `checkoutUrl` when the selected gateway supports hosted checkout.

## Webhooks

`POST /api/payments/webhook/:provider` is included as a starter endpoint. Before real production launch, enable strict webhook signature verification for the selected provider.
