import { IsOptional, IsString, IsUUID, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export type SearchSortOption = 'recommended' | 'price_asc' | 'price_desc' | 'experience_desc';

export class SearchTutorsQueryDto {
  @IsOptional()
  @IsString()
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
  districtCode?: string;

  @IsOptional()
  @IsString()
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
  @IsIn(['recommended', 'price_asc', 'price_desc', 'experience_desc'])
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
}
