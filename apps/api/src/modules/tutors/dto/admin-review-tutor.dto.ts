import { IsString, IsNotEmpty, IsIn, IsOptional, IsNumber, IsArray } from 'class-validator';
import { ReviewDecision } from '../entities/tutor-verification-review.entity';

export class AdminReviewTutorDto {
  @IsNotEmpty()
  @IsIn(['approved', 'rejected', 'needs_information', 'suspended', 'reinstated'])
  decision!: ReviewDecision;

  @IsNotEmpty()
  @IsString()
  reasonCode!: string;

  /** Reviewer-only notes. Never serialized to the applicant. */
  @IsOptional()
  @IsString()
  internalNotes?: string;

  /**
   * Applicant-facing text. Required by policy for reject / needs-information /
   * suspend decisions on a level; optional on this legacy profile-level route.
   */
  @IsOptional()
  @IsString()
  applicantFeedback?: string;

  @IsOptional()
  @IsString()
  policyVersion?: string;
}

export class AdminVerifyQualificationDto {
  @IsNotEmpty()
  @IsIn(['approved', 'rejected'])
  reviewStatus!: 'approved' | 'rejected';
}

export class AdminUpdateTutorProfileDto {
  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsIn(['male', 'female'], { message: 'Gender must be either male or female' })
  gender?: 'male' | 'female';

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsNumber()
  hourlyRateMinor?: number;

  @IsOptional()
  @IsNumber()
  yearsExperience?: number;

  @IsOptional()
  @IsIn(['draft', 'pending_approval', 'approved', 'rejected', 'suspended'])
  verificationStatus?: string;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived', 'hidden'])
  publicationStatus?: string;

  @IsOptional()
  @IsArray()
  preferredAreas?: string[];

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  phoneE164?: string;

  @IsOptional()
  @IsIn(['active', 'suspended', 'banned'])
  userStatus?: string;
}
