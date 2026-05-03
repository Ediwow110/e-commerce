import { describe, it, expect, beforeAll } from 'vitest';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'a'.repeat(40);
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'b'.repeat(40);
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://x:y@localhost:5432/none';

let hasPermission: (role: string | undefined, perm: string) => boolean;

beforeAll(async () => {
  const mod = await import('../src/security.js');
  hasPermission = mod.hasPermission;
});

describe('role-based access control', () => {
  it('CUSTOMER cannot access admin features', () => {
    expect(hasPermission('CUSTOMER', 'admin:access')).toBe(false);
    expect(hasPermission('CUSTOMER', 'orders:manage')).toBe(false);
    expect(hasPermission('CUSTOMER', 'payments:manage')).toBe(false);
  });

  it('CUSTOMER can manage own cart and checkout', () => {
    expect(hasPermission('CUSTOMER', 'cart:write')).toBe(true);
    expect(hasPermission('CUSTOMER', 'checkout:create')).toBe(true);
  });

  it('STAFF cannot mark payments paid (payments:manage)', () => {
    expect(hasPermission('STAFF', 'payments:manage')).toBe(false);
    expect(hasPermission('INVENTORY_STAFF', 'payments:manage')).toBe(false);
    expect(hasPermission('CONTENT_STAFF', 'payments:manage')).toBe(false);
    expect(hasPermission('SUPPORT_STAFF', 'payments:manage')).toBe(false);
  });

  it('only ADMIN/SUPER_ADMIN can manage payments', () => {
    expect(hasPermission('ADMIN', 'payments:manage')).toBe(true);
    expect(hasPermission('SUPER_ADMIN', 'payments:manage')).toBe(true);
  });

  it('SUPER_ADMIN has wildcard permissions', () => {
    expect(hasPermission('SUPER_ADMIN', 'literally:anything')).toBe(true);
  });

  it('unknown/missing role has no permissions', () => {
    expect(hasPermission(undefined, 'cart:write')).toBe(false);
    expect(hasPermission('NONEXISTENT', 'cart:write')).toBe(false);
  });

  it('low-privilege staff cannot perform order mutations beyond status', () => {
    expect(hasPermission('SUPPORT_STAFF', 'orders:manage')).toBe(false);
    expect(hasPermission('CONTENT_STAFF', 'orders:manage')).toBe(false);
    expect(hasPermission('INVENTORY_STAFF', 'orders:manage')).toBe(false);
  });
});
