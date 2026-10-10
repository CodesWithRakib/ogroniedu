import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ReviewDecision } from '../entities/tutor-verification-review.entity';

export class AdminReviewTutorDto {
  @IsNotEmpty()
  @IsIn(['approved', 'rejected', 'needs_information', 'suspended', 'reinstated'])
  decision!: ReviewDecision;

  @IsNotEmpty()
  @IsString()
  reasonCode!: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  policyVersion?: string;
}

export class AdminVerifyQualificationDto {
  @IsNotEmpty()
  @IsIn(['approved', 'rejected'])
  reviewStatus!: 'approved' | 'rejected';
}
