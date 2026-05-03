import { describe, it, expect } from 'vitest';
import { authenticator } from 'otplib';
import { generateSecret, verifyTotp, generateBackupCodes, buildOtpauthUrl } from '../src/twoFactor.js';

describe('two-factor helpers', () => {
  it('generates a valid base32 secret', () => {
    const s = generateSecret();
    expect(s).toMatch(/^[A-Z2-7]+$/);
    expect(s.length).toBeGreaterThanOrEqual(16);
  });

  it('verifies its own TOTP code', () => {
    const s = generateSecret();
    const code = authenticator.generate(s);
    expect(verifyTotp(s, code)).toBe(true);
  });

  it('rejects wrong code', () => {
    const s = generateSecret();
    expect(verifyTotp(s, '000000')).toBe(false);
  });

  it('strips whitespace before verification', () => {
    const s = generateSecret();
    const code = authenticator.generate(s);
    expect(verifyTotp(s, ` ${code.slice(0, 3)} ${code.slice(3)} `)).toBe(true);
  });

  it('emits 10 unique backup codes formatted XXXXX-XXXXX', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    for (const c of codes) expect(c).toMatch(/^[A-F0-9]{5}-[A-F0-9]{5}$/);
    expect(new Set(codes).size).toBe(10);
  });

  it('builds a valid otpauth URL', () => {
    const url = buildOtpauthUrl('JBSWY3DPEHPK3PXP', 'staff@luxe.test');
    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain('staff%40luxe.test');
    expect(url).toContain('secret=JBSWY3DPEHPK3PXP');
  });
});
