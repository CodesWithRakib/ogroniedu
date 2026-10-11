/**
 * Canonical frontend API contract (mirrors docs/architecture/api-contract-standard.md
 * and apps/api/src/common/api-response + api-error).
 * All feature APIs must type responses with these envelopes and parse via lib/api/parse.
 */

export interface RequestMeta {
  requestId?: string;
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

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  message?: string;
  meta?: RequestMeta;
}

export interface OffsetCollectionEnvelope<T> {
  success: true;
  data: T[];
  message?: string;
  meta?: RequestMeta & { pagination?: OffsetPaginationMeta };
  /** @deprecated Legacy compat — prefer meta.pagination. */
  total?: number;
  /** @deprecated */
  page?: number;
  /** @deprecated */
  limit?: number;
  /** @deprecated */
  totalPages?: number;
}

export interface CursorCollectionEnvelope<T> {
  success: true;
  data: T[];
  message?: string;
  meta?: RequestMeta & { pagination?: CursorPaginationMeta };
}

export interface ApiErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
  meta?: RequestMeta;
}

export type ApiResponse<T> = SuccessEnvelope<T> | ErrorEnvelope;
export type ApiCollectionResponse<T> = OffsetCollectionEnvelope<T> | ErrorEnvelope;

export interface ParsedOffsetCollection<T> {
  items: T[];
  pagination: OffsetPaginationMeta;
  message?: string;
  requestId?: string;
}

export interface ParsedCursorCollection<T> {
  items: T[];
  nextCursor: string | null;
  previousCursor: string | null;
  hasNextPage: boolean;
  pageSize: number;
  message?: string;
  requestId?: string;
}
