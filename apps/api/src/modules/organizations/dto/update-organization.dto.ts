import {
  IsString,
  MinLength,
  MaxLength,
  IsEmail,
  IsOptional,
  IsIn,
  IsObject,
  Matches,
} from 'class-validator';
import { OrganizationTypes, type OrganizationType } from '@ogroniedu/contracts';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(OrganizationTypes)
  type?: OrganizationType;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Contact phone must be a valid E.164 number' })
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tradeLicenseNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  division?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  district?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
