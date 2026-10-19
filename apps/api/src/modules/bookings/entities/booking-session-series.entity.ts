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

export type SessionSeriesStatus = 'active' | 'cancelled' | 'completed';

export interface SeriesSlot {
  weekday: number;
  startLocal: string;
  durationMinutes: number;
}

@Entity('booking_session_series')
@Index('ix_booking_session_series_booking', ['bookingId', 'createdAt'])
export class BookingSessionSeriesEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column('uuid', { name: 'student_user_id' })
  studentUserId!: string;

  @Column({ type: 'text', default: 'Asia/Dhaka' })
  timezone!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'horizon_end_date', type: 'date' })
  horizonEndDate!: string;

  @Column({ name: 'occurrences_planned', type: 'integer' })
  occurrencesPlanned!: number;

  @Column({ type: 'jsonb' })
  slots!: SeriesSlot[];

  @Column({ type: 'text', default: 'active' })
  status!: SessionSeriesStatus;

  @Column({ name: 'idempotency_key', type: 'text' })
  idempotencyKey!: string;

  @Column('uuid', { name: 'created_by_user_id', nullable: true })
  createdByUserId!: string | null;

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
