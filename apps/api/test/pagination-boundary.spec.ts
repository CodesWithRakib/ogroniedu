import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';
import { assertSortAllowed, decodeCursor, encodeCursor } from '../src/common/pagination/pagination';
import { fromOffsetLimit, DEFAULT_PAGE_SIZE } from '../src/common/pagination/pagination.dto';
import {
  SearchTutorsQueryDto,
  resolveTutorSearchPageSize,
} from '../src/modules/tutors/dto/search-tutors-query.dto';
import {
  GetNotificationsQueryDto,
  resolveNotificationsOffsetLimit,
} from '../src/modules/notifications/dto/get-notifications-query.dto';
import { isAdminRole, isSuperAdmin, hasAnyRole } from '../src/common/auth/role.utils';

function errorCode(err: unknown): string | undefined {
  if (err instanceof BadRequestException) {
    const res = err.getResponse() as Record<string, unknown>;
    return typeof res.code === 'string' ? res.code : undefined;
  }
  return undefined;
}

describe('Pagination boundary contracts (Phase 23 P1-6)', () => {
  describe('decodeCursor', () => {
    it('returns null when no cursor is supplied', () => {
      expect(decodeCursor(undefined)).toBeNull();
    });

    it('round-trips a valid cursor', () => {
      const token = encodeCursor({ t: new Date().toISOString(), id: 'notif-1' });
      expect(decodeCursor(token)).toEqual(expect.objectContaining({ id: 'notif-1' }));
    });

    it('throws INVALID_CURSOR on garbage input', () => {
      try {
        decodeCursor('not-a-valid-cursor!!');
        expect.unreachable('expected INVALID_CURSOR');
      } catch (err) {
        expect(errorCode(err)).toBe('INVALID_CURSOR');
      }
    });

    it('throws INVALID_CURSOR on well-formed base64 with bad shape', () => {
      const bad = Buffer.from(JSON.stringify({ nope: 1 }), 'utf8').toString('base64url');
      try {
        decodeCursor(bad);
        expect.unreachable('expected INVALID_CURSOR');
      } catch (err) {
        expect(errorCode(err)).toBe('INVALID_CURSOR');
      }
    });
  });

  describe('assertSortAllowed', () => {
    it('passes for whitelisted and absent sort fields', () => {
      expect(() => assertSortAllowed(undefined, ['createdAt'])).not.toThrow();
      expect(() => assertSortAllowed('', ['createdAt'])).not.toThrow();
      expect(() => assertSortAllowed('createdAt', ['createdAt'])).not.toThrow();
    });

    it('throws SORT_NOT_ALLOWED for anything else (no SQL interpolation)', () => {
      try {
        assertSortAllowed('password_hash; DROP TABLE users', ['createdAt']);
        expect.unreachable('expected SORT_NOT_ALLOWED');
      } catch (err) {
        expect(errorCode(err)).toBe('SORT_NOT_ALLOWED');
      }
    });
  });

  describe('fromOffsetLimit', () => {
    it('converts legacy offset/limit to canonical page/pageSize', () => {
      expect(fromOffsetLimit({ offset: 0, limit: 20 })).toEqual({ page: 1, pageSize: 20 });
      expect(fromOffsetLimit({ offset: 40, limit: 20 })).toEqual({ page: 3, pageSize: 20 });
      expect(fromOffsetLimit({})).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    });
  });

  describe('tutor search page size (canonical pageSize, legacy limit)', () => {
    it('prefers pageSize, falls back to limit, defaults to 10, clamps to 50', () => {
      expect(resolveTutorSearchPageSize({})).toBe(10);
      expect(resolveTutorSearchPageSize({ limit: 5 })).toBe(5);
      expect(resolveTutorSearchPageSize({ limit: 5, pageSize: 15 })).toBe(15);
      expect(resolveTutorSearchPageSize({ limit: 999 })).toBe(50);
      expect(resolveTutorSearchPageSize({ pageSize: 999 })).toBe(50);
    });

    it('rejects out-of-range limit/pageSize at the DTO boundary', async () => {
      const overLimit = plainToInstance(SearchTutorsQueryDto, { limit: 999 });
      expect((await validate(overLimit)).length).toBeGreaterThan(0);
      const overPageSize = plainToInstance(SearchTutorsQueryDto, { pageSize: 999 });
      expect((await validate(overPageSize)).length).toBeGreaterThan(0);
      const ok = plainToInstance(SearchTutorsQueryDto, { page: 2, pageSize: 25 });
      expect(await validate(ok)).toHaveLength(0);
    });
  });

  describe('notifications offset limit (canonical pageSize, legacy limit)', () => {
    it('prefers pageSize, falls back to limit, defaults to 20', () => {
      expect(resolveNotificationsOffsetLimit({})).toBe(20);
      expect(resolveNotificationsOffsetLimit({ limit: 5 })).toBe(5);
      expect(resolveNotificationsOffsetLimit({ limit: 5, pageSize: 15 })).toBe(15);
      expect(resolveNotificationsOffsetLimit({ limit: 500 })).toBe(100);
    });

    it('accepts both params at the DTO boundary', async () => {
      const dto = plainToInstance(GetNotificationsQueryDto, { page: 2, limit: 10, pageSize: 10 });
      expect(await validate(dto)).toHaveLength(0);
    });
  });

  describe('role.utils (centralized admin checks)', () => {
    it('isAdminRole covers admin and super_admin only', () => {
      expect(isAdminRole({ roles: ['admin'] })).toBe(true);
      expect(isAdminRole({ roles: ['super_admin'] })).toBe(true);
      expect(isAdminRole({ roles: ['tutor'] })).toBe(false);
      expect(isAdminRole(undefined)).toBe(false);
    });

    it('isSuperAdmin is exclusive; hasAnyRole grants super_admin bypass', () => {
      expect(isSuperAdmin({ roles: ['admin'] })).toBe(false);
      expect(isSuperAdmin({ roles: ['super_admin'] })).toBe(true);
      expect(hasAnyRole({ roles: ['super_admin'] }, 'tutor')).toBe(true);
      expect(hasAnyRole({ roles: ['tutor'] }, 'tutor')).toBe(true);
      expect(hasAnyRole({ roles: ['student'] }, 'tutor')).toBe(false);
    });
  });
});
