import {
  IsOptional,
  IsString,
  IsUUID,
  IsIn,
  IsInt,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Single precedence rule shared with web via @ogroniedu/contracts. */
export { resolveTutorSearchPageSize } from '@ogroniedu/contracts';

export type SearchSortOption =
  'recommended' | 'nearest' | 'price_asc' | 'price_desc' | 'experience_desc' | 'rating_desc';

/** Hard upper bound for a radius search (km). */
export const MAX_SEARCH_RADIUS_KM = 100;

export class SearchTutorsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  educationLevelId?: string;

  @IsOptional()
  @IsUUID()
  curriculumId?: string;

  @IsOptional()
  @IsIn(['in_person', 'online', 'hybrid'])
  mode?: 'in_person' | 'online' | 'hybrid';

  @IsOptional()
  @IsString()
  @MaxLength(40)
  districtCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  upazilaCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  minExperience?: number;

  /** 0 = Sunday … 6 = Saturday. Only active, date-effective slots match. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  availableWeekday?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(MAX_SEARCH_RADIUS_KM)
  radiusKm?: number;

  @IsOptional()
  @IsIn(['recommended', 'nearest', 'price_asc', 'price_desc', 'experience_desc', 'rating_desc'])
  sort?: SearchSortOption = 'recommended';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  /**
   * Canonical alias for `limit` (Phase 23 P1-1). When both are present,
   * `pageSize` wins. Domain cap stays 50 (tutor cards), unlike the global 100.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
