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
import { TutorProfileEntity } from '../../tutors/entities/tutor-profile.entity';
import { SubjectEntity } from '../../taxonomy/entities/subject.entity';
import { EducationLevelEntity } from '../../taxonomy/entities/education-level.entity';
import type { BookingStatus } from '../enums/booking-status.enum';
import type { TutoringMode } from '../enums/tutoring-mode.enum';
import type { ServiceAgreementSnapshot } from '../interfaces/service-agreement-snapshot.interface';

export type { BookingStatus } from '../enums/booking-status.enum';
export type { TutoringMode } from '../enums/tutoring-mode.enum';
export type { ServiceAgreementSnapshot } from '../interfaces/service-agreement-snapshot.interface';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'requester_user_id' })
  requesterUserId!: string;

  @Column('uuid', { name: 'student_user_id' })
  studentUserId!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column('uuid', { name: 'subject_id' })
  subjectId!: string;

  @Column('uuid', { name: 'education_level_id' })
  educationLevelId!: string;

  @Column({ type: 'text' })
  mode!: TutoringMode;

  @Column({ type: 'text', default: 'requested' })
  status!: BookingStatus;

  @Column({ name: 'price_per_session_minor', type: 'bigint' })
  pricePerSessionMinor!: string | number;

  @Column({ type: 'char', length: 3, default: 'BDT' })
  currency!: string;

  @Column({ name: 'duration_minutes', type: 'integer', default: 60 })
  durationMinutes!: number;

  @Column({
    name: 'cancellation_policy_version',
    type: 'text',
    default: 'v1.0-standard-cancellation',
  })
  cancellationPolicyVersion!: string;

  @Column({ name: 'service_agreement_snapshot', type: 'jsonb', default: {} })
  serviceAgreementSnapshot!: ServiceAgreementSnapshot;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'requester_user_id' })
  requesterUser?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'student_user_id' })
  studentUser?: UserEntity;

  @ManyToOne(() => TutorProfileEntity)
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;

  @ManyToOne(() => SubjectEntity)
  @JoinColumn({ name: 'subject_id' })
  subject?: SubjectEntity;

  @ManyToOne(() => EducationLevelEntity)
  @JoinColumn({ name: 'education_level_id' })
  educationLevel?: EducationLevelEntity;
}
