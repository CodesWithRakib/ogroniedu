import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // 1. Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 2. Clickjacking defense (deny framing)
    res.setHeader('X-Frame-Options', 'DENY');

    // 3. Disable legacy buggy XSS auditor in modern browsers
    res.setHeader('X-XSS-Protection', '0');

    // 4. Force HTTPS transport security (HSTS)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // 5. Control referrer leakage
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 6. Restrict hazardous device APIs
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    // 7. Content Security Policy (CSP) baseline
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-ancestors 'none';",
    );

    next();
  }
}
