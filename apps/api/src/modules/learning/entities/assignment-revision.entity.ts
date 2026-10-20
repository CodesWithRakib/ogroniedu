import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { AssignmentSubmissionEntity } from './assignment-submission.entity';
import { UserEntity } from '../../auth/entities/user.entity';

/**
 * Immutable snapshot of a submission attempt. Written before the live
 * submission row is overwritten, so resubmission never erases history.
 */
@Entity('assignment_revisions')
@Unique('uq_assignment_revision_attempt', ['submissionId', 'attemptNumber'])
@Index('ix_assignment_revisions_submission', ['submissionId', 'attemptNumber'])
export class AssignmentRevisionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'submission_id' })
  submissionId!: string;

  @Column({ name: 'attempt_number', type: 'integer' })
  attemptNumber!: number;

  @Column({ name: 'submission_text', type: 'text', nullable: true })
  submissionText!: string | null;

  @Column('uuid', { name: 'asset_ids', array: true, default: '{}' })
  assetIds!: string[];

  @Column({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt!: Date;

  @Column({ type: 'text' })
  status!: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  score!: number | null;

  @Column({ name: 'max_score', type: 'numeric', precision: 5, scale: 2, nullable: true })
  maxScore!: number | null;

  @Column({ name: 'tutor_feedback', type: 'text', nullable: true })
  tutorFeedback!: string | null;

  @Column('uuid', { name: 'reviewed_by', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'return_reason', type: 'text', nullable: true })
  returnReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => AssignmentSubmissionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submission_id' })
  submission?: AssignmentSubmissionEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedByUser?: UserEntity;
}
