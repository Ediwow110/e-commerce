import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { prisma } from './prisma.js';
import { ApiError, asyncHandler } from './errors.js';
import { ADMIN_ROLES, comparePassword, hashPassword, hashToken, requireAuth, requireRole, requirePermission, signAccessToken, signRefreshToken, verifyRefreshToken, type AuthedRequest } from './security.js';
import { validate } from './validate.js';
import { adminInvitationTemplate, orderConfirmationTemplate, orderReceiptTemplate, passwordResetTemplate, sendMail } from './mail.service.js';
import { env } from './env.js';
import { createPaymentCheckout, verifyWebhookSignature } from './payment.service.js';

export const router = Router();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many authentication attempts. Please try again later.' } });

const registerSchema = z.object({ body: z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8) }) });
const loginSchema = z.object({ body: z.object({ email: z.string().email(), password: z.string().min(1) }) });
const googleSchema = z.object({ body: z.object({ idToken: z.string().min(20) }) });
const forgotPasswordSchema = z.object({ body: z.object({ email: z.string().email() }) });
const refreshSchema = z.object({ body: z.object({ refreshToken: z.string().min(20).optional() }).optional() });
const resetPasswordSchema = z.object({ body: z.object({ token: z.string().min(20), password: z.string().min(8) }).strict() });
const productBodySchema = z.object({ categoryId: z.string().min(1), name: z.string().min(2), slug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().min(5), price: z.coerce.number().positive(), salePrice: z.coerce.number().positive().optional(), material: z.string().optional(), careGuide: z.string().optional(), isFeatured: z.boolean().optional(), isActive: z.boolean().optional() }).strict();
const productSchema = z.object({ body: productBodySchema });
const productUpdateSchema = z.object({ body: productBodySchema.partial().refine((body) => Object.keys(body).length > 0, 'At least one field is required') });
const categorySchema = z.object({ body: z.object({ name: z.string().min(2), slug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), imageUrl: z.string().url().optional() }).strict() });
const categoryUpdateSchema = z.object({ body: z.object({ name: z.string().min(2).optional(), slug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(), imageUrl: z.string().url().nullable().optional() }).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required') });
const variantSchema = z.object({ body: z.object({ productId: z.string().min(1), sku: z.string().min(3).regex(/^[A-Z0-9-]+$/), color: z.string().optional(), size: z.string().optional(), material: z.string().optional(), hardware: z.string().optional(), priceDelta: z.coerce.number().min(0).optional(), stock: z.coerce.number().int().min(0), lowStockAt: z.coerce.number().int().min(0).optional() }).strict() });
const variantUpdateSchema = z.object({ body: z.object({ sku: z.string().min(3).regex(/^[A-Z0-9-]+$/).optional(), color: z.string().nullable().optional(), size: z.string().nullable().optional(), material: z.string().nullable().optional(), hardware: z.string().nullable().optional(), priceDelta: z.coerce.number().min(0).optional(), stock: z.coerce.number().int().min(0).optional(), lowStockAt: z.coerce.number().int().min(0).optional() }).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required') });
const inventoryMovementSchema = z.object({ body: z.object({ variantId: z.string().min(1), type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'DAMAGED']), quantity: z.coerce.number().int().positive(), note: z.string().max(500).optional() }).strict() });
const cartItemSchema = z.object({ body: z.object({ productId: z.string().min(1), variantId: z.string().min(1).optional().nullable(), quantity: z.coerce.number().int().min(1).max(20).default(1) }).strict() });
const orderStatusSchema = z.object({ body: z.object({ status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']) }).strict() });
const paymentCheckoutSchema = z.object({ body: z.object({ orderId: z.string().min(1), provider: z.enum(['paymongo', 'maya', 'xendit', 'manual', 'mock']).optional(), successUrl: z.string().url().optional(), cancelUrl: z.string().url().optional() }).strict() });
const customerUpdateSchema = z.object({ body: z.object({ name: z.string().min(2).optional(), phone: z.string().min(7).optional().nullable(), isActive: z.boolean().optional() }).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required') });
const promoSchema = z.object({ body: z.object({ code: z.string().min(3).max(40).regex(/^[A-Z0-9_-]+$/), type: z.enum(['percentage', 'fixed', 'free_shipping']), value: z.coerce.number().min(0), minSubtotal: z.coerce.number().min(0).optional(), startsAt: z.string().datetime().optional(), endsAt: z.string().datetime().optional(), usageLimit: z.coerce.number().int().positive().optional(), isActive: z.boolean().optional() }).strict() });
const promoUpdateSchema = z.object({ body: z.object({ code: z.string().min(3).max(40).regex(/^[A-Z0-9_-]+$/).optional(), type: z.enum(['percentage', 'fixed', 'free_shipping']).optional(), value: z.coerce.number().min(0).optional(), minSubtotal: z.coerce.number().min(0).nullable().optional(), startsAt: z.string().datetime().nullable().optional(), endsAt: z.string().datetime().nullable().optional(), usageLimit: z.coerce.number().int().positive().nullable().optional(), isActive: z.boolean().optional() }).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required') });
const reviewUpdateSchema = z.object({ body: z.object({ isApproved: z.boolean().optional(), comment: z.string().max(1000).optional().nullable() }).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required') });
const paymentUpdateSchema = z.object({ body: z.object({ status: z.enum(['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED']), reference: z.string().max(120).optional().nullable() }).strict() });
const shipmentUpdateSchema = z.object({ body: z.object({ method: z.string().min(2).optional(), courier: z.string().max(120).optional().nullable(), trackingNo: z.string().max(120).optional().nullable(), shippedAt: z.string().datetime().optional().nullable(), deliveredAt: z.string().datetime().optional().nullable() }).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required') });
const contentSchema = z.object({ body: z.object({ key: z.string().min(2), title: z.string().optional().nullable(), body: z.string().optional().nullable(), imageUrl: z.string().url().optional().nullable(), isActive: z.boolean().optional() }).strict() });
const contentUpdateSchema = z.object({ body: z.object({ title: z.string().optional().nullable(), body: z.string().optional().nullable(), imageUrl: z.string().url().optional().nullable(), isActive: z.boolean().optional() }).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required') });
const adminInviteSchema = z.object({ body: z.object({ name: z.string().min(2), email: z.string().email(), role: z.enum(['STAFF', 'MANAGER', 'INVENTORY_STAFF', 'ORDER_STAFF', 'CONTENT_STAFF', 'SUPPORT_STAFF', 'ADMIN', 'SUPER_ADMIN']) }).strict() });
const inviteTokenSchema = z.object({ params: z.object({ token: z.string().min(20) }) });
const inviteAcceptSchema = z.object({ body: z.object({ token: z.string().min(20), password: z.string().min(8) }).strict() });
const adminUserUpdateSchema = z.object({ body: z.object({ name: z.string().min(2).optional(), role: z.enum(['STAFF', 'MANAGER', 'INVENTORY_STAFF', 'ORDER_STAFF', 'CONTENT_STAFF', 'SUPPORT_STAFF', 'ADMIN', 'SUPER_ADMIN']).optional(), isActive: z.boolean().optional() }).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required') });
const settingsSchema = z.object({ body: z.object({ value: z.unknown(), group: z.string().min(2).optional() }).strict() });
const mailTestSchema = z.object({ body: z.object({ to: z.string().email() }).strict() });
const deliveryAddressSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(7, 'Phone number is required'),
  line1: z.string().min(5, 'Delivery address is required'),
  line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional().default('Philippines')
});
const orderCreateSchema = z.object({
  body: z.object({
    shippingMethod: z.string().optional().default('standard_delivery'),
    shippingFee: z.number().nonnegative().optional(),
    deliveryAddress: deliveryAddressSchema.optional(),
    customerNote: z.string().max(500).optional()
  }).superRefine((data, ctx) => {
    if (data.shippingMethod !== 'store_pickup' && !data.deliveryAddress) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deliveryAddress'], message: 'Please add a delivery address before placing your order.' });
    }
  })
});

const sensitiveKeys = ['password', 'passwordhash', 'token', 'refreshtoken', 'accesstoken', 'authorization', 'secret', 'apikey', 'card', 'paymentmethod', 'paymenttoken', 'cvv', 'resettoken', 'cookie', 'session', 'credential'];

function parseDurationToMs(value: string) {
  const match = String(value).trim().match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
}

function pickDefined<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function redactSensitiveMetadata(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(redactSensitiveMetadata);
  if (!input || typeof input !== 'object') return input;
  return Object.fromEntries(Object.entries(input as Record<string, unknown>).map(([key, value]) => {
    const normalized = key.toLowerCase();
    if (sensitiveKeys.some((item) => normalized.includes(item))) return [key, '[REDACTED]'];
    return [key, redactSensitiveMetadata(value)];
  }));
}

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie('luxe_refresh_token', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN)
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie('luxe_refresh_token', { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth' });
}

function buildAuthResponse(user: { id: string; name: string; email: string; role: string; avatarUrl?: string | null }) {
  const payload = { id: user.id, email: user.email, role: user.role };
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl ?? null },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload)
  };
}

async function issueAuthResponse(res: Response, req: AuthedRequest, user: { id: string; name: string; email: string; role: string; avatarUrl?: string | null }) {
  const response = buildAuthResponse(user);
  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(response.refreshToken),
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN))
    }
  });
  setRefreshCookie(res, response.refreshToken);
  return { user: response.user, accessToken: response.accessToken };
}

async function authenticateWithRole(email: string, password: string, allowedRoles: string[]) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await comparePassword(password, user.passwordHash)) || !allowedRoles.includes(user.role)) {
    throw new ApiError(401, 'Invalid credentials');
  }
  if (!user.isActive) throw new ApiError(403, 'Account disabled');
  return user;
}

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

function getRefreshTokenFromRequest(req: Request & { cookies?: Record<string, string>; body?: { refreshToken?: string } }) {
  return req.cookies?.luxe_refresh_token || req.body?.refreshToken;
}

router.get('/health', (_req, res) => res.json({ success: true, service: 'luxe-commerce-api', status: 'ok' }));

router.post('/auth/register', authLimiter, validate(registerSchema), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const exists = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (exists) throw new ApiError(409, 'Email already registered');
  const user = await prisma.user.create({ data: { name: req.body.name, email: req.body.email, passwordHash: await hashPassword(req.body.password), role: 'CUSTOMER' }, select: { id: true, name: true, email: true, role: true, avatarUrl: true } });
  res.status(201).json({ success: true, data: await issueAuthResponse(res, req, user) });
}));

router.post('/auth/customer/login', authLimiter, validate(loginSchema), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await authenticateWithRole(req.body.email, req.body.password, ['CUSTOMER']);
  res.json({ success: true, data: await issueAuthResponse(res, req, user) });
}));

router.post('/auth/admin/login', authLimiter, validate(loginSchema), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await authenticateWithRole(req.body.email, req.body.password, ADMIN_ROLES);
  res.json({ success: true, data: await issueAuthResponse(res, req, user) });
}));

