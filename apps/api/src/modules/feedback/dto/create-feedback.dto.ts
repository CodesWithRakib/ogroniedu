import { IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { FeedbackCategories, type FeedbackCategory } from '@ogroniedu/contracts';

export class CreateFeedbackDto {
  @IsEnum(FeedbackCategories, {
    message:
      'category must be one of: bug, usability, feature_request, performance, accessibility, other',
  })
  category!: FeedbackCategory;

  @IsString()
  @MinLength(3, { message: 'title must be at least 3 characters' })
  @MaxLength(200, { message: 'title must not exceed 200 characters' })
  title!: string;

  @IsString()
  @MinLength(10, { message: 'description must be at least 10 characters' })
  @MaxLength(5000, { message: 'description must not exceed 5000 characters' })
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  reproductionSteps?: string;

  @IsOptional()
  @IsObject()
  diagnosticMetadata?: Record<string, unknown>;
}
