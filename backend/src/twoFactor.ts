import crypto from 'crypto';
import { authenticator } from 'otplib';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { ApiError } from './errors.js';

/**
 * TOTP-based two-factor auth for staff accounts.
 *
 * Flow:
 *   1. Admin calls /auth/2fa/setup → returns otpauthUrl + plain backupCodes (shown once).
 *      Server stores `twoFactorSecret` (NOT yet enabled) + hashed backup codes.
 *   2. Admin scans QR, calls /auth/2fa/enable with current TOTP code → enabled=true.
 *   3. Login flow: if user.twoFactorEnabled, login returns `{ twoFactorRequired: true, ticket }`.
 *      Frontend then calls /auth/2fa/verify with ticket+code.
 *
 * Backup codes: 10 single-use codes; bcrypt-hashed at rest; lookup is O(N) on consume.
 */

authenticator.options = { window: 1, step: 30 };

export const TWO_FA_REQUIRED_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'MANAGER']);

export function generateSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpauthUrl(secret: string, accountName: string, issuer = 'LUXE Commerce'): string {
  return authenticator.keyuri(accountName, issuer, secret);
}

export function verifyTotp(secret: string, token: string): boolean {
  try {
    return authenticator.check(token.replace(/\s+/g, ''), secret);
  } catch {
    return false;
  }
}

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // 10 hex chars, formatted as XXXXX-XXXXX for readability
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}

export async function hashBackupCodes(userId: string, codes: string[]): Promise<void> {
  await prisma.$transaction([
    prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
    prisma.twoFactorBackupCode.createMany({
      data: await Promise.all(codes.map(async (code) => ({
        userId,
        codeHash: await bcrypt.hash(code, 10)
      })))
    })
  ]);
}

/**
 * Returns true if the supplied backup code matches a still-unused code,
 * marking it as consumed.
 */
export async function consumeBackupCode(userId: string, code: string): Promise<boolean> {
  const candidates = await prisma.twoFactorBackupCode.findMany({ where: { userId, usedAt: null } });
  for (const candidate of candidates) {
    if (await bcrypt.compare(code, candidate.codeHash)) {
      await prisma.twoFactorBackupCode.update({ where: { id: candidate.id }, data: { usedAt: new Date() } });
      return true;
    }
  }
  return false;
}

/** Throws if the role requires 2FA but the user has not enrolled. */
export function assertTwoFactorEnrolled(role: string, user: { twoFactorEnabled: boolean }) {
  if (TWO_FA_REQUIRED_ROLES.has(role) && !user.twoFactorEnabled) {
    throw new ApiError(403, 'Two-factor authentication is required for this role. Please enrol at /admin/security.');
  }
}
