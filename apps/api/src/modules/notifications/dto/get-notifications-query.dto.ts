import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetNotificationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter only unread notifications (default: false)',
    default: false,
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === 1 || value === '1') return true;
    if (value === 'false' || value === false || value === 0 || value === '0') return false;
    return value;
  })
  @IsBoolean({ message: 'unreadOnly must be a boolean value' })
  unreadOnly: boolean = false;

  @ApiPropertyOptional({
    description: 'Pagination limit (1-100, default: 20). DEPRECATED: prefer pageSize (canonical).',
    default: 20,
    example: 20,
    deprecated: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Pagination page number (minimum: 1, default: 1)',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page: number = 1;

  @ApiPropertyOptional({
    description: 'User language locale for template rendering',
    enum: ['bn', 'en'],
    default: 'bn',
    example: 'bn',
  })
  @IsOptional()
  @IsIn(['bn', 'en'], { message: 'locale must be either bn or en' })
  locale: 'bn' | 'en' = 'bn';

  @ApiPropertyOptional({
    description:
      'Opaque cursor for cursor pagination (edge of the oldest notification on the previous page). When present, cursor mode is used and page/limit/totalPages are omitted.',
  })
  @IsOptional()
  @IsString({ message: 'cursor must be an opaque string' })
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Cursor page size (1-100, default: 20). Only applies in cursor mode.',
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize must be an integer' })
  @Min(1, { message: 'pageSize must be at least 1' })
  @Max(100, { message: 'pageSize cannot exceed 100' })
  pageSize?: number = 20;
}

/**
 * Resolve the effective offset-mode page size: canonical `pageSize`
 * preferred, legacy `limit` fallback (Phase 23 P1-1). Cursor mode reads
 * `pageSize` directly.
 */
export function resolveNotificationsOffsetLimit(query: {
  limit?: number;
  pageSize?: number;
}): number {
  const raw = query.pageSize ?? query.limit ?? 20;
  if (!Number.isFinite(raw)) return 20;
  return Math.min(100, Math.max(1, Math.floor(raw)));
}
