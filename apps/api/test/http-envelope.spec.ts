import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { ValidationPipe } from '@nestjs/common';
import { SearchTutorsQueryDto } from '../src/modules/tutors/dto/search-tutors-query.dto';
import { GetNotificationsQueryDto } from '../src/modules/notifications/dto/get-notifications-query.dto';
import { GetMessagesQueryDto } from '../src/modules/notifications/dto/get-messages-query.dto';

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
