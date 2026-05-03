import type { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

declare module 'express-serve-static-core' {
  interface Request {
    id: string;
  }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  req.id = (req.headers['x-request-id'] as string) || nanoid(12);
  res.setHeader('X-Request-Id', req.id);
  next();
}
