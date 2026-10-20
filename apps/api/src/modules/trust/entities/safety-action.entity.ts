import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { SafetyReportEntity } from './safety-report.entity';

export type SafetyActionType =
  | 'tutor_safety_hold'
  | 'contact_restriction'
  | 'messaging_disabled'
  | 'temporary_suspension'
  | 'flagged_for_review';

@Entity('safety_actions')
export class SafetyActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'report_id', nullable: true })
  reportId?: string | null;

  @Column('uuid', { name: 'target_user_id' })
  targetUserId!: string;

  @Column({ name: 'action_type', type: 'text' })
  actionType!: SafetyActionType;

  @Column({ type: 'text' })
  reason!: string;

  @Column('uuid', { name: 'applied_by' })
  appliedBy!: string;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @Column('uuid', { name: 'revoked_by', nullable: true })
  revokedBy?: string | null;

  @Column({ name: 'revocation_reason', type: 'text', nullable: true })
  revocationReason?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => SafetyReportEntity, (report) => report.actions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'report_id' })
  report?: SafetyReportEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'target_user_id' })
  targetUser?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'applied_by' })
  appliedByUser?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'revoked_by' })
  revokedByUser?: UserEntity;
}
