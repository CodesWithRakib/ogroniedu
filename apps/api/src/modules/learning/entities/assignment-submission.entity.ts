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
import { AssignmentEntity } from './assignment.entity';
import { UserEntity } from '../../auth/entities/user.entity';

export type SubmissionStatus = 'submitted' | 'late' | 'reviewed' | 'returned';

/** UI projection that never replaces the stored status. */
export type SubmissionWorkflowState = 'submitted' | 'under_review' | 'reviewed' | 'returned' | 'late';

@Entity('assignment_submissions')
@Unique(['assignmentId', 'studentUserId'])
@Index('ix_assignment_submissions_student', ['studentUserId', 'submittedAt'])
@Index('ix_assignment_submissions_assignment', ['assignmentId'])
export class AssignmentSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'assignment_id' })
  assignmentId!: string;

  @Column('uuid', { name: 'student_user_id' })
  studentUserId!: string;

  @Column({ name: 'submission_text', type: 'text', nullable: true })
  submissionText!: string | null;

  @Column('uuid', { name: 'asset_ids', array: true, default: '{}' })
  assetIds!: string[];

  @CreateDateColumn({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt!: Date;

  @Column({ type: 'text', default: 'submitted' })
  status!: SubmissionStatus;

  @Column({ name: 'attempt_count', type: 'integer', default: 1 })
  attemptCount!: number;

  @Column({ name: 'returned_at', type: 'timestamptz', nullable: true })
  returnedAt!: Date | null;

  @Column({ name: 'return_reason', type: 'text', nullable: true })
  returnReason!: string | null;

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

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => AssignmentEntity, (a) => a.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment?: AssignmentEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'student_user_id' })
  studentUser?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'reviewed_by' })
  reviewedByUser?: UserEntity;
}
