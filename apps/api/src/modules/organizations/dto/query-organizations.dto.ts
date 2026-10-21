import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import {
  OrganizationTypes,
  OrganizationStatuses,
  type OrganizationType,
  type OrganizationStatus,
} from '@ogroniedu/contracts';

export class QueryOrganizationsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(OrganizationTypes)
  type?: OrganizationType;

  @IsOptional()
  @IsIn(OrganizationStatuses)
  status?: OrganizationStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}
