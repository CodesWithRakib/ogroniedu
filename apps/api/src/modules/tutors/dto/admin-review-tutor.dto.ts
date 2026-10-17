import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
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
