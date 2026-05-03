import pino, { type LoggerOptions } from 'pino';
// pino-http exports the factory as the module's default; under NodeNext
// ESM interop the namespace shape varies, so normalise here.
import * as pinoHttpModule from 'pino-http';
import { env } from './env.js';

const pinoHttp = ((pinoHttpModule as unknown as { default?: unknown }).default
  ?? (pinoHttpModule as unknown as { pinoHttp?: unknown }).pinoHttp
  ?? pinoHttpModule) as (opts: Record<string, unknown>) => unknown;

/**
 * Structured production logger with secret redaction.
 * Use `req.log` inside route handlers (added by pino-http).
 * Use the singleton `logger` outside of request context (jobs, startup).
 *
 * Never call console.log in production code — it bypasses redaction.
 */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'req.headers["x-callback-token"]',
  'req.headers["paymongo-signature"]',
  'req.headers["x-paymongo-signature"]',
  'req.headers["x-luxe-signature"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.refreshToken',
  '*.accessToken',
  '*.tokenHash',
  '*.secret',
  '*.apiKey',
  '*.cvv',
  '*.cardNumber',
  '*.twoFactorSecret'
];

const baseOpts: LoggerOptions = {
  level: env.LOG_LEVEL ?? (env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  base: { env: env.NODE_ENV, service: 'luxe-api' }
};

if (env.NODE_ENV !== 'production' && env.NODE_ENV !== 'test') {
  baseOpts.transport = { target: 'pino-pretty', options: { colorize: true, singleLine: true } };
}

export const logger = pino(baseOpts);

type AnyReq = { headers: Record<string, string | string[] | undefined>; id?: string; method?: string; url?: string; remoteAddress?: string };
type AnyRes = { statusCode: number; setHeader: (k: string, v: string) => void };

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req: AnyReq, res: AnyRes) => {
    const id = (req.headers['x-request-id'] as string) || req.id;
    if (id) {
      res.setHeader('X-Request-Id', id);
      return id;
    }
    return undefined as unknown as string;
  },
  customLogLevel: (_req: AnyReq, res: AnyRes, err: unknown) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req: AnyReq) => ({ id: req.id, method: req.method, url: req.url, remoteAddress: req.remoteAddress }),
    res: (res: AnyRes) => ({ statusCode: res.statusCode })
  }
}) as unknown as (req: unknown, res: unknown, next: () => void) => void;
