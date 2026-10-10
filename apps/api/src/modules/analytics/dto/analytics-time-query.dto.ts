import { IsOptional, IsDateString, IsIn, IsUUID } from 'class-validator';

export class AnalyticsTimeQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date string' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date string' })
  endDate?: string;

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