router.post('/auth/refresh', authLimiter, validate(refreshSchema), asyncHandler(async (req: Request & { cookies?: Record<string, string>; body?: { refreshToken?: string } }, res: Response) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken) throw new ApiError(401, 'Refresh token required');
  const tokenHash = hashToken(refreshToken);
  const payload = verifyRefreshToken(refreshToken);
  const session = await prisma.refreshSession.findUnique({ where: { tokenHash } });
  if (!session) throw new ApiError(401, 'Invalid refresh session');
  
  // Grace Period: Allow tokens revoked in the last 60 seconds to prevent mobile disconnects
  const isWithinGracePeriod = session.revokedAt && (new Date().getTime() - session.revokedAt.getTime() < 60_000);
  if (session.revokedAt && !isWithinGracePeriod) throw new ApiError(401, 'Invalid refresh session');
  if (session.expiresAt <= new Date()) throw new ApiError(401, 'Invalid refresh session');
  
  const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, name: true, email: true, role: true, avatarUrl: true, isActive: true } });
  if (!user || !user.isActive) throw new ApiError(401, 'Invalid refresh session');
  await prisma.refreshSession.update({ where: { tokenHash }, data: { revokedAt: new Date() } });
  res.json({ success: true, data: await issueAuthResponse(res, req, user) });
}));

