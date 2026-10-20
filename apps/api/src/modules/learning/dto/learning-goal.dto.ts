import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export type LearningGoalStatusValue =
  'open' | 'in_progress' | 'achieved' | 'not_achieved' | 'cancelled';

export class CreateLearningGoalDto {
  @IsUUID()
  bookingId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;
}

export class UpdateLearningGoalDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsDateString()
  targetDate?: string | null;

  @IsOptional()
  @IsIn(['open', 'in_progress', 'achieved', 'not_achieved', 'cancelled'])
  status?: LearningGoalStatusValue;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  evidence?: string;
}
