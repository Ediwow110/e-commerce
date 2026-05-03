import type { NextFunction, Request, Response } from 'express';
import { env } from './env.js';
import { logger } from './logger.js';
import { captureException } from './sentry.js';

export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public details?: unknown) { super(message); }
}

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const error = err instanceof ApiError ? err : new ApiError(500, 'Internal server error');
  const isOperational = err instanceof ApiError;
  const reqId = (req as { id?: string }).id;

  if (!isOperational) {
    // Unhandled error path — log full detail server-side, Sentry if available, but never leak to client.
    logger.error({ err, reqId, url: req.originalUrl, method: req.method }, 'Unhandled error');
    void captureException(err, { reqId, url: req.originalUrl, method: req.method });
  } else if (error.statusCode >= 500) {
    logger.error({ err, reqId }, 'Server error');
  } else {
    logger.warn({ statusCode: error.statusCode, message: error.message, reqId }, 'Client error');
  }

  const body: Record<string, unknown> = {
    success: false,
    message: error.message,
    requestId: reqId
  };
  if (error.details !== undefined) body.details = error.details;
  // Only expose stack in non-production for unexpected errors
  if (!isOperational && env.NODE_ENV !== 'production' && err instanceof Error) {
    body.stack = err.stack;
  }
  res.status(error.statusCode).json(body);
}
