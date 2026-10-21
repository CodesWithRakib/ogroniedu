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
import type { FeedbackCategory, FeedbackSeverity, FeedbackStatus } from '@ogroniedu/contracts';

@Entity('beta_feedback')
export class BetaFeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'reporter_user_id', type: 'uuid', nullable: true })
  reporterUserId!: string | null;

  @Column({ name: 'reporter_role', type: 'varchar', length: 50 })
  reporterRole!: string;

  @Column({ type: 'varchar', length: 50 })
  category!: FeedbackCategory;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  route!: string | null;

  @Column({ name: 'reproduction_steps', type: 'text', nullable: true })
  reproductionSteps!: string | null;

  @Column({ name: 'diagnostic_metadata', type: 'jsonb', nullable: true })
  diagnosticMetadata!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  severity!: FeedbackSeverity | null;

  @Column({ type: 'varchar', length: 30, default: 'submitted' })
  status!: FeedbackStatus;

  @Column({ name: 'assigned_to_user_id', type: 'uuid', nullable: true })
  assignedToUserId!: string | null;

  @Column({ name: 'triage_notes', type: 'text', nullable: true })
  triageNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reporter_user_id' })
  reporter?: UserEntity | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignee?: UserEntity | null;
}
