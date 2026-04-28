# Security Notes

This backend is structured for production-style security, but you still need proper deployment hardening before accepting real payments.

## Included

- Password hashing with bcrypt
- JWT access and refresh tokens
- Role-based access control: CUSTOMER, STAFF, ADMIN
- Request validation with Zod
- Global rate limiting
- Authentication rate limiting
- Helmet security headers
- CORS allowlist via `CORS_ORIGIN`
- JSON body size limit
- Query/body sanitization against NoSQL-style pollution
- HTTP parameter pollution protection
- Centralized error handling
- Google Sign-In ID token verification
- Mail API providers: Resend, SendGrid, Mailgun, mock mode

## Google Sign-In setup

Backend `.env`:

```env
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

Frontend `.env`:

```env
VITE_API_URL=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

Frontend receives the Google credential token and sends it to:

```txt
POST /api/auth/google
```

The backend verifies the token with Google before creating/signing in the user.

## Production checklist

- Use HTTPS only.
- Use long random JWT secrets.
- Restrict `CORS_ORIGIN` to the production domain.
- Store secrets in server environment variables, not Git.
- Use managed PostgreSQL backups.
- Add payment webhook signature verification.
- Add file upload validation before enabling product image uploads.
- Add audit logs for admin actions.
- Add 2FA for admin users for high-value inventory.
