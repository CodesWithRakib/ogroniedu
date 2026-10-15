import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';
import { normalizeApiError as baseNormalize, type NormalizedApiError } from '@/lib/api-error';
import type {
  OffsetCollectionEnvelope,
  CursorCollectionEnvelope,
  ParsedOffsetCollection,
  ParsedCursorCollection,
  OffsetPaginationMeta,
  SuccessEnvelope,
} from './contract';

export type { NormalizedApiError };
export { baseNormalize as normalizeApiError };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Extract requestId from either canonical meta or legacy top-level fields. */
export function requestIdOf(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  const meta = payload.meta;
  if (isRecord(meta) && typeof meta.requestId === 'string') return meta.requestId;
  if (typeof payload.requestId === 'string') return payload.requestId;
  return undefined;
}

/**
 * Throw a normalized, locale-agnostic Error when a response envelope signals failure.
 * Handles canonical {success:false,error:{...}} and legacy {statusCode,message} shapes.
 */
export function throwIfError(payload: unknown, fallback = 'Request failed.'): void {
  if (!isRecord(payload)) return;
  if (payload.success === false) {
    const err = payload.error;
    const message =
      (isRecord(err) && typeof err.message === 'string' && err.message) ||
      (typeof payload.message === 'string' && payload.message) ||
      fallback;
    throw new Error(message);
  }
}

/** Parse a single-resource envelope; throws on error envelope. */
export function parseItem<T>(payload: SuccessEnvelope<T> | unknown): T {
  throwIfError(payload);
  if (isRecord(payload) && 'data' in payload) return payload.data as T;
  return payload as T;
}

/**
 * Parse an offset collection. Reads canonical meta.pagination first,
 * falls back to legacy top-level total/page/limit/totalPages.
 * Never assume cursor responses carry totals — use parseCursorCollection for those.
 */
export function parseOffsetCollection<T>(
  payload: OffsetCollectionEnvelope<T> | unknown,
): ParsedOffsetCollection<T> {
  throwIfError(payload, 'Failed to load list.');
  if (!isRecord(payload)) return emptyOffset<T>([], undefined);
  const data = Array.isArray(payload.data) ? (payload.data as T[]) : [];
  const requestId = requestIdOf(payload);
  const message = typeof payload.message === 'string' ? payload.message : undefined;
  const meta = isRecord(payload.meta) ? payload.meta : undefined;
  const pagination = meta?.pagination as Partial<OffsetPaginationMeta> | undefined;
  if (pagination?.strategy === 'offset' || typeof pagination?.totalItems === 'number') {
    const page = num(pagination.page, num(payload.page, 1));
    const pageSize = num(pagination.pageSize, num(payload.limit, 20));
    const totalItems = num(pagination.totalItems, num(payload.total, data.length));
    const totalPages = num(
      pagination.totalPages,
      Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize))),
    );
    return {
      items: data,
      pagination: {
        strategy: 'offset',
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage:
          typeof pagination.hasNextPage === 'boolean' ? pagination.hasNextPage : page < totalPages,
        hasPreviousPage:
          typeof pagination.hasPreviousPage === 'boolean' ? pagination.hasPreviousPage : page > 1,
      },
      message,
      requestId,
    };
  }
  // Legacy shape without any meta: derive totals from top-level fields.
  const totalItems = num(payload.total, data.length);
  const page = num(payload.page, 1);
  const pageSize = num(payload.limit, data.length || 20);
  const totalPages = num(
    payload.totalPages,
    Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize))),
  );
  return {
    items: data,
    pagination: {
      strategy: 'offset',
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    message,
    requestId,
  };
}

/** Parse a cursor collection; throws if the payload is not a cursor page. */
export function parseCursorCollection<T>(
  payload: CursorCollectionEnvelope<T> | unknown,
): ParsedCursorCollection<T> {
  throwIfError(payload, 'Failed to load list.');
  if (!isRecord(payload)) {
    return { items: [], nextCursor: null, previousCursor: null, hasNextPage: false, pageSize: 0 };
  }
  const data = Array.isArray(payload.data) ? (payload.data as T[]) : [];
  const requestId = requestIdOf(payload);
  const message = typeof payload.message === 'string' ? payload.message : undefined;
  const meta = isRecord(payload.meta) ? payload.meta : undefined;
  const pagination = meta?.pagination as
    | {
        strategy?: string;
        nextCursor?: string | null;
        previousCursor?: string | null;
        hasNextPage?: boolean;
        pageSize?: number;
      }
    | undefined;
  if (pagination && (pagination.strategy === 'cursor' || 'nextCursor' in (pagination ?? {}))) {
    return {
      items: data,
      nextCursor: pagination.nextCursor ?? null,
      previousCursor: pagination.previousCursor ?? null,
      hasNextPage: pagination.hasNextPage === true,
      pageSize: num(pagination.pageSize, 20),
      message,
      requestId,
    };
  }
  throw new Error('Expected a cursor-paginated response for this resource.');
}

/** Map canonical error details[] to RHF/Zod field errors: { fieldName: message }. */
export function fieldErrorsOf(payload: unknown): Record<string, string> {
  if (!isRecord(payload) || !isRecord(payload.error)) return {};
  const details = payload.error.details;
  if (!Array.isArray(details)) return {};
  const out: Record<string, string> = {};
  for (const d of details) {
    if (isRecord(d) && typeof d.field === 'string' && typeof d.message === 'string') {
      out[d.field] = d.message;
    }
  }
  return out;
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function emptyOffset<T>(items: T[], requestId: string | undefined): ParsedOffsetCollection<T> {
  return {
    items,
    pagination: {
      strategy: 'offset',
      page: 1,
      pageSize: items.length || 20,
      totalItems: items.length,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    requestId,
  };
}

/** Locale-aware error normalization that also understands the canonical envelope. */
export function normalizeEnvelopeError(
  error: FetchBaseQueryError | SerializedError | undefined,
  locale: 'bn' | 'en' = 'bn',
): NormalizedApiError {
  return baseNormalize(error, locale);
}
