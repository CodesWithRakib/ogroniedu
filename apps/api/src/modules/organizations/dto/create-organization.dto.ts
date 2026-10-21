import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsEmail,
  IsOptional,
  IsIn,
  IsObject,
} from 'class-validator';
import { OrganizationTypes, type OrganizationType } from '@ogroniedu/contracts';

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lower-case alphanumeric with hyphens',
  })
  slug!: string;

  @IsOptional()
  @IsIn(OrganizationTypes)
  type?: OrganizationType;

  @IsEmail()
  contactEmail!: string;

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
