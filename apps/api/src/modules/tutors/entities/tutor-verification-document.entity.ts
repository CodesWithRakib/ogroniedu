import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type {
  TutorVerificationLevel,
  VerificationDocumentReviewStatus,
  VerificationDocumentType,
} from '@ogroniedu/contracts';
import { TutorProfileEntity } from './tutor-profile.entity';
import { FileAssetEntity } from '../../files/entities/file-asset.entity';
import { UserEntity } from '../../auth/entities/user.entity';

export type { VerificationDocumentType, VerificationDocumentReviewStatus };

/**
 * Evidence metadata for a verification level. The binary lives in
 * `file_assets` (private, signed access only); this row carries the review
 * lifecycle, expiry and reminder bookkeeping. Rows are soft-deleted and
 * superseded rather than hard-deleted so review history is never erased.
 */
@Entity('tutor_verification_documents')
@Index('ix_tutor_verification_documents_tutor', ['tutorUserId', 'level'])
export class TutorVerificationDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ type: 'text' })
  level!: TutorVerificationLevel;

  @Column({ name: 'document_type', type: 'text' })
  documentType!: VerificationDocumentType;

  @Column('uuid', { name: 'file_asset_id' })
  fileAssetId!: string;

  @Column({ name: 'review_status', type: 'text', default: 'pending' })
  reviewStatus!: VerificationDocumentReviewStatus;

  @Column('uuid', { name: 'reviewed_by_user_id', nullable: true })
  reviewedByUserId!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'reason_code', type: 'text', nullable: true })
  reasonCode!: string | null;

  @Column({ name: 'expires_on', type: 'date', nullable: true })
  expiresOn!: string | null;

  /** Last delivered reminder stage (e.g. `D-30`, `D-7`, `EXPIRED`). */
  @Column({ name: 'reminder_stage', type: 'text', nullable: true })
  reminderStage!: string | null;

  @Column({ name: 'last_reminded_at', type: 'timestamptz', nullable: true })
  lastRemindedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => TutorProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;

  @ManyToOne(() => FileAssetEntity)
  @JoinColumn({ name: 'file_asset_id' })
  fileAsset?: FileAssetEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewedBy?: UserEntity | null;
}
