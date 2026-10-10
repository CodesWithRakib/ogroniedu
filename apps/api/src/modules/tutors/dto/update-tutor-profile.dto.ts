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
  @IsOptional()
  @IsString()
  @MaxLength(160)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

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
