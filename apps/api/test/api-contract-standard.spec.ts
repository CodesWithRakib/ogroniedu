import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  ok,
  paginated,
  cursorPaginated,
  buildOffsetMeta,
} from '../src/common/api-response/api-response';
import { codeForStatus, errorEnvelope, toErrorDetails } from '../src/common/api-error/api-error';
import {
  assertSortAllowed,
  paginateArray,
  encodeCursor,
  decodeCursor,
} from '../src/common/pagination/pagination';

describe('API contract standard (Phase 22)', () => {
  it('ok() builds a single-resource envelope', () => {
    const res = ok({ id: 'r1' }, 'Created.');
    expect(res).toEqual({ success: true, data: { id: 'r1' }, message: 'Created.' });
  });

  it('paginated() carries canonical meta.pagination without legacy root fields', () => {
    const res = paginated([{ id: 'a' }], { page: 2, pageSize: 20, totalItems: 45 });
    expect(res.success).toBe(true);
    expect(res.meta.pagination).toMatchObject({
      strategy: 'offset',
      page: 2,
      pageSize: 20,
      totalItems: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
    expect(res).not.toHaveProperty('total');
    expect(res).not.toHaveProperty('page');
    expect(res).not.toHaveProperty('limit');
    expect(res).not.toHaveProperty('totalPages');
  });

  it('buildOffsetMeta() handles empty collections without zero-page math', () => {
    const meta = buildOffsetMeta({ page: 1, pageSize: 20, totalItems: 0 });
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNextPage).toBe(false);
  });

  it('cursorPaginated() builds an opaque cursor envelope', () => {
    const cursor = encodeCursor({ t: new Date(0).toISOString(), id: 'edge-1' });
    const res = cursorPaginated([{ id: 'm1' }], {
      nextCursor: cursor,
      hasNextPage: true,
      pageSize: 20,
    });
    expect(res.meta.pagination.strategy).toBe('cursor');
    expect(res.meta.pagination.nextCursor).toBe(cursor);
    expect(res).not.toHaveProperty('totalPages');
  });

  it('decodeCursor() rejects malformed tokens with INVALID_CURSOR', () => {
    try {
      decodeCursor('not-a-cursor!!');
      expect.unreachable('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
    }
    expect(decodeCursor(undefined)).toBeNull();
  });

  it('assertSortAllowed() rejects non-whitelisted fields without SQL interpolation', () => {
    expect(() => assertSortAllowed('createdAt', ['createdAt'])).not.toThrow();
    expect(() => assertSortAllowed('1;DROP TABLE users', ['createdAt'])).toThrow(
      BadRequestException,
    );
  });

  it('paginateArray() slices after filters with accurate metadata', () => {
    const all = Array.from({ length: 45 }, (_, i) => i);
    const { items, meta } = paginateArray(all, 2, 20);
    expect(items).toHaveLength(20);
    expect(meta.totalItems).toBe(45);
    expect(meta.hasNextPage).toBe(true);
  });

  it('errorEnvelope() + codeForStatus() map HTTP status to stable codes', () => {
    expect(codeForStatus(400)).toBe('VALIDATION_ERROR');
    expect(codeForStatus(404)).toBe('NOT_FOUND');
    expect(codeForStatus(500)).toBe('INTERNAL_ERROR');
    const env = errorEnvelope({ code: 'NOT_FOUND', message: 'Missing.', requestId: 'req-1' });
    expect(env).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Missing.' },
      meta: { requestId: 'req-1' },
    });
  });

  it('toErrorDetails() converts validator messages to field details', () => {
    const details = toErrorDetails(['email must be valid', 'name too short']);
    expect(details).toHaveLength(2);
    expect(details?.[0]).toMatchObject({ code: 'INVALID_VALUE' });
    expect(toErrorDetails('single string')).toBeUndefined();
  });

  it('toErrorDetails() expands class-validator ValidationError objects per constraint', () => {
    const details = toErrorDetails([
      {
        property: 'email',
        constraints: { isNotEmpty: 'email should not be empty', isEmail: 'email must be an email' },
      },
      { property: 'message', constraints: { minLength: 'message too short' } },
    ]);
    expect(details).toEqual([
      { field: 'email', code: 'REQUIRED', message: 'email should not be empty' },
      { field: 'email', code: 'INVALID_FORMAT', message: 'email must be an email' },
      { field: 'message', code: 'TOO_SHORT', message: 'message too short' },
    ]);
  });
});
