import { z } from 'zod';

/**
 * Shared query/pagination contracts (Phase 23 P1-2 slice).
 * Zod schemas here are the cross-stack source of truth for param names,
 * defaults, and bounds. Backend class-validator DTOs must accept the same
 * shapes — see apps/api/test/contracts-parity.spec.ts.
 */

const num = (min: number, max: number, def: number) =>
  z
    .preprocess(
      (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
      z.number().int().min(min).max(max),
    )
    .optional()
    .default(def);

/** Canonical offset pagination: page + pageSize (preferred over legacy limit/offset). */
export const OffsetQuerySchema = z.object({
  page: num(1, 100000, 1),
  pageSize: num(1, 100, 20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
export type OffsetQuery = z.infer<typeof OffsetQuerySchema>;

/** Canonical cursor pagination for append-heavy feeds (chat, notifications). */
export const CursorQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: num(1, 100, 20),
  direction: z.enum(['next', 'prev']).optional().default('next'),
});
export type CursorQuery = z.infer<typeof CursorQuerySchema>;

/** Booking chat history query. Default 50 is a deliberate domain exception
 * (chat needs deeper windows); mirrors GetMessagesQueryDto. */
export const GetMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: num(1, 100, 50),
});
export type GetMessagesQuery = z.infer<typeof GetMessagesQuerySchema>;

/** Tutor discovery search. Cap 50 is a deliberate domain exception (tutor
 * cards); canonical `pageSize` preferred, legacy `limit` accepted.
 * Mirrors SearchTutorsQueryDto. */
export const SearchTutorsQuerySchema = z.object({
  q: z.string().optional(),
  subjectId: z.string().uuid().optional(),
  educationLevelId: z.string().uuid().optional(),
  curriculumId: z.string().uuid().optional(),
  mode: z.enum(['in_person', 'online', 'hybrid']).optional(),
  districtCode: z.string().optional(),
  upazilaCode: z.string().optional(),
  minPrice: z
    .preprocess(
      (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
      z.number().int().min(0),
    )
    .optional(),
  maxPrice: z
    .preprocess(
      (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
      z.number().int().min(0),
    )
    .optional(),
  sort: z
    .enum(['recommended', 'price_asc', 'price_desc', 'experience_desc'])
    .optional()
    .default('recommended'),
  page: num(1, 100000, 1),
  limit: num(1, 50, 10),
  pageSize: z
    .preprocess(
      (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
      z.number().int().min(1).max(50),
    )
    .optional(),
});
export type SearchTutorsQuery = z.infer<typeof SearchTutorsQuerySchema>;

/**
 * ISO-8601 date or datetime string (mirrors class-validator `IsDateString`,
 * which accepts both `2026-11-01` and full datetimes — stricter
 * `z.string().datetime()` would wrongly reject date-only input).
 */
export const IsoDateString = z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
  message: 'Expected an ISO-8601 date or datetime string',
});

/**
 * Resolve the effective tutor-search page size with the same precedence as
 * the backend (`pageSize` wins, then `limit`, then default). Single
 * precedence rule shared by API and web.
 */
export function resolveTutorSearchPageSize(query: { limit?: number; pageSize?: number }): number {
  const raw = query.pageSize ?? query.limit ?? 10;
  if (!Number.isFinite(raw)) return 10;
  return Math.min(50, Math.max(1, Math.floor(raw)));
}
