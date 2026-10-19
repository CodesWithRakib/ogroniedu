import {
  IsString,
  IsOptional,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayNotEmpty,
  IsIn,
} from 'class-validator';
import { TeachingMode } from '../entities/tutor-profile.entity';

export class UpdateTutorProfileDto {
  /**
   * Legacy single-language headline. Treated as the English value so older
   * clients keep working; new clients should send `headlineEn`/`headlineBn`.
   */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  headline?: string;

  /** Legacy single-language biography. Treated as the English value. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  headlineEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  headlineBn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bioEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bioBn?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  yearsExperience?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['in_person', 'online', 'hybrid'], { each: true })
  teachingModes?: TeachingMode[];

  @IsOptional()
  @IsInt()
  @Min(0)
  hourlyRateMinor?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
