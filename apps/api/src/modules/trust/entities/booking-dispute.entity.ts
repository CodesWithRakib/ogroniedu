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
import { PaymentRefundEntity } from '../../payments/entities/payment-refund.entity';

export type DisputeReasonCode =
  | 'tutor_no_show'
  | 'poor_quality'
  | 'unfulfilled_hours'
  | 'curriculum_mismatch'
  | 'inappropriate_conduct'
  | 'billing_dispute'
  | 'other';

export type DisputeStatus =
  | 'opened'
  | 'under_review'
  | 'evidence_requested'
  | 'resolved_refund'
  | 'resolved_tutor_upheld'
  | 'resolved_partial_refund'
  | 'resolved_replacement'
  | 'dismissed';

export type DisputeResolutionType =
  'refund' | 'tutor_upheld' | 'partial_refund' | 'replacement' | 'dismissed';

export const OPEN_DISPUTE_STATUSES: readonly DisputeStatus[] = [
  'opened',
  'under_review',
  'evidence_requested',
];

export const RESOLVED_DISPUTE_STATUSES: readonly DisputeStatus[] = [
  'resolved_refund',
  'resolved_tutor_upheld',
  'resolved_partial_refund',
  'resolved_replacement',
  'dismissed',
];

@Entity('booking_disputes')
export class BookingDisputeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column('uuid', { name: 'disputed_by' })
  disputedBy!: string;

  @Column({ name: 'reason_code', type: 'text' })
  reasonCode!: DisputeReasonCode;

  @Column({ type: 'text' })
  description!: string;

  @Column('uuid', { array: true, name: 'evidence_asset_ids', default: () => "'{}'" })
  evidenceAssetIds!: string[];

  @Column({ name: 'disputed_amount_minor', type: 'bigint', nullable: true })
  disputedAmountMinor?: string | null;

  @Column({ type: 'text', default: 'opened' })
  status!: DisputeStatus;

  @Column('uuid', { name: 'assigned_to', nullable: true })
  assignedTo?: string | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes?: string | null;

  @Column({ name: 'resolution_type', type: 'text', nullable: true })
  resolutionType?: DisputeResolutionType | null;

  @Column('uuid', { name: 'refund_id', nullable: true })
  refundId?: string | null;

  @Column('uuid', { name: 'resolved_by', nullable: true })
  resolvedBy?: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;

  @Column({
    name: 'policy_version',
    type: 'text',
    default: 'v1.0-dispute-resolution',
  })
  policyVersion!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'disputed_by' })
  disputant?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedStaff?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver?: UserEntity;

  @ManyToOne(() => PaymentRefundEntity, { nullable: true })
  @JoinColumn({ name: 'refund_id' })
  refund?: PaymentRefundEntity;
}
