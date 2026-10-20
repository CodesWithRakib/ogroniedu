import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { SafetyCaseMessageEntity } from './safety-case-message.entity';
import { SafetyCaseEventEntity } from './safety-case-event.entity';
import { SafetyActionEntity } from './safety-action.entity';

export type SafetyCategory =
  | 'general_complaint'
  | 'tutor_conduct'
  | 'student_guardian_conduct'
  | 'inappropriate_communication'
  | 'harassment_bullying'
  | 'discrimination'
  | 'abuse_exploitation'
  | 'physical_safety'
  | 'privacy_data_exposure'
  | 'booking_dispute'
  | 'payment_refund'
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
  | 'triaged'
  | 'assigned'
  | 'under_review'
  | 'under_investigation'
  | 'awaiting_information'
  | 'escalated'
  | 'action_taken'
  | 'resolved'
  | 'closed'
  | 'reopened'
  | 'dismissed';

export type EscalationLevel = 'standard' | 'urgent_child_safety' | 'legal_review';
export type ContactMethod = 'in_app' | 'email' | 'phone' | 'emergency_only';

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

  @Column('uuid', { name: 'session_id', nullable: true })
  sessionId?: string | null;

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

  @Column('uuid', { name: 'assigned_to', nullable: true })
  assignedTo?: string | null;

  @Column({ name: 'is_confidential', type: 'boolean', default: true })
  isConfidential!: boolean;

  @Column({ name: 'preferred_contact_method', type: 'text', default: 'in_app' })
  preferredContactMethod!: ContactMethod;

  @Column({ name: 'incident_date', type: 'timestamptz', nullable: true })
  incidentDate?: Date | null;

  @Column('uuid', { array: true, name: 'conflict_user_ids', default: () => "'{}'" })
  conflictUserIds!: string[];

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

  @ManyToOne(() => BookingSessionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'session_id' })
  session?: BookingSessionEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedInvestigator?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver?: UserEntity;

  @OneToMany(() => SafetyCaseMessageEntity, (m) => m.report)
  messages?: SafetyCaseMessageEntity[];

  @OneToMany(() => SafetyCaseEventEntity, (e) => e.report)
  events?: SafetyCaseEventEntity[];

  @OneToMany(() => SafetyActionEntity, (a) => a.report)
  actions?: SafetyActionEntity[];
}
