import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsUUID, IsIn } from 'class-validator';

export class AddTutorQualificationDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['nid', 'academic_certificate', 'degree', 'experience'])
  qualificationType!: string;

  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  issuedYear?: number;

  @IsOptional()
  @IsString()
  expiresOn?: string;

  @IsOptional()
  @IsUUID()
  evidenceAssetId?: string;
}
