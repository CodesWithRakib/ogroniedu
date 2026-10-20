import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { ValidationPipe, ExecutionContext, CallHandler } from '@nestjs/common';
import { of, firstValueFrom } from 'rxjs';
import { SearchTutorsQueryDto } from '../src/modules/tutors/dto/search-tutors-query.dto';
import { GetNotificationsQueryDto } from '../src/modules/notifications/dto/get-notifications-query.dto';
import { GetMessagesQueryDto } from '../src/modules/notifications/dto/get-messages-query.dto';
import { ResponseMetaInterceptor } from '../src/common/interceptors/response-meta.interceptor';
import { paginated } from '../src/common/api-response/api-response';

/**
 * HTTP-layer boundary contracts (Phase 23 P1-6b + P2-7).
 * Mirrors the global pipe in main.ts: whitelist + transform +
 * forbidNonWhitelisted. Proves wrong param names fail loudly (400) instead
 * of being silently ignored, and documents the meta.requestId split:
 * controllers hand-build `{success, data}` while ResponseMetaInterceptor
 * injects `meta.requestId` at the HTTP layer — so service-level specs assert
 * shape via expectSuccessEnvelope(), and only HTTP-level specs assert meta.
 */
function globalPipe(): ValidationPipe {
  return new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
}

async function transformQuery(metatype: new () => object, value: Record<string, unknown>) {
  return globalPipe().transform(value, { type: 'query', metatype: metatype as never });
}

/** Shape assertion for service-level specs (no interceptor → no meta). */
export function expectSuccessEnvelope(
  res: unknown,
): asserts res is { success: true; data: unknown } {
  expect(res).toMatchObject({ success: true });
  expect(res as Record<string, unknown>).toHaveProperty('data');
}

/** Full assertion for HTTP-level specs (interceptor has injected meta). */
export function expectHttpEnvelope(
  res: unknown,
): asserts res is { success: true; data: unknown; meta: { requestId: string } } {
  expectSuccessEnvelope(res);
  const meta = (res as Record<string, unknown>).meta as Record<string, unknown>;
  expect(typeof meta?.requestId).toBe('string');
}

describe('forbidNonWhitelisted at the HTTP boundary', () => {
  it('rejects unknown query params on tutor search (no silent ignores)', async () => {
    await expect(transformQuery(SearchTutorsQueryDto, { page: 1, sortz: 'x' })).rejects.toThrow();
  });

  it('accepts both canonical pageSize and legacy limit on tutor search', async () => {
    const a = (await transformQuery(SearchTutorsQueryDto, { page: 2, pageSize: 25 })) as {
      pageSize?: number;
    };
    expect(a.pageSize).toBe(25);
    const b = (await transformQuery(SearchTutorsQueryDto, { page: 2, limit: 5 })) as {
      limit?: number;
    };
    expect(b.limit).toBe(5);
  });

  it('rejects unknown params on notifications and messages queries', async () => {
    await expect(
      transformQuery(GetNotificationsQueryDto, { page: 1, limitz: 10 }),
    ).rejects.toThrow();
    await expect(transformQuery(GetMessagesQueryDto, { cursr: 'x' })).rejects.toThrow();
  });

  it('expectSuccessEnvelope accepts interceptor-less controller payloads', () => {
    expectSuccessEnvelope({ success: true, data: { id: '1' } });
    expectSuccessEnvelope({ success: true, data: null, message: 'Removed.' });
  });

  it('expectHttpEnvelope requires meta.requestId (interceptor output)', () => {
    expectHttpEnvelope({ success: true, data: [], meta: { requestId: 'req-1' } });
    expect(() => expectHttpEnvelope({ success: true, data: [] })).toThrow();
  });
});

describe('ResponseMetaInterceptor observability metadata', () => {
  const interceptor = new ResponseMetaInterceptor();

  function mockContext(
    req: Record<string, unknown>,
    res: Record<string, unknown> = {},
  ): ExecutionContext {
    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({
          setHeader: (k: string, v: string) => {
            res[k] = v;
          },
          getHeader: (k: string) => res[k],
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('injects requestId, timestamp, path, and method into success responses', async () => {
    const ctx = mockContext({
      originalUrl: '/api/v1/learning/bookings/80cecf5f-2590-486b-a184-b4e35ef1c0e2',
      url: '/learning/bookings/80cecf5f-2590-486b-a184-b4e35ef1c0e2',
      method: 'GET',
      requestId: 'req-obs-1',
    });
    const next: CallHandler = {
      handle: () =>
        of({ success: true, data: { bookingId: '80cecf5f-2590-486b-a184-b4e35ef1c0e2' } }),
    };

    const result = (await firstValueFrom(interceptor.intercept(ctx, next))) as Record<string, any>;
    expect(result.success).toBe(true);
    expect(result.meta).toBeDefined();
    expect(result.meta.requestId).toBe('req-obs-1');
    expect(result.meta.path).toBe('/api/v1/learning/bookings/80cecf5f-2590-486b-a184-b4e35ef1c0e2');
    expect(result.meta.method).toBe('GET');
    expect(result.meta.timestamp).toBeDefined();
    expect(new Date(result.meta.timestamp).getTime()).not.toBeNaN();
  });

  it('preserves collection pagination and injects observability metadata', async () => {
    const ctx = mockContext({
      originalUrl: '/api/v1/tutors?page=1&pageSize=10',
      method: 'GET',
      requestId: 'req-obs-2',
    });
    const payload = paginated([{ id: 'tutor-1' }], { page: 1, pageSize: 10, totalItems: 1 });
    const next: CallHandler = {
      handle: () => of(payload),
    };

    const result = (await firstValueFrom(interceptor.intercept(ctx, next))) as Record<string, any>;
    expect(result.success).toBe(true);
    expect(result.meta.pagination.strategy).toBe('offset');
    expect(result.meta.pagination.totalItems).toBe(1);
    expect(result.meta.requestId).toBe('req-obs-2');
    expect(result.meta.path).toBe('/api/v1/tutors?page=1&pageSize=10');
    expect(result.meta.method).toBe('GET');
    expect(result.meta.timestamp).toBeDefined();
  });

  it('redacts sensitive query parameters from meta.path in success responses', async () => {
    const ctx = mockContext({
      originalUrl: '/api/v1/auth/verify?token=secret-token-value&email=student%40ogroni.edu',
      method: 'GET',
      requestId: 'req-obs-3',
    });
    const next: CallHandler = {
      handle: () => of({ success: true, data: { verified: true } }),
    };

    const result = (await firstValueFrom(interceptor.intercept(ctx, next))) as Record<string, any>;
    expect(result.meta.path).toContain('token=%5BREDACTED%5D');
    expect(result.meta.path).not.toContain('secret-token-value');
    expect(result.meta.path).toContain('email=');
  });

  it('bypasses exempt routes like /health', async () => {
    const ctx = mockContext({
      url: '/health',
      method: 'GET',
    });
    const rawPayload = { status: 'ok', info: { database: { status: 'up' } } };
    const next: CallHandler = {
      handle: () => of(rawPayload),
    };

    const result = await firstValueFrom(interceptor.intercept(ctx, next));
    expect(result).toBe(rawPayload);
  });
});
