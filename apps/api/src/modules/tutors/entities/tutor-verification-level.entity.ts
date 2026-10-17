import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import type { TutorVerificationLevel, VerificationLevelStatus } from '@ogroniedu/contracts';
import { TutorProfileEntity } from './tutor-profile.entity';
import { UserEntity } from '../../auth/entities/user.entity';

export type { TutorVerificationLevel, VerificationLevelStatus };

/**
 * One independently reviewable verification level per tutor.
 * The profile-level `tutor_profiles.verification_status` is always *derived*
 * from these rows (see VerificationStateMachine.deriveOverallStatus) — never the
 * other way around.
 *
 * `version` is the optimistic-concurrency guard used by reviewer decisions so
 * two reviewers cannot silently overwrite each other's outcome.
 */
@Entity('tutor_verification_levels')
@Unique('uq_tutor_verification_level', ['tutorUserId', 'level'])
@Index('ix_tutor_verification_level_queue', ['status', 'lastSubmittedAt'])
export class TutorVerificationLevelEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ type: 'text' })
  level!: TutorVerificationLevel;

  @Column({ type: 'text', default: 'not_started' })
  status!: VerificationLevelStatus;

  @Column('uuid', { name: 'assigned_reviewer_user_id', nullable: true })
  assignedReviewerUserId!: string | null;

  @Column('uuid', { name: 'decided_by_user_id', nullable: true })
  decidedByUserId!: string | null;

  @Column({ name: 'decision_reason_code', type: 'text', nullable: true })
  decisionReasonCode!: string | null;

  /** Applicant-facing feedback. Reviewer-only text must use `internalNotes`. */
  @Column({ name: 'applicant_feedback', type: 'text', nullable: true })
  applicantFeedback!: string | null;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'first_submitted_at', type: 'timestamptz', nullable: true })
  firstSubmittedAt!: Date | null;

  @Column({ name: 'last_submitted_at', type: 'timestamptz', nullable: true })
  lastSubmittedAt!: Date | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt!: Date | null;

  @Column({ name: 'policy_version', type: 'text' })
  policyVersion!: string;

  /** Tutor submissions for this level; drives the resubmission cap. */
  @Column({ name: 'submission_count', type: 'integer', default: 0 })
  submissionCount!: number;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => TutorProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_reviewer_user_id' })
  assignedReviewer?: UserEntity | null;
}
