import type { NextFunction, Request, Response } from 'express';

export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public details?: unknown) { super(message); }
}

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const error = err instanceof ApiError ? err : new ApiError(500, 'Internal server error');
  if (!(err instanceof ApiError)) console.error(err);
  res.status(error.statusCode).json({ success: false, message: error.message, details: error.details ?? undefined });
}
