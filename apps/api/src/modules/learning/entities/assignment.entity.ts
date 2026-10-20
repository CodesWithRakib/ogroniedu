import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { TutorProfileEntity } from '../../tutors/entities/tutor-profile.entity';
import { SubjectEntity } from '../../taxonomy/entities/subject.entity';
import { AssignmentSubmissionEntity } from './assignment-submission.entity';

export type AssignmentStatus = 'draft' | 'published' | 'archived';

@Entity('assignments')
@Index('ix_assignments_booking', ['bookingId', 'createdAt'])
@Index('ix_assignments_student', ['studentUserId', 'status', 'dueAt'])
@Index('ix_assignments_tutor', ['tutorUserId', 'createdAt'])
export class AssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column('uuid', { name: 'session_id', nullable: true })
  sessionId!: string | null;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column('uuid', { name: 'student_user_id' })
  studentUserId!: string;

  @Column('uuid', { name: 'subject_id', nullable: true })
  subjectId!: string | null;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  topic!: string | null;

  @Column({ type: 'text', nullable: true })
  instructions!: string | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt!: Date | null;

  @Column({ name: 'max_score', type: 'numeric', precision: 5, scale: 2, default: 100 })
  maxScore!: number;

  @Column({ type: 'text', default: 'draft' })
  status!: AssignmentStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ name: 'resubmission_allowed', type: 'boolean', default: true })
  resubmissionAllowed!: boolean;

  @Column({ name: 'late_submission_allowed', type: 'boolean', default: true })
  lateSubmissionAllowed!: boolean;

  @Column({ name: 'max_attempts', type: 'integer', default: 3 })
  maxAttempts!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity;

  @ManyToOne(() => BookingSessionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session?: BookingSessionEntity;

  @ManyToOne(() => TutorProfileEntity)
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'student_user_id' })
  studentUser?: UserEntity;

  @ManyToOne(() => SubjectEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subject_id' })
  subject?: SubjectEntity;

  @OneToMany(() => AssignmentSubmissionEntity, (sub) => sub.assignment)
  submissions?: AssignmentSubmissionEntity[];
}
