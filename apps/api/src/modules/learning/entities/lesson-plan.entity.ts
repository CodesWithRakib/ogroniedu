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
import { TutorProfileEntity } from '../../tutors/entities/tutor-profile.entity';
import { SubjectEntity } from '../../taxonomy/entities/subject.entity';
import { LearningMaterialEntity } from './learning-material.entity';

export type LessonPlanStatus = 'draft' | 'published' | 'archived';

export interface LessonPlanStep {
  title: string;
  durationMinutes?: number;
  notes?: string;
}

/** Reusable lesson content for a booking (optionally pinned to one session). */
@Entity('lesson_plans')
@Index('ix_lesson_plans_booking', ['bookingId', 'createdAt'])
@Index('ix_lesson_plans_tutor_status', ['tutorUserId', 'status', 'createdAt'])
export class LessonPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column('uuid', { name: 'session_id', nullable: true })
  sessionId!: string | null;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column('uuid', { name: 'subject_id', nullable: true })
  subjectId!: string | null;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  objectives!: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  steps!: LessonPlanStep[];

  @Column({ type: 'text', default: 'draft' })
  status!: LessonPlanStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => BookingEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity;

  @ManyToOne(() => BookingSessionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session?: BookingSessionEntity;

  @ManyToOne(() => TutorProfileEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;

  @ManyToOne(() => SubjectEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subject_id' })
  subject?: SubjectEntity;

  @OneToMany(() => LearningMaterialEntity, (material) => material.lessonPlan)
  materials?: LearningMaterialEntity[];
}
