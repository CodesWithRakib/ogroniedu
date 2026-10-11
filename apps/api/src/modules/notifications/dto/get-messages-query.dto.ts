import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Cursor pagination query for booking chat history (append-heavy feed).
 * No cursor → latest `pageSize` messages. With cursor → messages strictly
 * older than the cursor edge. Ordering is always (created_at DESC, id DESC)
 * internally; `data` is returned oldest→newest for display compat.
 */
export class GetMessagesQueryDto {
  @ApiPropertyOptional({
    description:
      'Opaque cursor for backward chat history (edge of the oldest message on the previous page)',
    example: 'eyJ0IjoiMjAyNi0wMS0wMVQwMDowMDowMC4wMDBaIiwiaWQiOiJ1dWlkIn0',
  })
  @IsOptional()
  @IsString({ message: 'cursor must be an opaque string' })
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Page size for chat history (1-100, default: 50)',
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize must be an integer' })
  @Min(1, { message: 'pageSize must be at least 1' })
  @Max(100, { message: 'pageSize cannot exceed 100' })
  pageSize?: number = 50;
}
