import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BookingEntity } from './booking.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { TutorProfileEntity } from '../../tutors/entities/tutor-profile.entity';

export type SessionStatus =
  'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'reschedule_pending';

export interface CancellationAssessment {
  initiatedByRole: 'guardian' | 'student' | 'tutor' | 'admin';
  leadHours: number;
  refundPercentage: number;
  tutorCompensationPercentage: number;
  penaltyNotice: string;
  reason?: string;
  assessedAt: string;
}

@Entity('booking_sessions')
@Index('ix_sessions_tutor_start', ['tutorUserId', 'startsAt'])
@Index('ix_sessions_student_start', ['studentUserId', 'startsAt'])
export class BookingSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column('uuid', { name: 'student_user_id' })
  studentUserId!: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({ type: 'text', default: 'Asia/Dhaka' })
  timezone!: string;

  @Column({ type: 'text', default: 'scheduled' })
  status!: SessionStatus;

  @Column({ name: 'meeting_url', type: 'text', nullable: true })
  meetingUrl!: string | null;

  @Column({ name: 'location_instructions', type: 'text', nullable: true })
  locationInstructions!: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'cancellation_assessment', type: 'jsonb', nullable: true })
  cancellationAssessment!: CancellationAssessment | null;

  @Column('uuid', { name: 'rescheduled_from_id', nullable: true })
  rescheduledFromId!: string | null;

  @Column('uuid', { name: 'series_id', nullable: true })
  seriesId!: string | null;

  @Column({ name: 'occurrence_index', type: 'integer', nullable: true })
  occurrenceIndex!: number | null;

  @Column({ name: 'reminder_sent_at', type: 'timestamptz', nullable: true })
  reminderSentAt!: Date | null;

  @Column({ name: 'status_changed_at', type: 'timestamptz', nullable: true })
  statusChangedAt!: Date | null;

  @Column('uuid', { name: 'status_changed_by', nullable: true })
  statusChangedBy!: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason!: string | null;

  @Column({ name: 'rescheduled_at', type: 'timestamptz', nullable: true })
  rescheduledAt!: Date | null;

  @Column('uuid', { name: 'rescheduled_by', nullable: true })
  rescheduledBy!: string | null;

  @Column({ name: 'reschedule_reason', type: 'text', nullable: true })
  rescheduleReason!: string | null;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity;

  @ManyToOne(() => TutorProfileEntity)
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'student_user_id' })
  studentUser?: UserEntity;
}
