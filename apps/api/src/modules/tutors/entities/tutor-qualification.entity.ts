import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TutorProfileEntity } from './tutor-profile.entity';
import { FileAssetEntity } from '../../files/entities/file-asset.entity';

export type QualificationReviewStatus = 'pending' | 'approved' | 'rejected' | 'expired';

@Entity('tutor_qualifications')
export class TutorQualificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ name: 'qualification_type', type: 'text' })
  qualificationType!: string;

  @Column({ type: 'text', nullable: true })
  institution!: string | null;

  @Column({ name: 'institution_en', type: 'text', nullable: true })
  institutionEn?: string | null;

  @Column({ name: 'institution_bn', type: 'text', nullable: true })
  institutionBn?: string | null;

  @Column({ type: 'text' })
  title!: string;

  @Column({ name: 'title_en', type: 'text', nullable: true })
  titleEn?: string | null;

  @Column({ name: 'title_bn', type: 'text', nullable: true })
  titleBn?: string | null;

  @Column({ name: 'issued_year', type: 'smallint', nullable: true })
  issuedYear!: number | null;

  @Column({ name: 'expires_on', type: 'date', nullable: true })
  expiresOn!: string | null;

  @Column('uuid', { name: 'evidence_asset_id', nullable: true })
  evidenceAssetId!: string | null;

  @Column({ name: 'review_status', type: 'text', default: 'pending' })
  reviewStatus!: QualificationReviewStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => TutorProfileEntity, (t) => t.qualifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;

  @ManyToOne(() => FileAssetEntity, { nullable: true })
  @JoinColumn({ name: 'evidence_asset_id' })
  evidenceAsset?: FileAssetEntity | null;
}
