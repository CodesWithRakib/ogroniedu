import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // 1. Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const isFileRoute = req.originalUrl?.includes('/api/v1/files/') || req.baseUrl?.includes('/api/v1/files/');

    // 2. Clickjacking defense (deny framing for app routes, allow frontend origin for files)
    if (isFileRoute) {
      res.setHeader('Content-Security-Policy', `default-src 'self'; frame-ancestors 'self' ${frontendUrl} http://localhost:5000;`);
    } else {
      res.setHeader('X-Frame-Options', 'DENY');
      // 7. Content Security Policy (CSP) baseline
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-ancestors 'none';",
      );
    }

    // 3. Disable legacy buggy XSS auditor in modern browsers
    res.setHeader('X-XSS-Protection', '0');

    // 4. Force HTTPS transport security (HSTS)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // 5. Control referrer leakage
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 6. Restrict hazardous device APIs
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    next();
  }
}
