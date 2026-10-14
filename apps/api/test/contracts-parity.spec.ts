import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  SearchTutorsQuerySchema,
  GetMessagesQuerySchema,
  OffsetQuerySchema,
  CursorQuerySchema,
  GetNotificationsQuerySchema,
  resolveTutorSearchPageSize,
} from '@ogroniedu/contracts';
import { SearchTutorsQueryDto } from '../src/modules/tutors/dto/search-tutors-query.dto';
import { GetMessagesQueryDto } from '../src/modules/notifications/dto/get-messages-query.dto';
import {
  GetNotificationsQueryDto,
  resolveNotificationsOffsetLimit,
} from '../src/modules/notifications/dto/get-notifications-query.dto';

/**
 * Cross-stack parity: zod schemas in @ogroniedu/contracts vs backend
 * class-validator DTOs (Phase 23 P1-2). Any default/bound rename must update
 * both sides — these tests fail loudly instead of drifting silently.
 */
describe('contracts parity (zod ↔ class-validator)', () => {
  describe('tutor search', () => {
    it('zod and class DTO agree on defaults and bounds', async () => {
      const zodDefaults = SearchTutorsQuerySchema.parse({});
      expect(zodDefaults.page).toBe(1);
      expect(zodDefaults.limit).toBe(10);
      expect(zodDefaults.sort).toBe('recommended');

      const classDefaults = plainToInstance(SearchTutorsQueryDto, {});
      expect(classDefaults.page).toBe(1);
      expect(classDefaults.limit).toBe(10);
      expect(classDefaults.sort).toBe('recommended');
      expect(await validate(classDefaults)).toHaveLength(0);
    });

    it('both reject unknown sort/mode and oversized pages', async () => {
      expect(() => SearchTutorsQuerySchema.parse({ sort: 'hacked' })).toThrow();
      expect(() => SearchTutorsQuerySchema.parse({ mode: 'telepathy' })).toThrow();
      const over = plainToInstance(SearchTutorsQueryDto, { limit: 500 });
      expect((await validate(over)).length).toBeGreaterThan(0);
    });

    it('shared resolver matches on both stacks', () => {
      expect(resolveTutorSearchPageSize({ limit: 5, pageSize: 15 })).toBe(15);
      expect(resolveTutorSearchPageSize({ limit: 999 })).toBe(50);
    });
  });

  describe('booking messages query', () => {
    it('zod default pageSize 50 matches the class DTO default', async () => {
      expect(GetMessagesQuerySchema.parse({}).pageSize).toBe(50);
      const dto = plainToInstance(GetMessagesQueryDto, {});
      expect(dto.pageSize).toBe(50);
      expect(await validate(dto)).toHaveLength(0);
    });

    it('both enforce the 1-100 bound', async () => {
      expect(() => GetMessagesQuerySchema.parse({ pageSize: 500 })).toThrow();
      const over = plainToInstance(GetMessagesQueryDto, { pageSize: 500 });
      expect((await validate(over)).length).toBeGreaterThan(0);
    });
  });

  describe('notifications query', () => {
    it('zod and class DTO agree on offset defaults', async () => {
      const zod = GetNotificationsQuerySchema.parse({});
      expect(zod.limit).toBe(20);
      expect(zod.page).toBe(1);
      const dto = plainToInstance(GetNotificationsQueryDto, {});
      expect(dto.limit).toBe(20);
      expect(dto.page).toBe(1);
      expect(await validate(dto)).toHaveLength(0);
    });

    it('offset resolver prefers canonical pageSize', () => {
      expect(resolveNotificationsOffsetLimit({ limit: 5, pageSize: 15 })).toBe(15);
      expect(resolveNotificationsOffsetLimit({ limit: 5 })).toBe(5);
    });
  });

  describe('canonical offset/cursor shapes', () => {
    it('offset defaults to page 1 × 20 desc; cursor defaults to 20 next', () => {
      expect(OffsetQuerySchema.parse({})).toMatchObject({
        page: 1,
        pageSize: 20,
        sortOrder: 'desc',
      });
      expect(CursorQuerySchema.parse({})).toMatchObject({ pageSize: 20, direction: 'next' });
    });
  });
});
