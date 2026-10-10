import { IsString, IsNotEmpty, IsIn, IsInt, Min, Max, IsOptional } from 'class-validator';

export class UploadEvidenceFileDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['nid', 'academic_certificate', 'degree', 'other_evidence'])
  purpose!: string;

  @IsNotEmpty()
  @IsString()
  originalFilename!: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
  mediaType!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(10485760, { message: 'File size cannot exceed 10MB (10,485,760 bytes)' })
  sizeBytes!: number;

  @IsOptional()
  @IsString()
  contentBase64?: string;
}
