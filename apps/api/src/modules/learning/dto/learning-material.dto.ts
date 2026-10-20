import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** JSON base64 upload (same contract shape as the existing evidence upload). */
export class UploadLearningMaterialDto {
  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsUUID()
  lessonPlanId?: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalFilename!: string;

  @IsString()
  @IsNotEmpty()
  mediaType!: string;

  @IsNumber()
  @Min(1)
  sizeBytes!: number;

  @IsString()
  @IsNotEmpty()
  contentBase64!: string;

  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;
}

export class CreateLinkMaterialDto {
  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsUUID()
  lessonPlanId?: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2000)
  externalUrl!: string;

  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;
}

export class UpdateLearningMaterialDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

export class AttachMaterialQueryDto {
  @IsOptional()
  @IsIn(['file', 'link'])
  kind?: 'file' | 'link';
}
