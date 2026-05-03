/**
 * Refresh-token rotation reuse detection. Replaying a previously-used (and
 * therefore revoked) refresh token must:
 *   1. Return 401
 *   2. Revoke ALL active sessions for that user
 *   3. Write a REFRESH_REUSE_DETECTED audit log
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/prisma.js';
import { hashPassword } from '../../src/security.js';
import { resetDb } from './setup.js';

const HAS_DB = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('noop');
const d = HAS_DB ? describe : describe.skip;

d('refresh token rotation', () => {
  beforeEach(async () => { await resetDb(); });

  async function loginNewUser(email = `rot-${Date.now()}@luxe.test`) {
    const passwordHash = await hashPassword('correct-horse-battery');
    await prisma.user.create({ data: { name: 'Rotator', email, role: 'CUSTOMER', passwordHash } });
    const res = await request(app).post('/api/auth/customer/login').send({ email, password: 'correct-horse-battery' });
    expect(res.status).toBe(200);
    return { userEmail: email, refreshToken: res.body.data.refreshToken as string };
  }

  it('first refresh succeeds; replaying the original triggers reuse-detection', async () => {
    const { userEmail, refreshToken } = await loginNewUser();

    // First refresh — original is rotated, new pair issued.
    const r1 = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(r1.status).toBe(200);

    // Replay original — must trigger reuse detection.
    const r2 = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(r2.status).toBe(401);
    expect(r2.body.message).toMatch(/reuse/i);

    // All sessions for user revoked
    const user = await prisma.user.findUniqueOrThrow({ where: { email: userEmail } });
    const active = await prisma.refreshSession.count({ where: { userId: user.id, revokedAt: null } });
    expect(active).toBe(0);

    // Audit log present
    const audit = await prisma.auditLog.findFirst({ where: { action: 'REFRESH_REUSE_DETECTED', actorId: user.id } });
    expect(audit).not.toBeNull();
  });

  it('lockout: 8 failed attempts locks the account', async () => {
    const email = `lock-${Date.now()}@luxe.test`;
    const passwordHash = await hashPassword('right-password');
    await prisma.user.create({ data: { name: 'Lockee', email, role: 'CUSTOMER', passwordHash } });

    for (let i = 0; i < 8; i++) {
      await request(app).post('/api/auth/customer/login').send({ email, password: 'wrong' });
    }

    const res = await request(app).post('/api/auth/customer/login').send({ email, password: 'right-password' });
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/locked/i);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.lockedUntil).not.toBeNull();
    expect(user.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    const audit = await prisma.auditLog.findFirst({ where: { action: 'LOGIN_LOCKED', actorId: user.id } });
    expect(audit).not.toBeNull();
  });

  it('password reset revokes ALL active refresh sessions', async () => {
    const email = `reset-${Date.now()}@luxe.test`;
    const passwordHash = await hashPassword('original-pwd-12345');
    const user = await prisma.user.create({ data: { name: 'Resetter', email, role: 'CUSTOMER', passwordHash } });

    // Login twice → two active sessions
    await request(app).post('/api/auth/customer/login').send({ email, password: 'original-pwd-12345' });
    await request(app).post('/api/auth/customer/login').send({ email, password: 'original-pwd-12345' });
    expect(await prisma.refreshSession.count({ where: { userId: user.id, revokedAt: null } })).toBe(2);

    // Forgot password generates a token
    await request(app).post('/api/auth/forgot-password').send({ email });
    const tokens = await prisma.passwordResetToken.findMany({ where: { userId: user.id, usedAt: null } });
    expect(tokens.length).toBeGreaterThanOrEqual(1);

    // We can't recover the plaintext token from hash — instead generate one directly for the test.
    const crypto = await import('crypto');
    const plain = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(plain).digest('hex');
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60_000) } });

    const res = await request(app).post('/api/auth/reset-password').send({ token: plain, password: 'brand-new-pwd-67890' });
    expect(res.status).toBe(200);

    expect(await prisma.refreshSession.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    const audit = await prisma.auditLog.findFirst({ where: { action: 'PASSWORD_RESET', actorId: user.id } });
    expect(audit).not.toBeNull();
  });
});
