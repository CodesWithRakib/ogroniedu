import { describe, it, expect } from 'vitest';
import {
  parseItem,
  parseOffsetCollection,
  parseCursorCollection,
  fieldErrorsOf,
} from '../src/lib/api/parse';
import { normalizeUnknownError } from '../src/lib/api-error';

/**
 * Round-trip coverage (Phase 23 P3-3): realistic server payloads per resource
 * through the canonical parsers, field-error mapping, and per-code locale
 * normalization. Guards the API↔web contract without a live backend.
 */
describe('contract round-trips per resource', () => {
  it('tutor search: canonical meta.pagination and legacy fields both parse', () => {
    const canonical = {
      success: true,
      data: [{ id: 't-1' }],
      meta: {
        requestId: 'req-1',
        pagination: {
          strategy: 'offset',
          page: 2,
          pageSize: 10,
          totalItems: 25,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      },
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3,
    };
    const parsed = parseOffsetCollection(canonical);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.pagination).toMatchObject({ page: 2, pageSize: 10, totalItems: 25 });

    const legacy = {
      success: true,
      data: [{ id: 't-1' }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
    expect(parseOffsetCollection(legacy).pagination.totalItems).toBe(1);
  });

  it('tutor delete (data:null) parses as a void mutation', () => {
    expect(parseItem({ success: true, data: null, message: 'Removed.' })).toBeNull();
  });

  it('session cancel keeps policyAssessment inside data', () => {
    const payload = {
      success: true,
      data: { session: { id: 's-1' }, policyAssessment: { refundPercentage: 100 } },
    };
    const data = parseItem<{
      session: { id: string };
      policyAssessment: { refundPercentage: number };
    }>(payload);
    expect(data.policyAssessment.refundPercentage).toBe(100);
    expect(payload).not.toHaveProperty('assessment');
  });

  it('notifications: offset page with totals; cursor page without totalPages', () => {
    const offset = {
      success: true,
      data: [{ id: 'n-1' }],
      items: [{ id: 'n-1' }],
      total: 30,
      unreadCount: 4,
      page: 1,
      limit: 20,
      totalPages: 2,
      hasNextPage: true,
      meta: {
        pagination: {
          strategy: 'offset',
          page: 1,
          pageSize: 20,
          totalItems: 30,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
    };
    expect(parseOffsetCollection(offset).pagination.totalPages).toBe(2);

    const cursor = {
      success: true,
      data: [{ id: 'n-9' }],
      total: 30,
      unreadCount: 4,
      hasNextPage: true,
      meta: {
        pagination: {
          strategy: 'cursor',
          nextCursor: 'opaque',
          previousCursor: null,
          hasNextPage: true,
          pageSize: 20,
        },
      },
    };
    const parsed = parseCursorCollection(cursor);
    expect(parsed.nextCursor).toBe('opaque');
    expect(cursor).not.toHaveProperty('totalPages');
  });

  it('booking chat cursor page parses oldest→newest data', () => {
    const page = {
      success: true,
      data: [
        { id: 'm-1', content: 'hi' },
        { id: 'm-2', content: 'hello' },
      ],
      meta: {
        pagination: {
          strategy: 'cursor',
          nextCursor: null,
          previousCursor: null,
          hasNextPage: false,
          pageSize: 50,
        },
      },
    };
    const parsed = parseCursorCollection<{ id: string; content: string }>(page);
    expect(parsed.items.map((m) => m.id)).toEqual(['m-1', 'm-2']);
    expect(parsed.hasNextPage).toBe(false);
  });

  it('admin offset/limit payloads convert to canonical pages', () => {
    const legacy = {
      success: true,
      data: [{ id: 'u-1' }],
      total: 100,
      page: 3,
      limit: 20,
      totalPages: 5,
    };
    expect(parseOffsetCollection(legacy).pagination).toMatchObject({ page: 3, pageSize: 20 });
  });
});

describe('fieldErrorsOf → form mapping', () => {
  it('maps canonical details[] to { field: message } for RHF setError', () => {
    const payload = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload',
        details: [
          { field: 'phone', code: 'INVALID', message: 'Phone is invalid.' },
          { field: 'email', code: 'REQUIRED', message: 'Email is required.' },
        ],
      },
    };
    expect(fieldErrorsOf(payload)).toEqual({
      phone: 'Phone is invalid.',
      email: 'Email is required.',
    });
  });

  it('returns empty mapping for envelopes without details', () => {
    expect(
      fieldErrorsOf({ success: false, error: { code: 'NOT_FOUND', message: 'Gone' } }),
    ).toEqual({});
    expect(fieldErrorsOf({ success: true, data: 1 })).toEqual({});
  });
});

describe('normalizeApiError per code × locale', () => {
  const locales = ['bn', 'en'] as const;
  const cases: Array<[string, unknown, number | string]> = [
    ['expired session', { status: 401, data: {} }, 401],
    ['forbidden', { status: 403, data: {} }, 403],
    ['missing record', { status: 404, data: {} }, 404],
    ['conflict carries server message', { status: 409, data: { message: 'Exists already' } }, 409],
    [
      'validation reads canonical envelope',
      {
        status: 400,
        data: { success: false, error: { code: 'VALIDATION_ERROR', message: 'Bad input' } },
      },
      400,
    ],
    ['server error fallback', { status: 500, data: {} }, 500],
    [
      'network failure',
      { status: 'FETCH_ERROR', data: undefined, error: 'TypeError' },
      'FETCH_ERROR',
    ],
  ];

  it.each(locales)('locale %s localizes every code without casts', (locale) => {
    for (const [label, err, status] of cases) {
      const normalized = normalizeUnknownError(err, locale);
      expect(normalized.status, label).toBe(status);
      expect(normalized.message.length, label).toBeGreaterThan(0);
    }
    expect(normalizeUnknownError(undefined, locale).message.length).toBeGreaterThan(0);
  });

  it('bn and en messages differ for permission errors', () => {
    const bn = normalizeUnknownError({ status: 403, data: {} }, 'bn').message;
    const en = normalizeUnknownError({ status: 403, data: {} }, 'en').message;
    expect(bn).not.toBe(en);
  });
});
