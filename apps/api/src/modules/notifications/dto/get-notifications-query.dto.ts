import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

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
    description: 'Pagination limit (1-100, default: 20)',
    default: 20,
    example: 20,
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
}