router.post('/auth/logout', validate(refreshSchema), asyncHandler(async (req: Request & { cookies?: Record<string, string>; body?: { refreshToken?: string } }, res: Response) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (refreshToken) {
    await prisma.refreshSession.updateMany({ where: { tokenHash: hashToken(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
  }
  clearRefreshCookie(res);
  res.json({ success: true, data: { loggedOut: true } });
}));

router.post('/auth/google', authLimiter, validate(googleSchema), asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!env.GOOGLE_CLIENT_ID) throw new ApiError(500, 'Google Sign-In is not configured');
  const ticket = await googleClient.verifyIdToken({ idToken: req.body.idToken, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) throw new ApiError(401, 'Invalid Google token');
  if (!payload.email_verified) throw new ApiError(403, 'Google email is not verified');

  const existingUser = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existingUser && existingUser.role !== 'CUSTOMER') throw new ApiError(403, 'Please use the admin login page');
  if (existingUser && !existingUser.isActive) throw new ApiError(403, 'Account disabled');

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: payload.name ?? existingUser.name,
          avatarUrl: payload.picture,
          googleSub: payload.sub,
          authProvider: 'google'
        },
        select: { id: true, name: true, email: true, role: true, avatarUrl: true, isActive: true }
      })
    : await prisma.user.create({
        data: {
          name: payload.name ?? payload.email.split('@')[0],
          email: payload.email,
          avatarUrl: payload.picture,
          googleSub: payload.sub,
          authProvider: 'google',
          role: 'CUSTOMER',
          isActive: true
        },
        select: { id: true, name: true, email: true, role: true, avatarUrl: true, isActive: true }
      });

  res.json({ success: true, data: await issueAuthResponse(res, req, user) });
}));

