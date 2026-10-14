import { IsOptional, IsInt, Min, Max, IsIn, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Shared offset pagination + search/sort query. Extend per-resource for domain filters. */
export class OffsetPaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number = DEFAULT_PAGE_SIZE;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/** Shared cursor pagination query for append-heavy feeds (chat, notifications, audit). */
export class CursorPaginationQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number = DEFAULT_PAGE_SIZE;

  @IsOptional()
  @IsIn(['next', 'prev'])
  direction?: 'next' | 'prev' = 'next';
}

/** Legacy limit/offset query (admin tables). Prefer OffsetPaginationQueryDto for new endpoints. */
export class LimitOffsetQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number = DEFAULT_PAGE_SIZE;
}

export function toPageSize(pageSize: number | undefined, max = MAX_PAGE_SIZE): number {
  if (!pageSize || !Number.isFinite(pageSize)) return DEFAULT_PAGE_SIZE;
  return Math.min(max, Math.max(1, Math.floor(pageSize)));
}

/**
 * Convert legacy offset/limit params to canonical page/pageSize.
 * Single home for the `Math.floor(offset/limit)+1` math previously
 * copy-pasted across admin controllers. Phase 23 P1-1.
 */
export function fromOffsetLimit(arg: { offset?: number; limit?: number }): {
  page: number;
  pageSize: number;
} {
  const pageSize = arg.limit && arg.limit > 0 ? Math.floor(arg.limit) : DEFAULT_PAGE_SIZE;
  const offset = arg.offset && arg.offset > 0 ? Math.floor(arg.offset) : 0;
  return { page: Math.floor(offset / pageSize) + 1, pageSize };
}
