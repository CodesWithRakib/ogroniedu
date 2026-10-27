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
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { FileAssetEntity } from '../../files/entities/file-asset.entity';
import type { LessonPlanEntity } from './lesson-plan.entity';
import { AssignmentEntity } from './assignment.entity';

export type LearningMaterialKind = 'file' | 'link';
export type LearningMaterialStatus = 'draft' | 'published' | 'archived';

/**
 * A private resource shared with a booking's participants. A `file` row points
 * at a `file_assets` record whose bytes live outside the public web root; a
 * `link` row is an https URL. Exactly one source is allowed (DB CHECK).
 */
@Entity('learning_materials')
@Index('ix_learning_materials_plan', ['lessonPlanId'])
@Index('ix_learning_materials_session', ['sessionId', 'status'])
@Index('ix_learning_materials_booking', ['bookingId', 'status'])
export class LearningMaterialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column('uuid', { name: 'lesson_plan_id', nullable: true })
  lessonPlanId!: string | null;

  @Column('uuid', { name: 'session_id', nullable: true })
  sessionId!: string | null;

  @Column('uuid', { name: 'assignment_id', nullable: true })
  assignmentId!: string | null;

  @Column('uuid', { name: 'uploaded_by_user_id', nullable: true })
  uploadedByUserId!: string | null;

  @Column({ type: 'text' })
  kind!: LearningMaterialKind;

  @Column('uuid', { name: 'file_asset_id', nullable: true })
  fileAssetId!: string | null;

  @Column({ name: 'external_url', type: 'text', nullable: true })
  externalUrl!: string | null;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', default: 'draft' })
  status!: LearningMaterialStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => BookingEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity;

  @ManyToOne('LessonPlanEntity', (plan: LessonPlanEntity) => plan.materials, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'lesson_plan_id' })
  lessonPlan?: LessonPlanEntity;

  @ManyToOne(() => BookingSessionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session?: BookingSessionEntity;

  @ManyToOne(() => AssignmentEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'assignment_id' })
  assignment?: AssignmentEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedByUser?: UserEntity;

  @ManyToOne(() => FileAssetEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'file_asset_id' })
  fileAsset?: FileAssetEntity;
}
