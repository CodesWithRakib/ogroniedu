import { describe, it, expect } from 'vitest';
import {
  parseItem,
  parseOffsetCollection,
  parseCursorCollection,
  fieldErrorsOf,
  requestIdOf,
  throwIfError,
} from '../src/lib/api/parse';
import { toQueryString } from '../src/lib/api/query';
import { normalizeApiError, normalizeUnknownError } from '../src/lib/api-error';
import { formatDate, formatDateTime, formatGroupedNumber, formatBDTMinor } from '../src/lib/format';
import { navForRole } from '../src/lib/navigation';
import {
  BRAND,
  BRAND_USAGE_RULES,
  SEMANTIC_COLORS,
  contrastRatio,
  relativeLuminance,
} from '../src/lib/theme/brand';
import {
  mapAdminUsers,
  mapAdminBookings,
  mapAuditLogs,
} from '../src/features/admin/utils/admin-mappers';

describe('API contract parsing (Phase 22)', () => {
  it('parses canonical offset collections via meta.pagination', () => {
    const res = parseOffsetCollection({
      success: true,
      data: [{ id: 'a' }],
      meta: {
        requestId: 'req-1',
        pagination: {
          strategy: 'offset',
          page: 2,
          pageSize: 20,
          totalItems: 45,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      },
    });
    expect(res.items).toHaveLength(1);
    expect(res.pagination.totalItems).toBe(45);
    expect(res.requestId).toBe('req-1');
  });

  it('falls back to legacy top-level total/page/limit fields', () => {
    const res = parseOffsetCollection({
      success: true,
      data: [{ id: 'a' }, { id: 'b' }],
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    expect(res.pagination.totalItems).toBe(2);
    expect(res.pagination.hasNextPage).toBe(false);
  });

  it('throws on error envelopes instead of returning data', () => {
    expect(() =>
      parseItem({ success: false, error: { code: 'NOT_FOUND', message: 'Missing.' } }),
    ).toThrow('Missing.');
  });

  it('parses cursor collections and rejects offset payloads', () => {
    const cursor = parseCursorCollection({
      success: true,
      data: [{ id: 'm1' }],
      meta: {
        pagination: {
          strategy: 'cursor',
          nextCursor: 'tok',
          previousCursor: null,
          hasNextPage: true,
          pageSize: 20,
        },
      },
    });
    expect(cursor.nextCursor).toBe('tok');
    expect(() => parseCursorCollection({ success: true, data: [] })).toThrow();
  });

  it('maps error details[] to field errors', () => {
    expect(
      fieldErrorsOf({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bad.',
          details: [{ field: 'email', code: 'X', message: 'Invalid.' }],
        },
      }),
    ).toEqual({ email: 'Invalid.' });
  });

  it('requestIdOf reads canonical meta first, legacy second', () => {
    expect(requestIdOf({ meta: { requestId: 'a' } })).toBe('a');
    expect(requestIdOf({ requestId: 'b' })).toBe('b');
    expect(requestIdOf({})).toBeUndefined();
  });

  it('throwIfError ignores success payloads', () => {
    expect(() => throwIfError({ success: true, data: 1 })).not.toThrow();
  });

  it('toQueryString skips empty/undefined values', () => {
    expect(toQueryString({ q: 'math', page: 2, empty: '', missing: undefined, flag: false })).toBe(
      '?q=math&page=2&flag=false',
    );
  });
});

describe('Brand configuration (light theme only)', () => {
  it('preserves the exact product-owner approved brand hex values', () => {
    expect(BRAND.oceanTeal.primaryColor).toBe('#0df5c4');
    expect(BRAND.oceanTeal.accentColor).toBe('#00e1b2');
    expect(BRAND.sapphireBlue.primaryColor).toBe('#2563eb');
    expect(BRAND.sapphireBlue.accentColor).toBe('#3b82f6');
  });

  it('derives accessible semantic shades instead of changing the approved hexes', () => {
    // Bright mint is a fill token, never text on white.
    expect(SEMANTIC_COLORS.brand).toBe('#0df5c4');
    expect(SEMANTIC_COLORS.brandAccent).toBe('#00e1b2');
    expect(contrastRatio(SEMANTIC_COLORS.brand, '#ffffff')).toBeLessThan(3);
    // Ink on a mint fill stays readable.
    expect(contrastRatio(SEMANTIC_COLORS.brandForeground, SEMANTIC_COLORS.brand)).toBeGreaterThanOrEqual(4.5);
    // Derived action/interactive/status colours clear WCAG AA on white.
    expect(contrastRatio(SEMANTIC_COLORS.primary, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(SEMANTIC_COLORS.interactive, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(SEMANTIC_COLORS.interactiveHover, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(SEMANTIC_COLORS.success, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(SEMANTIC_COLORS.warning, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(SEMANTIC_COLORS.info, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(SEMANTIC_COLORS.destructive, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    // Body text on the light canvas.
    expect(contrastRatio(SEMANTIC_COLORS.foreground, SEMANTIC_COLORS.background)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(SEMANTIC_COLORS.mutedForeground, SEMANTIC_COLORS.card)).toBeGreaterThanOrEqual(4.5);
  });

  it('computes WCAG relative luminance and contrast ratios correctly', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('documents the light-theme-only brand rules', () => {
    expect(BRAND_USAGE_RULES.length).toBeGreaterThanOrEqual(4);
    expect(BRAND_USAGE_RULES.join(' ')).toMatch(/no dark mode/i);
  });
});

describe('Phase 23 error + format regressions', () => {
  it('normalizeApiError reads canonical error.message and first detail', () => {
    const canonical = {
      status: 400,
      data: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid payload submitted',
          details: [{ field: 'phone', code: 'INVALID', message: 'Phone is invalid.' }],
        },
      },
    } as never;
    expect(normalizeApiError(canonical, 'en').message).toBe('Invalid payload submitted');
    const detailsOnly = {
      status: 400,
      data: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '',
          details: [{ field: 'phone', code: 'INVALID', message: 'Phone is invalid.' }],
        },
      },
    } as never;
    expect(normalizeApiError(detailsOnly, 'en').message).toBe('Phone is invalid.');
  });

  it('normalizeUnknownError accepts unknown without casts', () => {
    const err: unknown = { status: 404, data: { message: 'gone' } };
    expect(normalizeUnknownError(err, 'en').message).toContain('not found');
  });

  it('central formatters handle null/invalid safely', () => {
    expect(formatDate(null, 'en')).toBe('—');
    expect(formatDate('not-a-date', 'en')).toBe('—');
    expect(formatDateTime(undefined, 'bn')).toBe('—');
    expect(formatBDTMinor(null, 'en')).toBe('—');
    expect(formatGroupedNumber(NaN, 'en')).toBe('—');
    expect(formatBDTMinor('150000', 'en')).toContain('1,500');
  });

  it('navForRole is centralized and covers all roles', () => {
    for (const role of ['student', 'guardian', 'tutor', 'admin', 'super_admin'] as const) {
      const items = navForRole(role);
      expect(items.length).toBeGreaterThan(3);
      expect(items[0]).toHaveProperty('href');
    }
    expect(navForRole(null).length).toBeGreaterThan(0);
  });
});

describe('Admin mappers', () => {
  it('maps untyped rows with safe defaults', () => {
    const users = mapAdminUsers([{ id: 'u1', email: 'a@x.com' }]);
    expect(users[0].displayName).toBe('a@x.com');
    expect(users[0].status).toBe('active');
    const bookings = mapAdminBookings([{ id: 'b1', mode: 'weird' }]);
    expect(bookings[0].mode).toBe('online');
    expect(bookings[0].priceBdt).toBe(0);
    const logs = mapAuditLogs([{ id: 'l1', action: 'x' }]);
    expect(logs[0].actorUserId).toBeNull();
  });
});
