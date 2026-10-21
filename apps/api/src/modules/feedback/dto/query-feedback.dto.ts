import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  FeedbackCategories,
  FeedbackSeverities,
  FeedbackStatuses,
  type FeedbackCategory,
  type FeedbackSeverity,
  type FeedbackStatus,
} from '@ogroniedu/contracts';

export class QueryFeedbackDto {
  @IsOptional()
  @IsEnum(FeedbackCategories)
  category?: FeedbackCategory;

  @IsOptional()
  @IsEnum(FeedbackSeverities)
  severity?: FeedbackSeverity;

  @IsOptional()
  @IsEnum(FeedbackStatuses)
  status?: FeedbackStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
