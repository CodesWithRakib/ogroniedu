import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TutorVerificationLevelValues,
  VerificationDocumentTypeValues,
  VerificationLevelDecisionValues,
  TutorVerificationQueueSortValues,
  TutorVerificationQueueAssignmentValues,
  TutorVerificationStatusValues,
  type TutorVerificationLevel,
  type VerificationDocumentType,
  type VerificationLevelDecision,
  type TutorVerificationQueueSort,
  type TutorVerificationQueueAssignment,
} from '@ogroniedu/contracts';

/** Tutor registers an already-uploaded private file asset as level evidence. */
export class AddVerificationDocumentDto {
  @IsNotEmpty()
  @IsIn([...TutorVerificationLevelValues])
  level!: TutorVerificationLevel;

  @IsNotEmpty()
  @IsIn([...VerificationDocumentTypeValues])
  documentType!: VerificationDocumentType;

  @IsNotEmpty()
  @IsUUID()
  fileAssetId!: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'expiresOn must be an ISO date (YYYY-MM-DD)' })
  expiresOn?: string;
}

export class ReviewerDecisionDto {
  @IsNotEmpty()
  @IsIn([...VerificationLevelDecisionValues])
  decision!: VerificationLevelDecision;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  reasonCode!: string;

  /** Applicant-facing text. Reviewer-only text belongs in `internalNotes`. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  applicantFeedback?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNotes?: string;

  /** Optimistic-concurrency guard: the level version the reviewer loaded. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  policyVersion?: string;
}

export class VerifyVerificationDocumentDto {
  @IsNotEmpty()
  @IsIn(['approved', 'rejected'])
  reviewStatus!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reasonCode?: string;
}

export class AssignVerificationLevelDto {
  /** Target reviewer. Omit to claim the case for the authenticated reviewer. */
  @IsOptional()
  @IsUUID()
  reviewerUserId?: string;
}

/** Server-validated queue filters for the admin/compliance verification queue. */
export class VerificationQueueQueryDto {
  @IsOptional()
  @IsIn([...TutorVerificationStatusValues, 'all'])
  status?: (typeof TutorVerificationStatusValues)[number] | 'all';

  /** Derived profile status filter (used when no single level status is set). */
  @IsOptional()
  @IsIn([...TutorVerificationStatusValues, 'all'])
  overallStatus?: (typeof TutorVerificationStatusValues)[number] | 'all';

  @IsOptional()
  @IsIn([...TutorVerificationLevelValues])
  level?: TutorVerificationLevel;

  @IsOptional()
  @IsIn([...TutorVerificationQueueAssignmentValues])
  assignment?: TutorVerificationQueueAssignment;

  /** Free-text search over display name, email and headline. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  /** ISO date (YYYY-MM-DD) lower bound on the level submission timestamp. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  submittedFrom?: string;

  /** ISO date (YYYY-MM-DD) exclusive upper bound on the level submission timestamp. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  submittedTo?: string;

  @IsOptional()
  @IsIn([...TutorVerificationQueueSortValues])
  sort?: TutorVerificationQueueSort = 'oldest_waiting';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
