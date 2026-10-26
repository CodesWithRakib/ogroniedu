import { describe, it, expect } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { AppController } from '../src/app.controller';
import type { Request, Response } from 'express';

describe('AppController', () => {
  const mockConfigService = {
    get: (key: string, defaultValue?: any) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'PORT') return 4000;
      if (key === 'FRONTEND_URL') return 'https://ogroniedu-web.vercel.app';
      return defaultValue;
    },
  } as unknown as ConfigService;

  const controller = new AppController(mockConfigService);

  it('serves rich HTML landing page for browser requests', () => {
    let sentType = '';
    let sentBody = '';

    const req = {
      headers: { accept: 'text/html,application/xhtml+xml' },
      get: () => 'ogroniedu.onrender.com',
      protocol: 'https',
      secure: true,
    } as unknown as Request;

    const res = {
      type: (contentType: string) => {
        sentType = contentType;
        return res;
      },
      send: (body: string) => {
        sentBody = body;
        return res;
      },
      json: () => res,
    } as unknown as Response;

    controller.getRoot(req, res);

    expect(sentType).toBe('text/html');
    expect(sentBody).toContain('OgroniEdu API Gateway');
    expect(sentBody).toContain('GATEWAY ONLINE');
    expect(sentBody).toContain('https://ogroniedu-web.vercel.app');
    expect(sentBody).toContain('/health/live');
    expect(sentBody).toContain('/api/v1/public/stats');
  });

  it('returns JSON gateway metadata for programmatic API clients', () => {
    let jsonPayload: any = null;

    const req = {
      headers: { accept: 'application/json' },
      get: () => 'ogroniedu.onrender.com',
      protocol: 'https',
      secure: true,
    } as unknown as Request;

    const res = {
      type: () => res,
      send: () => res,
      json: (payload: any) => {
        jsonPayload = payload;
        return res;
      },
    } as unknown as Response;

    controller.getRoot(req, res);

    expect(jsonPayload).toBeDefined();
    expect(jsonPayload.success).toBe(true);
    expect(jsonPayload.data.name).toBe('OgroniEdu API Gateway');
    expect(jsonPayload.data.status).toBe('operational');
    expect(jsonPayload.data.endpoints.publicStats).toBe('/api/v1/public/stats');
    expect(jsonPayload.data.health.live).toBe('/health/live');
  });
});
