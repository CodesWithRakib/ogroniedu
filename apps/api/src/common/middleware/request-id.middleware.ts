import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const headerRequestId = req.headers['x-request-id'];
    const requestId =
      typeof headerRequestId === 'string' && headerRequestId.trim().length > 0
        ? headerRequestId
        : crypto.randomUUID();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
