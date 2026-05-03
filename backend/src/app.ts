import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { env } from './env.js';
import { router } from './routes.js';
import { errorHandler } from './errors.js';
import { requestId } from './requestId.js';

export const app = express();
app.set('trust proxy', 1);
app.use(requestId);
const corsOrigins = String(env.CORS_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false
}));
// FIX P2-012: CORS is deny-by-default — allow-all fallback is removed.
// No CORS_ORIGIN set → only same-origin requests (browser preflight from cross-origin is blocked).
// Validation in env.ts ensures CORS_ORIGIN is a proper domain in production.
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true); // same-origin or server-to-server
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
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 250, standardHeaders: true, legacyHeaders: false }));
app.use('/api', router);
app.use(errorHandler);
