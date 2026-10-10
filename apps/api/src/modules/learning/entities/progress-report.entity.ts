import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { TutorProfileEntity } from '../../tutors/entities/tutor-profile.entity';

@Entity('progress_reports')
@Index('ix_progress_reports_booking', ['bookingId', 'generatedAt'])
@Index('ix_progress_reports_student', ['studentUserId', 'generatedAt'])
export class ProgressReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column('uuid', { name: 'student_user_id' })
  studentUserId!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart!: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd!: string;

  @Column({ name: 'attendance_rate', type: 'numeric', precision: 5, scale: 2 })
  attendanceRate!: number;

  @Column({ name: 'assignments_completed', type: 'integer', default: 0 })
  assignmentsCompleted!: number;

  @Column({ name: 'average_score', type: 'numeric', precision: 5, scale: 2, nullable: true })
  averageScore!: number | null;

  @Column({ name: 'observable_progress', type: 'text' })
  observableProgress!: string;

  @Column({ name: 'areas_for_growth', type: 'text', nullable: true })
  areasForGrowth!: string | null;

  @Column({ name: 'tutor_remarks', type: 'text', nullable: true })
  tutorRemarks!: string | null;

  @CreateDateColumn({ name: 'generated_at', type: 'timestamptz' })
  generatedAt!: Date;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'student_user_id' })
  studentUser?: UserEntity;

  @ManyToOne(() => TutorProfileEntity)
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;
}
