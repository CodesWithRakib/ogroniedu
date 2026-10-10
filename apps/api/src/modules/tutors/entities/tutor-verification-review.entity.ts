import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TutorProfileEntity } from './tutor-profile.entity';
import { UserEntity } from '../../auth/entities/user.entity';

export type ReviewDecision =
  'approved' | 'rejected' | 'needs_information' | 'suspended' | 'reinstated';

@Entity('tutor_verification_reviews')
export class TutorVerificationReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column('uuid', { name: 'reviewer_user_id' })
  reviewerUserId!: string;

  @Column({ type: 'text' })
  decision!: ReviewDecision;

  @Column({ name: 'reason_code', type: 'text' })
  reasonCode!: string;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes!: string | null;

  @Column({ name: 'policy_version', type: 'text' })
  policyVersion!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => TutorProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'reviewer_user_id' })
  reviewer?: UserEntity;
}