router.post('/auth/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (user && user.isActive && user.role === 'CUSTOMER') {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(resetToken);
    const baseUrl = env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl}/customer/reset-password?token=${resetToken}`;
    await prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 1000 * 60 * 60) } });
    await sendMail({ to: user.email, subject: 'Reset your LUXE password', html: passwordResetTemplate(user.name, resetUrl) });
  }
  res.json({ success: true, data: { accepted: true } });
}));

router.post('/auth/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  const tokenHash = hashToken(req.body.token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date() || !resetToken.user.isActive || resetToken.user.role !== 'CUSTOMER') {
    throw new ApiError(400, 'Invalid or expired reset token');
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: resetToken.userId }, data: { passwordHash: await hashPassword(req.body.password), authProvider: 'credentials' } });
    await tx.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: new Date() } });
    await tx.refreshSession.updateMany({ where: { userId: resetToken.userId, revokedAt: null }, data: { revokedAt: new Date() } });
  });
  clearRefreshCookie(res);
  res.json({ success: true, data: { reset: true } });
}));

router.get('/auth/invite/:token', authLimiter, validate(inviteTokenSchema), asyncHandler(async (req: Request, res: Response) => {
  const tokenHash = hashToken(getStringParam(req.params.token));
  const invite = await prisma.adminInvitation.findUnique({ where: { tokenHash }, include: { user: { select: { name: true, email: true, role: true, isActive: true } } } });
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt <= new Date()) throw new ApiError(400, 'Invalid or expired invitation');
  if (invite.user.isActive) throw new ApiError(409, 'Invitation already accepted');
  res.json({ success: true, data: { name: invite.user.name, email: invite.user.email, role: invite.user.role, expiresAt: invite.expiresAt } });
}));

router.post('/auth/invite/accept', authLimiter, validate(inviteAcceptSchema), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const tokenHash = hashToken(req.body.token);
  const invite = await prisma.adminInvitation.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt <= new Date()) throw new ApiError(400, 'Invalid or expired invitation');
  if (invite.user.role !== invite.role) throw new ApiError(409, 'Invitation role mismatch');
  if (invite.user.isActive) throw new ApiError(409, 'Invitation already accepted');
  const acceptedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: invite.userId },
      data: { passwordHash: await hashPassword(req.body.password), isActive: true, authProvider: 'credentials' },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true }
    });
    await tx.adminInvitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    await tx.refreshSession.updateMany({ where: { userId: invite.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: invite.userId, actorEmail: updated.email, actorRole: updated.role, action: 'INVITE_ACCEPT', resource: '/auth/invite/accept', resourceId: invite.id, ipAddress: req.ip, userAgent: req.get('user-agent'), metadata: { invitedById: invite.invitedById, role: updated.role } as any } });
    return updated;
  });
  res.json({ success: true, data: await issueAuthResponse(res, req, acceptedUser) });
}));

router.get('/me', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { addresses: true } });
  if (!user) throw new ApiError(404, 'User not found');
  
  // Map roles to capabilities
  const capabilities: string[] = [];
  if (user.role === 'SUPER_ADMIN') capabilities.push('all');
  else if (user.role === 'ADMIN') capabilities.push('products:write', 'orders:read', 'customers:read', 'promos:write', 'reviews:write');
  else if (user.role === 'STAFF') capabilities.push('products:read', 'orders:read', 'customers:read', 'shipping:write');
  else if (user.role === 'CUSTOMER') capabilities.push('cart:write', 'wishlist:write', 'checkout:create', 'orders:read-own');
  
  res.json({ 
    success: true, 
    data: { 
      ...user, 
      capabilities 
    } 
  });
}));

router.get('/categories', asyncHandler(async (_req, res) => {
  const data = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json({ success: true, data });
}));

router.get('/products', asyncHandler(async (req, res) => {
  const search = String(req.query.search ?? '');
  const category = String(req.query.category ?? '');
  const data = await prisma.product.findMany({
    where: { isActive: true, name: { contains: search, mode: 'insensitive' }, ...(category ? { category: { slug: category } } : {}) },
    include: { category: true, images: { orderBy: { sortOrder: 'asc' } }, variants: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data });
}));

router.get('/products/:slug', asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({ where: { slug: getStringParam(req.params.slug) }, include: { category: true, images: { orderBy: { sortOrder: 'asc' } }, variants: true, reviews: { where: { isApproved: true }, include: { user: { select: { name: true } } } } } });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ success: true, data: product });
}));

router.post('/wishlist/:productId', requireAuth, requirePermission('wishlist:write'), asyncHandler(async (req: AuthedRequest, res) => {
  const productId = getStringParam(req.params.productId);
  const item = await prisma.wishlistItem.upsert({ where: { userId_productId: { userId: req.user!.id, productId } }, update: {}, create: { userId: req.user!.id, productId } });
  res.status(201).json({ success: true, data: item });
}));

router.get('/cart', requireAuth, requirePermission('cart:write'), asyncHandler(async (req: AuthedRequest, res) => {
  const data = await prisma.cartItem.findMany({ where: { userId: req.user!.id }, include: { product: { include: { images: true } }, variant: true } });
  res.json({ success: true, data });
}));

router.post('/cart', requireAuth, requirePermission('cart:write'), validate(cartItemSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const { productId, variantId, quantity = 1 } = req.body;
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { variants: true } });
  if (!product || !product.isActive) throw new ApiError(422, 'Product is not available');
  const variant = variantId ? await prisma.productVariant.findUnique({ where: { id: variantId } }) : null;
  if (variantId && (!variant || variant.productId !== productId)) throw new ApiError(422, 'Invalid variant selection');
  if (variant && variant.stock < quantity) throw new ApiError(422, 'Insufficient stock');
  const item = await prisma.cartItem.upsert({ where: { userId_productId_variantId: { userId: req.user!.id, productId, variantId: variantId ?? null } as any }, update: { quantity: { increment: quantity } }, create: { userId: req.user!.id, productId, variantId, quantity } });
  res.status(201).json({ success: true, data: item });
}));

router.post('/orders', requireAuth, requirePermission('checkout:create'), validate(orderCreateSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const cart = await prisma.cartItem.findMany({ where: { userId: req.user!.id }, include: { product: true, variant: true } });
  if (!cart.length) throw new ApiError(422, 'Cart is empty');
  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.salePrice ?? item.product.price) * item.quantity + Number(item.variant?.priceDelta ?? 0) * item.quantity, 0);
  const shippingFee = (req.body.shippingMethod === 'store_pickup') ? 0 : 150;
  const total = subtotal + shippingFee;
  const orderNumber = `LX-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  const order = await prisma.$transaction(async tx => {
    // 1. Check active status for all items first
    for (const item of cart) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.isActive) throw new ApiError(422, `${item.product.name} is no longer available`);
    }

    const shippingMethod = req.body.shippingMethod ?? 'standard_delivery';
    const addressJson = shippingMethod === 'store_pickup' ? { type: 'STORE_PICKUP' } : req.body.deliveryAddress;
    
    const created = await tx.order.create({ 
      data: { 
        orderNumber, userId: req.user!.id, subtotal, shippingFee, total, customerNote: req.body.customerNote, 
        shipment: { create: { method: shippingMethod, addressJson } }, 
        items: { create: cart.map(item => ({ 
          productId: item.productId, variantId: item.variantId, name: item.product.name, sku: item.variant?.sku, 
          unitPrice: Number(item.product.salePrice ?? item.product.price) + Number(item.variant?.priceDelta ?? 0), 
          quantity: item.quantity, lineTotal: (Number(item.product.salePrice ?? item.product.price) + Number(item.variant?.priceDelta ?? 0)) * item.quantity 
        })) } 
      }, 
      include: { items: true, shipment: true } 
    });

    // 2. Atomic Stock Decrement (Fixes Race Condition)
    for (const item of cart) {
      if (item.variantId) {
        const updated = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } }
        });
        if (updated.count === 0) throw new ApiError(422, `Insufficient stock for ${item.product.name}`);
      }
    }

    await tx.cartItem.deleteMany({ where: { userId: req.user!.id } });
    return created;
  });
  await sendMail({ to: user.email, subject: `Your LUXE order receipt ${order.orderNumber}`, html: orderReceiptTemplate({ orderNumber: order.orderNumber, customerName: user.name, subtotal, shippingFee, total, paymentStatus: order.paymentStatus, paymentMethod: req.body.paymentMethod || "Pending", deliveryAddress: order.shipment?.addressJson as any, items: order.items.map(item => ({ name: item.name, quantity: item.quantity, unitPrice: Number(item.unitPrice), lineTotal: Number(item.lineTotal) })) }) });
  res.status(201).json({ success: true, data: order });
}));

