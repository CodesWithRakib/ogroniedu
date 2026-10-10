import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { TutorQualificationEntity } from './tutor-qualification.entity';
import { TutorSubjectEntity } from './tutor-subject.entity';
import { TutorServiceAreaEntity } from './tutor-service-area.entity';
import { TutorAvailabilityEntity } from './tutor-availability.entity';

export type TeachingMode = 'in_person' | 'online' | 'hybrid';
export type VerificationStatus =
  | 'not_submitted'
  | 'submitted'
  | 'under_review'
  | 'needs_information'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'expired';
export type PublicationStatus = 'draft' | 'published' | 'unpublished';

@Entity('tutor_profiles')
export class TutorProfileEntity {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId!: string;

  @Column({ type: 'text', nullable: true })
  headline!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ name: 'years_experience', type: 'smallint', nullable: true })
  yearsExperience!: number | null;

  @Column({ name: 'teaching_modes', type: 'text', array: true, default: '{}' })
  teachingModes!: TeachingMode[];

  @Column({ name: 'hourly_rate_minor', type: 'bigint', nullable: true })
  hourlyRateMinor!: string | null;

  @Column({ type: 'char', length: 3, default: 'BDT' })
  currency!: string;

  @Column({ name: 'verification_status', type: 'text', default: 'not_submitted' })
  verificationStatus!: VerificationStatus;

  @Column({ name: 'publication_status', type: 'text', default: 'draft' })
  publicationStatus!: PublicationStatus;

  @Column({ name: 'response_time_minutes', type: 'integer', nullable: true })
  responseTimeMinutes!: number | null;

  @Column({ name: 'profile_updated_at', type: 'timestamptz', nullable: true })
  profileUpdatedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @OneToMany(() => TutorQualificationEntity, (q) => q.tutorProfile)
  qualifications?: TutorQualificationEntity[];

  @OneToMany(() => TutorSubjectEntity, (s) => s.tutorProfile)
  subjects?: TutorSubjectEntity[];

  @OneToMany(() => TutorServiceAreaEntity, (a) => a.tutorProfile)
  serviceAreas?: TutorServiceAreaEntity[];

  @OneToMany(() => TutorAvailabilityEntity, (av) => av.tutorProfile)
  availabilities?: TutorAvailabilityEntity[];
}
