/**
 * Canonical API success envelope (see docs/architecture/api-contract-standard.md).
 * Item: { success:true, data, message?, meta:{requestId} }
 * Offset collection adds meta.pagination {strategy:'offset',...}.
 * Cursor collection adds meta.pagination {strategy:'cursor',...}.
 */

export interface RequestMeta {
  requestId?: string;
  timestamp?: string;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

export interface OffsetPaginationMeta {
  strategy: 'offset';
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CursorPaginationMeta {
  strategy: 'cursor';
  nextCursor: string | null;
  previousCursor: string | null;
  hasNextPage: boolean;
  pageSize: number;
}

export type CollectionPaginationMeta = OffsetPaginationMeta | CursorPaginationMeta;

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  message?: string;
  meta: RequestMeta;
}

export interface OffsetCollectionEnvelope<T> {
  success: true;
  data: T[];
  message?: string;
  meta: RequestMeta & { pagination: OffsetPaginationMeta };
  /** @deprecated Legacy compat — read meta.pagination instead. Removed after frontend cutover. */
  total?: number;
  /** @deprecated Legacy compat. */
  page?: number;
  /** @deprecated Legacy compat. */
  limit?: number;
  /** @deprecated Legacy compat. */
  totalPages?: number;
}

export interface CursorCollectionEnvelope<T> {
  success: true;
  data: T[];
  message?: string;
  meta: RequestMeta & { pagination: CursorPaginationMeta };
}

export function buildOffsetMeta(args: {
  page: number;
  pageSize: number;
  totalItems: number;
}): OffsetPaginationMeta {
  const page = Math.max(1, Math.floor(args.page) || 1);
  const pageSize = Math.max(1, Math.floor(args.pageSize) || 20);
  const totalItems = Math.max(0, args.totalItems);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return {
    strategy: 'offset',
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/** Single-resource success envelope. Controllers should prefer this over hand-built objects. */
export function ok<T>(data: T, message?: string): Omit<SuccessEnvelope<T>, 'meta'> {
  return message === undefined ? { success: true, data } : { success: true, data, message };
}

/** Offset collection envelope with both canonical meta and legacy top-level fields (compat). */
export function paginated<T>(
  data: T[],
  args: { page: number; pageSize: number; totalItems: number },
  message?: string,
): OffsetCollectionEnvelope<T> {
  const pagination = buildOffsetMeta(args);
  const envelope: OffsetCollectionEnvelope<T> = {
    success: true,
    data,
    meta: { pagination },
    total: pagination.totalItems,
    page: pagination.page,
    limit: pagination.pageSize,
    totalPages: pagination.totalPages,
  };
  if (message !== undefined) envelope.message = message;
  return envelope;
}

/** Cursor collection envelope. Cursors must be opaque tokens from pagination helpers. */
export function cursorPaginated<T>(
  data: T[],
  args: {
    nextCursor: string | null;
    previousCursor?: string | null;
    hasNextPage: boolean;
    pageSize: number;
  },
  message?: string,
): CursorCollectionEnvelope<T> {
  const envelope: CursorCollectionEnvelope<T> = {
    success: true,
    data,
    meta: {
      pagination: {
        strategy: 'cursor',
        nextCursor: args.nextCursor,
        previousCursor: args.previousCursor ?? null,
        hasNextPage: args.hasNextPage,
        pageSize: args.pageSize,
      },
    },
  };
  if (message !== undefined) envelope.message = message;
  return envelope;
}