router.get('/orders/me', requireAuth, requirePermission('orders:read-own'), asyncHandler(async (req: AuthedRequest, res) => {
  const data = await prisma.order.findMany({ where: { userId: req.user!.id }, include: { items: true, shipment: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
}));

// Admin API audit layer: logs mutating admin actions.
router.use('/admin', requireAuth, (req: AuthedRequest, res, next) => {
  res.on('finish', () => {
    if (req.method !== 'GET' && res.statusCode < 400 && req.user) {
      void prisma.auditLog.create({ data: { actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: req.method, resource: req.path, resourceId: req.params?.id ? getStringParam(req.params.id) : undefined, ipAddress: req.ip, userAgent: req.get('user-agent'), metadata: { body: redactSensitiveMetadata(req.body) } as any } }).catch(() => undefined);
    }
  });
  next();
});

// Admin API
router.get('/admin/dashboard', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req, res) => {
  const [orders, products, customers, lowStock] = await Promise.all([
    prisma.order.count(), prisma.product.count(), prisma.user.count({ where: { role: 'CUSTOMER' } }), prisma.productVariant.count({ where: { stock: { lte: 5 } } })
  ]);
  const revenue = await prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { total: true } });
  res.json({ success: true, data: { orders, products, customers, lowStock, revenue: revenue._sum.total ?? 0 } });
}));
router.post('/admin/products', requireAuth, requireRole('ADMIN'), validate(productSchema), asyncHandler(async (req, res) => {
  const product = await prisma.product.create({ data: { categoryId: req.body.categoryId, name: req.body.name, slug: req.body.slug, description: req.body.description, price: req.body.price, salePrice: req.body.salePrice, material: req.body.material, careGuide: req.body.careGuide, isFeatured: req.body.isFeatured, isActive: req.body.isActive } });
  res.status(201).json({ success: true, data: product });
}));
router.get('/admin/orders', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req, res) => {
  const data = await prisma.order.findMany({ include: { user: { select: { name: true, email: true } }, items: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
}));
router.patch('/admin/orders/:id/status', requireAuth, requireRole('ADMIN', 'STAFF'), validate(orderStatusSchema), asyncHandler(async (req, res) => {
  const order = await prisma.order.update({ where: { id: getStringParam(req.params.id) }, data: { status: req.body.status } });
  res.json({ success: true, data: order });
}));
router.get('/admin/reports/sales', requireAuth, requireRole('ADMIN'), asyncHandler(async (_req, res) => {
  const sales = await prisma.order.groupBy({ by: ['status'], _count: true, _sum: { total: true } });
  res.json({ success: true, data: sales });
}));

// Payment gateway checkout API: PayMongo / Maya / Xendit / manual / mock
router.post('/payments/checkout', requireAuth, validate(paymentCheckoutSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const order = await prisma.order.findFirst({ where: { id: req.body.orderId, userId: req.user!.id }, include: { user: true, payment: true } });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.paymentStatus === 'PAID') throw new ApiError(409, 'Order is already paid');
  const checkout = await createPaymentCheckout({
    provider: req.body.provider,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: Number(order.total),
    description: `LUXE order ${order.orderNumber}`,
    customer: { name: order.user.name, email: order.user.email, phone: order.user.phone },
    successUrl: req.body.successUrl,
    cancelUrl: req.body.cancelUrl
  });
  const payment = await prisma.payment.upsert({
    where: { orderId: order.id },
    update: { provider: checkout.provider, reference: checkout.reference, checkoutUrl: checkout.checkoutUrl, metadata: checkout.raw as any, status: 'PENDING' },
    create: { orderId: order.id, provider: checkout.provider, reference: checkout.reference, checkoutUrl: checkout.checkoutUrl, metadata: checkout.raw as any, amount: order.total, status: 'PENDING' }
  });
  await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'PENDING' } });
  res.status(201).json({ success: true, data: { payment, checkoutUrl: checkout.checkoutUrl, instructions: checkout.instructions } });
}));

