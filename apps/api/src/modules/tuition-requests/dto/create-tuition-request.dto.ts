import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsUUID,
  IsArray,
  IsInt,
  Min,
  Max,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import type { TuitionLearningMode } from '../entities/tuition-request.entity';

export class CreateTuitionRequestDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  studentName!: string;

  @IsOptional()
  @IsIn(['male', 'female', 'any'])
  studentGender?: 'male' | 'female' | 'any';

  @IsOptional()
  @IsUUID()
  studentUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  institutionName?: string;

  @IsOptional()
  @IsUUID()
  curriculumId?: string;

  @IsOptional()
  @IsUUID()
  educationLevelId?: string;

  @IsOptional()
  @IsUUID()
  streamId?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  subjectIds!: string[];

  @IsNotEmpty()
  @IsIn(['in_person', 'online', 'hybrid'])
  learningMode!: TuitionLearningMode;

  @IsOptional()
  @IsString()
  division?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  addressDetails?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredDays?: string[];

  @IsOptional()
  @IsString()
  preferredTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  salaryBudgetMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  salaryBudgetMax?: number;

  @IsOptional()
  @IsIn(['monthly', 'per_session'])
  salaryType?: 'monthly' | 'per_session';

  @IsOptional()
  @IsIn(['male', 'female', 'any'])
  preferredTutorGender?: 'male' | 'female' | 'any';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  preferredTutorBackground?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  requirementsNotes?: string;

  @IsOptional()
  @IsBoolean()
  isVip?: boolean;
}
