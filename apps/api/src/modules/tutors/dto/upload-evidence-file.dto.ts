import { IsString, IsNotEmpty, IsIn, IsInt, Min, Max, IsOptional } from 'class-validator';
import { VERIFICATION_EVIDENCE_PURPOSE } from '../constants/verification-policy.constants';

/**
 * Purposes accepted by the evidence upload endpoint. `tutor_verification_evidence`
 * is the Phase-02 dossier purpose; the legacy values are kept so existing
 * qualification uploads keep working.
 */
export const ALLOWED_EVIDENCE_PURPOSES: readonly string[] = [
  VERIFICATION_EVIDENCE_PURPOSE,
  'nid',
  'academic_certificate',
  'degree',
  'other_evidence',
];

export class UploadEvidenceFileDto {
  @IsNotEmpty()
  @IsString()
  @IsIn([...ALLOWED_EVIDENCE_PURPOSES])
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