router.post('/payments/webhook/:provider', asyncHandler(async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body ?? {});
  const payload = Buffer.isBuffer(req.body) ? JSON.parse(rawBody || '{}') : req.body;
  if (!verifyWebhookSignature(rawBody, req.header('x-luxe-signature') || req.header('x-paymongo-signature') || req.header('x-callback-token'))) throw new ApiError(401, 'Invalid payment webhook signature');
  const provider = getStringParam(req.params.provider);
  const eventId = String(payload?.event_id || payload?.data?.id || payload?.id || payload?.reference || nanoid(16));
  
  // Atomic Idempotency Check: Attempt to mark as processed only if it was null.
  const event = await prisma.webhookEvent.upsert({ 
    where: { eventId }, 
    update: { payload: redactSensitiveMetadata(payload) as any }, 
    create: { provider, eventId, eventType: String(payload?.type || payload?.event || 'unknown'), payload: redactSensitiveMetadata(payload) as any } 
  });

  if (event.processedAt) return res.json({ success: true, received: true, duplicate: true, provider });

  const reference = payload?.data?.attributes?.reference_number || payload?.data?.attributes?.external_reference_number || payload?.data?.attributes?.metadata?.orderNumber || payload?.data?.attributes?.metadata?.orderId || payload?.data?.id || payload?.id || payload?.reference || payload?.external_id;
  const eventType = String(payload?.type || payload?.event || 'unknown');
  const paidEventTypes: Record<string, string[]> = {
    paymongo: ['payment.paid', 'checkout_session.payment.paid'],
    xendit: ['invoice.paid'],
    maya: ['CHECKOUT_SUCCESS'],
    manual: [],
    mock: ['mock.payment.paid']
  };

  if (reference && (paidEventTypes[provider] || []).includes(eventType)) {
    const payment = await prisma.payment.findFirst({ where: { OR: [{ reference }, { order: { orderNumber: reference } }] }, include: { order: true } });
    if (payment) {
      const amount = Number(payload?.data?.attributes?.amount ?? payload?.amount ?? payment.amount);
      const currency = String(payload?.data?.attributes?.currency ?? payload?.currency ?? 'PHP').toUpperCase();
      if (amount && amount !== Number(payment.amount) && amount !== Math.round(Number(payment.amount) * 100)) throw new ApiError(422, 'Webhook amount mismatch');
      if (currency !== 'PHP') throw new ApiError(422, 'Webhook currency mismatch');
      
      // Transactionally update payment, order, and mark event as processed
      await prisma.$transaction([
        prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAt: new Date(), metadata: redactSensitiveMetadata(payload) as any } }),
        prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID', status: 'CONFIRMED' } }),
        prisma.webhookEvent.update({ where: { eventId }, data: { processedAt: new Date() } })
      ]);
    }
  } else {
    // If not a paid event, we still mark the event as processed to avoid re-running the logic
    await prisma.webhookEvent.update({ where: { eventId }, data: { processedAt: new Date() } });
  }
  res.json({ success: true, received: true, provider });
}));

// Admin CRUD APIs
router.get('/admin/products', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req, res) => {
  const data = await prisma.product.findMany({ include: { category: true, images: true, variants: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
}));
router.patch('/admin/products/:id', requireAuth, requireRole('ADMIN'), validate(productUpdateSchema), asyncHandler(async (req, res) => {
  const product = await prisma.product.update({ where: { id: getStringParam(req.params.id) }, data: pickDefined(req.body) });
  res.json({ success: true, data: product });
}));
router.delete('/admin/products/:id', requireAuth, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const product = await prisma.product.update({ where: { id: getStringParam(req.params.id) }, data: { isActive: false } });
  res.json({ success: true, data: product });
}));

router.get('/admin/categories', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req, res) => {
  const data = await prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: 'asc' } });
  res.json({ success: true, data });
}));
router.post('/admin/categories', requireAuth, requireRole('ADMIN'), validate(categorySchema), asyncHandler(async (req, res) => {
  const category = await prisma.category.create({ data: { name: req.body.name, slug: req.body.slug, imageUrl: req.body.imageUrl } });
  res.status(201).json({ success: true, data: category });
}));
router.patch('/admin/categories/:id', requireAuth, requireRole('ADMIN'), validate(categoryUpdateSchema), asyncHandler(async (req, res) => {
  const category = await prisma.category.update({ where: { id: getStringParam(req.params.id) }, data: pickDefined(req.body) });
  res.json({ success: true, data: category });
}));
router.delete('/admin/categories/:id', requireAuth, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const id = getStringParam(req.params.id);
  await prisma.category.delete({ where: { id } });
  res.json({ success: true, data: { id } });
}));

router.get('/admin/variants', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req, res) => {
  const data = await prisma.productVariant.findMany({ include: { product: { select: { name: true } } }, orderBy: { sku: 'asc' } });
  res.json({ success: true, data });
}));
router.post('/admin/variants', requireAuth, requireRole('ADMIN'), validate(variantSchema), asyncHandler(async (req, res) => {
  const variant = await prisma.productVariant.create({ data: { productId: req.body.productId, sku: req.body.sku, color: req.body.color, size: req.body.size, material: req.body.material, hardware: req.body.hardware, priceDelta: req.body.priceDelta, stock: req.body.stock, lowStockAt: req.body.lowStockAt } });
  res.status(201).json({ success: true, data: variant });
}));
router.patch('/admin/variants/:id', requireAuth, requireRole('ADMIN', 'STAFF'), validate(variantUpdateSchema), asyncHandler(async (req, res) => {
  const variant = await prisma.productVariant.update({ where: { id: getStringParam(req.params.id) }, data: pickDefined(req.body) });
  res.json({ success: true, data: variant });
}));
router.delete('/admin/variants/:id', requireAuth, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const id = getStringParam(req.params.id);
  await prisma.productVariant.delete({ where: { id } });
  res.json({ success: true, data: { id } });
}));

