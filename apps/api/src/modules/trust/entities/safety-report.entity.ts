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
import { BookingEntity } from '../../bookings/entities/booking.entity';

export type SafetyCategory =
  | 'harassment'
  | 'child_safety'
  | 'inappropriate_content'
  | 'off_platform_payment'
  | 'academic_dishonesty'
  | 'fraud_billing'
  | 'other';

export type SafetySeverity = 'low' | 'medium' | 'high' | 'critical';

export type SafetyStatus =
  | 'submitted'
  | 'under_investigation'
  | 'escalated'
  | 'action_taken'
  | 'dismissed';

export type EscalationLevel = 'standard' | 'urgent_child_safety' | 'legal_review';

@Entity('safety_reports')
export class SafetyReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'reporter_user_id' })
  reporterUserId!: string;

  @Column('uuid', { name: 'reported_user_id', nullable: true })
  reportedUserId?: string | null;

  @Column('uuid', { name: 'booking_id', nullable: true })
  bookingId?: string | null;

  @Column({ type: 'text' })
  category!: SafetyCategory;

  @Column({ type: 'text', default: 'medium' })
  severity!: SafetySeverity;

  @Column({ type: 'text' })
  description!: string;

  @Column('uuid', { array: true, name: 'evidence_asset_ids', default: () => "'{}'" })
  evidenceAssetIds!: string[];

  @Column({ type: 'text', default: 'submitted' })
  status!: SafetyStatus;

  @Column({
    name: 'escalation_level',
    type: 'text',
    default: 'standard',
  })
  escalationLevel!: EscalationLevel;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes?: string | null;

  @Column('uuid', { name: 'resolved_by', nullable: true })
  resolvedBy?: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;

  @Column({
    name: 'policy_version',
    type: 'text',
    default: 'v1.0-child-safety-reporting',
  })
  policyVersion!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'reporter_user_id' })
  reporter?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'reported_user_id' })
  reportedUser?: UserEntity;

  @ManyToOne(() => BookingEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver?: UserEntity;
}
