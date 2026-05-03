import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { env } from './env.js';
import { router } from './routes.js';
import { errorHandler } from './errors.js';
import { requestId } from './requestId.js';
import { httpLogger, logger } from './logger.js';
import { prisma } from './prisma.js';

export const app = express();
app.set('trust proxy', 1);
app.use(requestId);
app.use(httpLogger);

const corsOrigins = String(env.CORS_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false
}));

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (corsOrigins.length > 0 && corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  }
}));

app.use(compression());
app.use(cookieParser());
app.use('/api/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize());
app.use(hpp());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 250, standardHeaders: true, legacyHeaders: false }));

// Tighter per-IP limiter on credential / 2FA endpoints. The per-account
// lockout (failedLoginCount / lockedUntil) defends against attackers who
// know the email; this defends against attackers blasting many emails from
// one IP. Stacked, both are required for brute-force resistance.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts from this IP. Please slow down.' }
});
const twoFaVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many 2FA attempts. Please slow down.' }
});
app.use(['/api/auth/login', '/api/auth/admin/login', '/api/auth/google', '/api/auth/forgot-password', '/api/auth/reset-password'], credentialLimiter);
app.use('/api/auth/admin/2fa/login', twoFaVerifyLimiter);

// CSRF defence-in-depth for cookie-bearing state-changing auth endpoints.
// CORS already rejects cross-origin XHR/fetch with credentials, but a plain
// HTML <form action="/api/auth/refresh" method="POST"> would still send the
// httpOnly refresh cookie cross-site (SameSite=lax permits top-level POST in
// some configurations). When a refresh cookie is present, we require the
// request's Origin/Referer to match an allow-listed origin. Mobile/native
// clients send neither cookie nor Origin and pass through unaffected.
const corsOriginsSet = new Set(corsOrigins);
function requireSameOriginForCookieAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const cookieHeader = req.headers.cookie || '';
  if (!cookieHeader.includes('luxe_refresh_token=')) return next();
  const originHeader = req.get('origin') || req.get('referer') || '';
  if (!originHeader) return next(); // server-to-server / scripted clients
  try {
    const url = new URL(originHeader);
    const candidate = `${url.protocol}//${url.host}`;
    if (corsOriginsSet.has(candidate)) return next();
  } catch { /* fall through to reject */ }
  res.status(403).json({ success: false, message: 'Cross-origin auth request rejected' });
}
app.use(['/api/auth/refresh', '/api/auth/logout'], requireSameOriginForCookieAuth);

// Liveness — process is up. Used by load balancer.
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'luxe-api', uptime: process.uptime() });
});

// Readiness — DB is reachable. Used by orchestrator before sending traffic.
app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: 'up' });
  } catch (err) {
    logger.error({ err }, 'Readiness check failed');
    res.status(503).json({ ok: false, db: 'down' });
  }
});

app.use('/api', router);
app.use(errorHandler);
