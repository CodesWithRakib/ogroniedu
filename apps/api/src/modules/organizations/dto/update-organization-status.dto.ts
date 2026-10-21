import { IsIn, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { OrganizationStatuses, type OrganizationStatus } from '@ogroniedu/contracts';

export class UpdateOrganizationStatusDto {
  @IsIn(OrganizationStatuses)
  status!: OrganizationStatus;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}
