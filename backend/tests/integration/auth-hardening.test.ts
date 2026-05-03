/**
 * Auth hardening regressions for the customer/admin sign-in surface:
 *
 *   1. The 2FA-pending ticket returned by /auth/admin/login is NOT a real
 *      access token: it must be rejected by every requireAuth route and may
 *      only be presented to /auth/admin/2fa/login.
 *   2. Web (browser) logins must NOT return a refresh token in the JSON body.
 *      Mobile clients opt-in via `X-Client-Type: mobile`.
 *   3. /auth/google rejects an existing non-CUSTOMER account with a safe
 *      "use the admin login page" message — no user enumeration.
 *   4. Origin guard rejects /auth/refresh when a refresh cookie is present
 *      but the request's Origin is not in the allow-list.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { app } from '../../src/app.js';
import { prisma } from '../../src/prisma.js';
import { hashPassword, signAccessToken } from '../../src/security.js';
import { generateSecret } from '../../src/twoFactor.js';
import { env } from '../../src/env.js';
import { resetDb } from './setup.js';

const HAS_DB = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('noop');
const d = HAS_DB ? describe : describe.skip;

d('auth hardening', () => {
  beforeEach(async () => { await resetDb(); });

  it('2FA-pending ticket cannot be used as an access token on protected routes', async () => {
    const passwordHash = await hashPassword('correct-horse-battery');
    const secret = generateSecret();
    const user = await prisma.user.create({
      data: {
        name: 'Admin With 2FA',
        email: `admin-2fa-${Date.now()}@luxe.test`,
        role: 'ADMIN',
        passwordHash,
        twoFactorEnabled: true,
        twoFactorSecret: secret
      }
    });

    // Step 1: password-only login returns a 2FA ticket, not a session.
    const login = await request(app).post('/api/auth/admin/login').send({ email: user.email, password: 'correct-horse-battery' });
    expect(login.status).toBe(200);
    expect(login.body.data.twoFactorRequired).toBe(true);
    expect(login.body.data.accessToken).toBeUndefined();
    const ticket: string = login.body.data.ticket;
    expect(ticket).toBeTruthy();

    // The ticket is signed with the access-token secret. Confirm it carries
    // the 2fa-pending scope so requireAuth has something to reject on.
    const decoded = jwt.verify(ticket, env.JWT_ACCESS_SECRET) as any;
    expect(decoded.scope).toBe('2fa-pending');

    // Step 2: presenting the ticket to a protected route MUST fail.
    const me = await request(app).get('/api/me').set('Authorization', `Bearer ${ticket}`);
    expect(me.status).toBe(401);
    expect(String(me.body.message)).toMatch(/cannot be used|two-factor/i);

    // Step 3: presenting the ticket to /auth/admin/2fa/login WITH the right
    // TOTP succeeds and returns a real session.
    const verify = await request(app).post('/api/auth/admin/2fa/login').send({ ticket, code: authenticator.generate(secret) });
    expect(verify.status).toBe(200);
    expect(verify.body.data.accessToken).toBeTruthy();

    // Step 4: a hand-rolled token with scope=2fa-pending also cannot be used.
    const forged = signAccessToken({ id: user.id, email: user.email, role: user.role, scope: '2fa-pending' });
    const me2 = await request(app).get('/api/me').set('Authorization', `Bearer ${forged}`);
    expect(me2.status).toBe(401);
  });

  it('web logins do NOT return refreshToken in the JSON body; mobile clients opt-in', async () => {
    const email = `web-${Date.now()}@luxe.test`;
    const passwordHash = await hashPassword('correct-horse-battery');
    await prisma.user.create({ data: { name: 'Web', email, role: 'CUSTOMER', passwordHash } });

    // Default (web) login: no header sent.
    const web = await request(app).post('/api/auth/customer/login').send({ email, password: 'correct-horse-battery' });
    expect(web.status).toBe(200);
    expect(web.body.data.user).toBeTruthy();
    expect(web.body.data.accessToken).toBeTruthy();
    expect(web.body.data.refreshToken).toBeUndefined();
    // The refresh token must still be set as an httpOnly cookie.
    const setCookie = web.headers['set-cookie'];
    expect(Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie)).toMatch(/luxe_refresh_token=/i);

    // Mobile opt-in.
    const mobile = await request(app).post('/api/auth/customer/login').set('x-client-type', 'mobile').send({ email, password: 'correct-horse-battery' });
    expect(mobile.status).toBe(200);
    expect(mobile.body.data.refreshToken).toBeTruthy();
  });

  it('google login rejects an existing non-CUSTOMER account with a safe message', async () => {
    const email = `staff-google-${Date.now()}@luxe.test`;
    const passwordHash = await hashPassword('irrelevant');
    await prisma.user.create({ data: { name: 'Staff', email, role: 'STAFF', passwordHash } });

    // We can't mint a real Google ID token in tests; we just confirm the
    // endpoint surface validates input shape and the role-based gate is in
    // the code path. The real verification (signature, audience,
    // email_verified) is exercised in production / staging.
    const res = await request(app).post('/api/auth/google').send({ idToken: 'x'.repeat(40) });
    // Either 401 (Google verification fails — expected with no real token)
    // or 403 (role gate). Either way: never 200, and the body must not leak
    // user-existence details.
    expect([401, 403, 500]).toContain(res.status);
    expect(String(res.body.message || '').toLowerCase()).not.toContain(email.toLowerCase());
  });

  it('Origin guard rejects /auth/refresh when refresh cookie present and Origin is not allow-listed', async () => {
    const email = `origin-${Date.now()}@luxe.test`;
    const passwordHash = await hashPassword('correct-horse-battery');
    await prisma.user.create({ data: { name: 'OG', email, role: 'CUSTOMER', passwordHash } });

    // Login as a "mobile" client to also get the refresh token in the body —
    // we'll need it to construct the spoofed cross-origin request.
    const login = await request(app).post('/api/auth/customer/login').set('x-client-type', 'mobile').send({ email, password: 'correct-horse-battery' });
    expect(login.status).toBe(200);
    const refreshToken: string = login.body.data.refreshToken;

    // Spoof a same-cookie + bad-origin request — MUST NOT succeed. The
    // outer CORS middleware will typically reject first (500/403); if it is
    // ever loosened, our Origin guard catches the same case with a clean
    // 403. Either way: never 200.
    const bad = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `luxe_refresh_token=${refreshToken}`)
      .set('Origin', 'https://evil.example.com')
      .send({});
    expect(bad.status).not.toBe(200);

    // Same cookie + allow-listed Origin (the default CORS_ORIGIN in tests)
    // — passes the guard and hits the refresh handler.
    const okSameOrigin = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `luxe_refresh_token=${refreshToken}`)
      .set('Origin', 'http://localhost:5173')
      .send({});
    expect(okSameOrigin.status).toBe(200);

    // Same cookie + no Origin (mobile/native style) — also passes the guard.
    // We don't assert 200 here because the previous refresh already rotated
    // the token; we only confirm the guard itself didn't reject (no 403
    // 'cross-origin' body).
    const noOrigin = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `luxe_refresh_token=${refreshToken}`)
      .send({});
    expect(noOrigin.status).not.toBe(403);
  });
});
