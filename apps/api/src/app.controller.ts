import { Controller, Get, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { renderLandingPageHtml } from './landing/landing-page.template';
import { isSwaggerEnabled } from './config/swagger';

@Controller()
export class AppController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  getRoot(@Req() req: Request, @Res() res: Response): void {
    const acceptsJson =
      req.headers.accept?.includes('application/json') &&
      !req.headers.accept?.includes('text/html');

    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    const port = this.config.get<number | string>('PORT', 4000);
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'https://ogroniedu-web.vercel.app';
    const swaggerEnabled = isSwaggerEnabled();

    const host = req.get('host') || `localhost:${port}`;
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const apiUrl = `${protocol}://${host}`;

    if (acceptsJson) {
      res.json({
        success: true,
        data: {
          name: 'OgroniEdu API Gateway',
          version: '1.0.0',
          environment: nodeEnv,
          status: 'operational',
          documentation: swaggerEnabled ? '/api/docs' : null,
          health: {
            live: '/health/live',
            ready: '/health/ready',
          },
          endpoints: {
            publicStats: '/api/v1/public/stats',
            auth: '/api/v1/auth',
            tutors: '/api/v1/tutors',
            bookings: '/api/v1/bookings',
            learning: '/api/v1/learning',
            payments: '/api/v1/payments',
            notifications: '/notifications',
          },
        },
      });
      return;
    }

    const html = renderLandingPageHtml({
      nodeEnv,
      port,
      swaggerEnabled,
      frontendUrl,
      apiUrl,
    });

    res.type('text/html').send(html);
  }
}
