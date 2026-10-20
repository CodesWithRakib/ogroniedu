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
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { TutorProfileEntity } from '../../tutors/entities/tutor-profile.entity';

export type LearningGoalStatus = 'open' | 'in_progress' | 'achieved' | 'not_achieved' | 'cancelled';

/** Tutor-authored, evidence-backed learning goal for a booking's student. */
@Entity('learning_goals')
@Index('ix_learning_goals_student', ['studentUserId', 'status', 'createdAt'])
@Index('ix_learning_goals_booking', ['bookingId', 'createdAt'])
export class LearningGoalEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column('uuid', { name: 'student_user_id' })
  studentUserId!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'target_date', type: 'date', nullable: true })
  targetDate!: string | null;

  @Column({ type: 'text', default: 'open' })
  status!: LearningGoalStatus;

  @Column({ type: 'text', nullable: true })
  evidence!: string | null;

  @Column('uuid', { name: 'created_by_user_id', nullable: true })
  createdByUserId!: string | null;

  @Column({ name: 'achieved_at', type: 'timestamptz', nullable: true })
  achievedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => BookingEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_user_id' })
  studentUser?: UserEntity;

  @ManyToOne(() => TutorProfileEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;
}
