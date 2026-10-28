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
import type { TutorVerificationStatus } from '@ogroniedu/contracts';
import { UserEntity } from '../../auth/entities/user.entity';
import { TutorQualificationEntity } from './tutor-qualification.entity';
import { TutorSubjectEntity } from './tutor-subject.entity';
import { TutorServiceAreaEntity } from './tutor-service-area.entity';
import { TutorAvailabilityEntity } from './tutor-availability.entity';

export type TeachingMode = 'in_person' | 'online' | 'hybrid';
export type SafetyHoldStatus = 'clear' | 'under_investigation' | 'safety_hold';
/**
 * Profile-level status is DERIVED from `tutor_verification_levels` (Phase 02).
 * The union mirrors the shared contract so schema, API and UI cannot drift.
 */
export type VerificationStatus = TutorVerificationStatus;
export type PublicationStatus = 'draft' | 'published' | 'unpublished';

@Entity('tutor_profiles')
export class TutorProfileEntity {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId!: string;

  @Column({ name: 'tutor_code', type: 'text', nullable: true })
  tutorCode!: string;

  /** Legacy canonical English headline. Kept in sync with `headlineEn`. */
  @Column({ type: 'text', nullable: true })
  headline!: string | null;

  /** Legacy canonical English biography. Kept in sync with `bioEn`. */
  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  /** English headline shown to `en` visitors. */
  @Column({ name: 'headline_en', type: 'text', nullable: true })
  headlineEn!: string | null;

  /** Bangla headline shown to `bn` visitors; null means "fall back to English". */
  @Column({ name: 'headline_bn', type: 'text', nullable: true })
  headlineBn!: string | null;

  /** English biography shown to `en` visitors. */
  @Column({ name: 'bio_en', type: 'text', nullable: true })
  bioEn!: string | null;

  /** Bangla biography shown to `bn` visitors; null means "fall back to English". */
  @Column({ name: 'bio_bn', type: 'text', nullable: true })
  bioBn!: string | null;

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

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'profile_updated_at', type: 'timestamptz', nullable: true })
  profileUpdatedAt!: Date | null;

  /** Timestamp of the last transition into `approved` (all levels approved). */
  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  /**
   * Earliest expiry across approved levels that carry a validity policy.
   * Null means "no expiry policy applies" — never "valid forever by law".
   */
  @Column({ name: 'verification_expires_at', type: 'timestamptz', nullable: true })
  verificationExpiresAt!: Date | null;

  @Column({ name: 'verification_policy_version', type: 'text', nullable: true })
  verificationPolicyVersion!: string | null;

  @Column({ name: 'safety_hold_status', type: 'text', default: 'clear' })
  safetyHoldStatus!: SafetyHoldStatus;

  @Column({ name: 'safety_hold_reason', type: 'text', nullable: true })
  safetyHoldReason?: string | null;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null;

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