router.get('/admin/inventory', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req, res) => {
  const data = await prisma.productVariant.findMany({ include: { product: { select: { name: true } }, movements: { orderBy: { createdAt: 'desc' }, take: 5 } }, orderBy: { stock: 'asc' } });
  res.json({ success: true, data });
}));
router.post('/admin/inventory/movements', requireAuth, requireRole('ADMIN', 'STAFF'), validate(inventoryMovementSchema), asyncHandler(async (req, res) => {
  const movement = await prisma.$transaction(async tx => {
    const created = await tx.inventoryMovement.create({ data: { variantId: req.body.variantId, type: req.body.type, quantity: req.body.quantity, note: req.body.note } });
    const delta = req.body.type === 'OUT' || req.body.type === 'DAMAGED' ? -Math.abs(req.body.quantity) : Math.abs(req.body.quantity);
    await tx.productVariant.update({ where: { id: req.body.variantId }, data: { stock: { increment: delta } } });
    return created;
  });
  res.status(201).json({ success: true, data: movement });
}));

router.get('/admin/customers', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req, res) => {
  const data = await prisma.user.findMany({ where: { role: 'CUSTOMER' }, select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true, orders: true, wishlistItems: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
}));
router.patch('/admin/customers/:id', requireAuth, requireRole('ADMIN'), validate(customerUpdateSchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: getStringParam(req.params.id) }, data: pickDefined({ name: req.body.name, phone: req.body.phone, isActive: req.body.isActive }) });
  res.json({ success: true, data: user });
}));

router.get('/admin/promos', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req, res) => {
  const data = await prisma.promoCode.findMany({ orderBy: { code: 'asc' } });
  res.json({ success: true, data });
}));
router.post('/admin/promos', requireAuth, requireRole('ADMIN'), validate(promoSchema), asyncHandler(async (req, res) => {
  const promo = await prisma.promoCode.create({ data: { code: req.body.code, type: req.body.type, value: req.body.value, minSubtotal: req.body.minSubtotal, startsAt: req.body.startsAt ? new Date(req.body.startsAt) : undefined, endsAt: req.body.endsAt ? new Date(req.body.endsAt) : undefined, usageLimit: req.body.usageLimit, isActive: req.body.isActive } });
  res.status(201).json({ success: true, data: promo });
}));
router.patch('/admin/promos/:id', requireAuth, requireRole('ADMIN'), validate(promoUpdateSchema), asyncHandler(async (req, res) => {
  const promo = await prisma.promoCode.update({ where: { id: getStringParam(req.params.id) }, data: pickDefined({ ...req.body, startsAt: req.body.startsAt ? new Date(req.body.startsAt) : req.body.startsAt, endsAt: req.body.endsAt ? new Date(req.body.endsAt) : req.body.endsAt }) });
  res.json({ success: true, data: promo });
}));
router.delete('/admin/promos/:id', requireAuth, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const id = getStringParam(req.params.id);
  await prisma.promoCode.delete({ where: { id } });
  res.json({ success: true, data: { id } });
}));

router.get('/admin/reviews', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req, res) => {
  const data = await prisma.review.findMany({ include: { user: { select: { name: true, email: true } }, product: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
}));
router.patch('/admin/reviews/:id', requireAuth, requireRole('ADMIN', 'STAFF'), validate(reviewUpdateSchema), asyncHandler(async (req, res) => {
  const review = await prisma.review.update({ where: { id: getStringParam(req.params.id) }, data: pickDefined({ isApproved: req.body.isApproved, comment: req.body.comment }) });
  res.json({ success: true, data: review });
}));
router.delete('/admin/reviews/:id', requireAuth, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const id = getStringParam(req.params.id);
  await prisma.review.delete({ where: { id } });
  res.json({ success: true, data: { id } });
}));

router.get('/admin/payments', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req, res) => {
  const data = await prisma.payment.findMany({ include: { order: { select: { orderNumber: true, user: { select: { name: true, email: true } } } } }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
}));
router.patch('/admin/payments/:id', requireAuth, requireRole('ADMIN'), validate(paymentUpdateSchema), asyncHandler(async (req, res) => {
  const payment = await prisma.payment.update({ where: { id: getStringParam(req.params.id) }, data: { status: req.body.status, reference: req.body.reference, paidAt: req.body.status === 'PAID' ? new Date() : undefined } });
  if (req.body.status === 'PAID') await prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID', status: 'CONFIRMED' } });
  res.json({ success: true, data: payment });
}));

router.get('/admin/shipping', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req, res) => {
  const data = await prisma.shipment.findMany({ include: { order: { select: { orderNumber: true, user: { select: { name: true } } } } } });
  res.json({ success: true, data });
}));
router.patch('/admin/shipping/:id', requireAuth, requireRole('ADMIN', 'STAFF'), validate(shipmentUpdateSchema), asyncHandler(async (req, res) => {
  const shipment = await prisma.shipment.update({ where: { id: getStringParam(req.params.id) }, data: pickDefined({ method: req.body.method, courier: req.body.courier, trackingNo: req.body.trackingNo, shippedAt: req.body.shippedAt ? new Date(req.body.shippedAt) : req.body.shippedAt, deliveredAt: req.body.deliveredAt ? new Date(req.body.deliveredAt) : req.body.deliveredAt }) });
  res.json({ success: true, data: shipment });
}));

