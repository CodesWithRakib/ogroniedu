import { IsOptional, IsDateString, IsIn, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyticsTimeQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date string' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date string' })
  endDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'from must be a valid ISO 8601 date string' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'to must be a valid ISO 8601 date string' })
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'days must be an integer' })
  @Min(1, { message: 'days must be at least 1' })
  @Max(365, { message: 'days cannot exceed 365' })
  days?: number;

  @IsOptional()
  @IsIn(['day', 'week', 'month'], { message: 'granularity must be one of: day, week, month' })
  granularity?: 'day' | 'week' | 'month' = 'day';

  @IsOptional()
  @IsUUID('4')
  tutorId?: string;

  @IsOptional()
  @IsUUID('4')
  subjectId?: string;
}
