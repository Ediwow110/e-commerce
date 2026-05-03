import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { env } from './env.js';
import { ApiError } from './errors.js';

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const comparePassword = (password: string, hash?: string | null) => hash ? bcrypt.compare(password, hash) : Promise.resolve(false);

export function signAccessToken(payload: object) {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET as Secret, options);
}
export function signRefreshToken(payload: object) {
  // jwtid (jti) makes every refresh token unique even when issued in the same
  // second with an identical payload. Without this, two logins back-to-back for
  // the same user produce the SAME JWT, which collides on RefreshSession.tokenHash
  // (unique). Reuse-detection then can't distinguish two legitimate sessions.
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    jwtid: crypto.randomBytes(16).toString('hex')
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET as Secret, options);
}
export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET as Secret) as { id: string; email: string; role: string };
}
export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface AuthedRequest extends Request { user?: { id: string; role: string; email: string } }

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'INVENTORY_STAFF', 'ORDER_STAFF', 'CONTENT_STAFF', 'SUPPORT_STAFF'];
export const STAFF_ROLES = ['MANAGER', 'STAFF', 'INVENTORY_STAFF', 'ORDER_STAFF', 'CONTENT_STAFF', 'SUPPORT_STAFF'];

export const rolePermissions: Record<string, string[]> = {
  CUSTOMER: ['customer:account', 'wishlist:write', 'cart:write', 'checkout:create', 'orders:read-own', 'reviews:create'],
  SUPPORT_STAFF: ['admin:access', 'orders:read', 'customers:read', 'reviews:moderate'],
  CONTENT_STAFF: ['admin:access', 'products:read', 'categories:read', 'content:manage'],
  ORDER_STAFF: ['admin:access', 'orders:read', 'orders:update-status', 'shipping:manage', 'customers:read', 'payments:read'],
  INVENTORY_STAFF: ['admin:access', 'products:read', 'variants:read', 'inventory:manage', 'categories:read'],
  STAFF: ['admin:access', 'products:read', 'categories:read', 'inventory:manage', 'orders:read', 'orders:update-status', 'customers:read', 'reviews:moderate', 'shipping:manage'],
  MANAGER: ['admin:access', 'products:manage', 'categories:manage', 'variants:manage', 'inventory:manage', 'orders:manage', 'customers:manage', 'promos:manage', 'reviews:moderate', 'reports:read', 'payments:read', 'shipping:manage', 'content:manage'],
  ADMIN: ['admin:access', 'products:manage', 'categories:manage', 'variants:manage', 'inventory:manage', 'orders:manage', 'customers:manage', 'promos:manage', 'reviews:moderate', 'reports:read', 'payments:manage', 'shipping:manage', 'content:manage'],
  SUPER_ADMIN: ['*']
};

export function hasPermission(role: string | undefined, permission: string) {
  if (!role) return false;
  const permissions = rolePermissions[role] || [];
  return permissions.includes('*') || permissions.includes(permission);
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'Missing bearer token');
  try { req.user = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as any; next(); }
  catch { throw new ApiError(401, 'Invalid or expired token'); }
}

export const requireRole = (...roles: string[]) => (req: AuthedRequest, _res: Response, next: NextFunction) => {
  if (!req.user) throw new ApiError(401, 'Unauthenticated');
  const role = req.user.role;
  if (role === 'SUPER_ADMIN') return next();
  if (roles.includes('ADMIN') && role === 'ADMIN') return next();
  if (roles.includes('STAFF') && STAFF_ROLES.includes(role)) return next();
  if (roles.includes(role)) return next();
  throw new ApiError(403, 'Forbidden');
};

export const requirePermission = (permission: string) => (req: AuthedRequest, _res: Response, next: NextFunction) => {
  if (!req.user) throw new ApiError(401, 'Unauthenticated');
  if (!hasPermission(req.user.role, permission)) throw new ApiError(403, 'Forbidden: missing permission ' + permission);
  next();
};

export function assertCustomer(req: AuthedRequest) {
  if (req.user?.role !== 'CUSTOMER') throw new ApiError(403, 'Customer account required');
}
