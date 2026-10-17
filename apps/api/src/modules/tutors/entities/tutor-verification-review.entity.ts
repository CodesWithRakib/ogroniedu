import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { TutorVerificationLevel, VerificationLevelStatus } from '@ogroniedu/contracts';
import { TutorProfileEntity } from './tutor-profile.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { TutorVerificationDocumentEntity } from './tutor-verification-document.entity';

export type ReviewDecision =
  'approved' | 'rejected' | 'needs_information' | 'suspended' | 'reinstated';

/**
 * Immutable review audit trail.
 *
 * Phase 02 made reviews level-scoped: `level`, `fromStatus`/`toStatus` and the
 * applicant/internal feedback split were added. Rows created before migration
 * 014 have `level IS NULL` and represent the legacy profile-level decision.
 */
@Entity('tutor_verification_reviews')
export class TutorVerificationReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column('uuid', { name: 'reviewer_user_id' })
  reviewerUserId!: string;

  @Column({ type: 'text' })
  decision!: ReviewDecision;

  @Column({ name: 'reason_code', type: 'text' })
  reasonCode!: string;

  /** Reviewer-only notes. Never serialized to applicant-facing surfaces. */
  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes!: string | null;

  /** Applicant-facing text only. */
  @Column({ name: 'applicant_feedback', type: 'text', nullable: true })
  applicantFeedback!: string | null;

  /** Null for legacy pre-Phase-02 profile-level decisions. */
  @Column({ type: 'text', nullable: true })
  level!: TutorVerificationLevel | null;

  @Column('uuid', { name: 'document_id', nullable: true })
  documentId!: string | null;

  @Column({ name: 'from_status', type: 'text', nullable: true })
  fromStatus!: VerificationLevelStatus | null;

  @Column({ name: 'to_status', type: 'text', nullable: true })
  toStatus!: VerificationLevelStatus | null;

  @Column({ name: 'reviewer_role', type: 'text', nullable: true })
  reviewerRole!: string | null;

  @Column({ name: 'policy_version', type: 'text' })
  policyVersion!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => TutorProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'reviewer_user_id' })
  reviewer?: UserEntity;

  @ManyToOne(() => TutorVerificationDocumentEntity, { nullable: true })
  @JoinColumn({ name: 'document_id' })
  document?: TutorVerificationDocumentEntity | null;
}
