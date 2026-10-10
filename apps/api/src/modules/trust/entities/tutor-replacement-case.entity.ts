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
  'requested' | 'under_review' | 'matching' | 'offered' | 'accepted' | 'rejected' | 'closed';

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

  @Column({ name: 'outcome_notes', type: 'text', nullable: true })
  outcomeNotes?: string | null;

  @Column({
    name: 'policy_version',
    type: 'text',
    default: 'v1.0-tutor-replacement-guarantee',
  })
  policyVersion!: string;

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
