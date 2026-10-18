import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';

export type ReplacementReasonCode =
  | 'trial_dissatisfaction'
  | 'frequent_tutor_cancellation'
  | 'tutor_no_show'
  | 'teaching_mismatch'
  | 'unprofessional_conduct'
  | 'other';

export type ReplacementStatus =
  | 'requested'
  | 'under_review'
  | 'matching'
  | 'offered'
  | 'accepted'
  | 'rejected'
  | 'closed'
  | 'refund_eligible'
  | 'cancelled';

export type RefundEligibility = 'not_determined' | 'eligible' | 'not_eligible';

/** Terminal statuses never accept another transition. */
export const TERMINAL_REPLACEMENT_STATUSES: readonly ReplacementStatus[] = [
  'accepted',
  'rejected',
  'closed',
  'refund_eligible',
  'cancelled',
];

/** Statuses that count as an active case (duplicate protection + queue). */
export const ACTIVE_REPLACEMENT_STATUSES: readonly ReplacementStatus[] = [
  'requested',
  'under_review',
  'matching',
  'offered',
];

@Entity('tutor_replacement_cases')
export class TutorReplacementCaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column('uuid', { name: 'requested_by' })
  requestedBy!: string;

  @Column({ name: 'reason_code', type: 'text' })
  reasonCode!: ReplacementReasonCode;

  @Column({ type: 'text' })
  explanation!: string;

  @Column({ type: 'text', default: 'requested' })
  status!: ReplacementStatus;

  @Column('uuid', { name: 'replacement_tutor_user_id', nullable: true })
  replacementTutorUserId?: string | null;

  @Column('uuid', { name: 'assigned_to', nullable: true })
  assignedTo?: string | null;

  /** Reviewer-only notes. Never serialized to the applicant or public surfaces. */
  @Column({ name: 'outcome_notes', type: 'text', nullable: true })
  outcomeNotes?: string | null;

  /** Applicant-facing explanation of the latest decision. */
  @Column({ name: 'user_visible_note', type: 'text', nullable: true })
  userVisibleNote?: string | null;

  @Column({
    name: 'policy_version',
    type: 'text',
    default: 'v1.0-tutor-replacement-guarantee',
  })
  policyVersion!: string;

  /** Server-computed matching deadline (`requested_at + target hours`). */
  @Column({ name: 'deadline_at', type: 'timestamptz', nullable: true })
  deadlineAt?: Date | null;

  @Column({ name: 'extended_at', type: 'timestamptz', nullable: true })
  extendedAt?: Date | null;

  @Column({ name: 'extension_reason', type: 'text', nullable: true })
  extensionReason?: string | null;

  @Column({ name: 'refund_eligibility', type: 'text', default: 'not_determined' })
  refundEligibility!: RefundEligibility;

  @Column({ name: 'refund_decided_at', type: 'timestamptz', nullable: true })
  refundDecidedAt?: Date | null;

  /** Optimistic-concurrency guard for competing staff decisions. */
  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({ name: 'overdue_notified_at', type: 'timestamptz', nullable: true })
  overdueNotifiedAt?: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => BookingEntity)
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'requested_by' })
  requester?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'replacement_tutor_user_id' })
  replacementTutor?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignee?: UserEntity;
}