router.get('/admin/content', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req, res) => {
  const data = await prisma.contentBlock.findMany({ orderBy: { key: 'asc' } });
  res.json({ success: true, data });
}));
router.post('/admin/content', requireAuth, requireRole('ADMIN'), validate(contentSchema), asyncHandler(async (req, res) => {
  const content = await prisma.contentBlock.create({ data: { key: req.body.key, title: req.body.title, body: req.body.body, imageUrl: req.body.imageUrl, isActive: req.body.isActive } });
  res.status(201).json({ success: true, data: content });
}));
router.patch('/admin/content/:id', requireAuth, requireRole('ADMIN'), validate(contentUpdateSchema), asyncHandler(async (req, res) => {
  const content = await prisma.contentBlock.update({ where: { id: getStringParam(req.params.id) }, data: pickDefined(req.body) });
  res.json({ success: true, data: content });
}));
router.delete('/admin/content/:id', requireAuth, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const id = getStringParam(req.params.id);
  await prisma.contentBlock.delete({ where: { id } });
  res.json({ success: true, data: { id } });
}));

router.get('/admin/users', requireAuth, requireRole('SUPER_ADMIN'), asyncHandler(async (_req, res) => {
  const data = await prisma.user.findMany({ where: { role: { in: ['SUPER_ADMIN','ADMIN','MANAGER','STAFF','INVENTORY_STAFF','ORDER_STAFF','CONTENT_STAFF','SUPPORT_STAFF'] } }, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
}));
router.post('/admin/users', requireAuth, requireRole('SUPER_ADMIN'), validate(adminInviteSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const existing = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (existing) throw new ApiError(409, 'Email already registered');
  const invitationToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(invitationToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 72);
  const inviter = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { name: true, email: true } });
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: req.body.name, email: req.body.email, role: req.body.role, isActive: false, authProvider: 'invited' },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });
    const invitation = await tx.adminInvitation.create({
      data: { userId: user.id, invitedById: req.user!.id, tokenHash, role: req.body.role, expiresAt }
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'INVITE',
        resource: '/admin/users',
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { invitedEmail: user.email, role: user.role, invitationId: invitation.id, expiresAt } as any
      }
    });
    return { user, invitation };
  });
  const baseUrl = env.FRONTEND_URL || 'http://localhost:5173';
  const acceptUrl = `${baseUrl}/admin/accept-invite?token=${invitationToken}`;
  try {
    await sendMail({
      to: result.user.email,
      subject: 'You are invited to LUXE Staff Portal',
      html: adminInvitationTemplate(result.user.name, inviter.name, result.user.role, acceptUrl, expiresAt)
    });
  } catch (mailError) {
    console.error('Failed to send invitation email', mailError);
  }
  res.status(201).json({ success: true, data: { ...result.user, invitationRequired: true, invitationId: result.invitation.id, expiresAt } });
}));
router.patch('/admin/users/:id', requireAuth, requireRole('SUPER_ADMIN'), validate(adminUserUpdateSchema), asyncHandler(async (req, res) => {
  const id = getStringParam(req.params.id);
  if (id === (req as AuthedRequest).user!.id && req.body.isActive === false) throw new ApiError(422, 'You cannot deactivate your own account');
  const user = await prisma.user.update({ where: { id }, data: pickDefined({ name: req.body.name, role: req.body.role, isActive: req.body.isActive }), select: { id: true, name: true, email: true, role: true, isActive: true } });
  res.json({ success: true, data: user });
}));
router.delete('/admin/users/:id', requireAuth, requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const id = getStringParam(req.params.id);
  if (id === (req as AuthedRequest).user!.id) throw new ApiError(422, 'You cannot deactivate your own account');
  const user = await prisma.user.update({ where: { id }, data: { isActive: false }, select: { id: true, name: true, email: true, role: true, isActive: true } });
  res.json({ success: true, data: user });
}));

router.get('/admin/settings', requireAuth, requireRole('SUPER_ADMIN'), asyncHandler(async (_req, res) => {
  const data = await prisma.storeSetting.findMany({ orderBy: { key: 'asc' } });
  res.json({ success: true, data });
}));
router.put('/admin/settings/:key', requireAuth, requireRole('SUPER_ADMIN'), validate(settingsSchema), asyncHandler(async (req, res) => {
  const key = getStringParam(req.params.key);
  const setting = await prisma.storeSetting.upsert({ where: { key }, update: { value: req.body.value, group: req.body.group || 'general' }, create: { key, value: req.body.value, group: req.body.group || 'general' } });
  res.json({ success: true, data: setting });
}));

router.get('/admin/audit-logs', requireAuth, requireRole('SUPER_ADMIN'), asyncHandler(async (_req, res) => {
  const data = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  res.json({ success: true, data });
}));

router.post('/mail/test', requireAuth, requireRole('ADMIN'), validate(mailTestSchema), asyncHandler(async (req, res) => {
  const result = await sendMail({ to: req.body.to, subject: 'LUXE API Mail Test', html: '<h1>Mail API is working</h1><p>This was sent from your production backend mail service.</p>' });
  res.json({ success: true, data: result });
}));
