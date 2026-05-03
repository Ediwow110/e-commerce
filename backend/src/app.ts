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
