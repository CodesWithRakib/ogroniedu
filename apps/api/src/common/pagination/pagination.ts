import { BadRequestException } from '@nestjs/common';
import { buildOffsetMeta } from '../api-response/api-response';

/** Throw a typed 400 when a client requests a non-whitelisted sort field. Never interpolate raw sort into SQL. */
export function assertSortAllowed(sortBy: string | undefined, allowed: readonly string[]): void {
  if (sortBy === undefined || sortBy === '') return;
  if (!allowed.includes(sortBy)) {
    throw new BadRequestException({
      message: `Sorting by '${sortBy}' is not allowed for this resource.`,
      code: 'SORT_NOT_ALLOWED',
    });
  }
}

export interface SlicePage<T> {
  items: T[];
  totalItems: number;
}

/** Slice an already-filtered array into an offset page. Filters must be applied before calling. */
export function paginateArray<T>(all: T[], page: number, pageSize: number): SlicePage<T> & {
  meta: ReturnType<typeof buildOffsetMeta>;
} {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeSize = Math.max(1, Math.floor(pageSize) || 20);
  const totalItems = all.length;
  const meta = buildOffsetMeta({ page: safePage, pageSize: safeSize, totalItems });
  const items = all.slice((safePage - 1) * safeSize, safePage * safeSize);
  return { items, totalItems, meta };
}

export interface CursorPayload {
  /** ISO timestamp of the edge record (stable ordering component). */
  t: string;
  /** Unique tie-breaker id of the edge record. */
  id: string;
}

/** Encode an opaque cursor token. Never expose raw DB values to clients. */
export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/** Decode + validate a client-supplied cursor. Throws INVALID_CURSOR (400) on any malformation. */
export function decodeCursor(cursor: string | undefined): CursorPayload | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as Partial<CursorPayload>;
    if (
      typeof parsed.t !== 'string' ||
      typeof parsed.id !== 'string' ||
      Number.isNaN(Date.parse(parsed.t)) ||
      parsed.id.length === 0 ||
      parsed.id.length > 128
    ) {
      throw new Error('malformed cursor');
    }
    return { t: parsed.t, id: parsed.id };
  } catch {
    throw new BadRequestException({
      message: 'The pagination cursor is invalid or expired. Restart from the first page.',
      code: 'INVALID_CURSOR',
    });
  }
}
