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
import type { PaymentOrderEntity } from './payment-order.entity';
import { UserEntity } from '../../auth/entities/user.entity';

export type RefundStatus =
  'requested' | 'approved' | 'processing' | 'succeeded' | 'failed' | 'rejected';

@Entity('payment_refunds')
@Index('ix_payment_refunds_order', ['paymentOrderId', 'createdAt'])
export class PaymentRefundEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'payment_order_id' })
  paymentOrderId!: string;

  @Column({ name: 'amount_minor', type: 'bigint' })
  amountMinor!: string | number;

  @Column({ type: 'char', length: 3, default: 'BDT' })
  currency!: string;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'text', default: 'requested' })
  status!: RefundStatus;

  @Column({ name: 'provider_refund_id', type: 'text', nullable: true })
  providerRefundId!: string | null;

  @Column({ name: 'refund_number', type: 'text', nullable: true })
  refundNumber!: string | null;

  @Column('uuid', { name: 'booking_id', nullable: true })
  bookingId!: string | null;

  @Column({ name: 'initiated_by_role', type: 'text', nullable: true })
  initiatedByRole!: string | null;

  @Column('uuid', { name: 'decided_by', nullable: true })
  decidedBy!: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt!: Date | null;

  @Column({ name: 'decision_note', type: 'text', nullable: true })
  decisionNote!: string | null;

  @Column({ name: 'provider_status', type: 'text', nullable: true })
  providerStatus!: string | null;

  @Column({ name: 'provider_reference', type: 'text', nullable: true })
  providerReference!: string | null;

  @Column({ name: 'provider_confirmed_at', type: 'timestamptz', nullable: true })
  providerConfirmedAt!: Date | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ name: 'eligibility_snapshot', type: 'jsonb', default: {} })
  eligibilitySnapshot!: Record<string, unknown>;

  @Column('uuid', { name: 'ledger_journal_id', nullable: true })
  ledgerJournalId!: string | null;

  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey!: string | null;

  @Column('uuid', { name: 'requested_by' })
  requestedBy!: string;

  @Column('uuid', { name: 'processed_by', nullable: true })
  processedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('PaymentOrderEntity', (o: PaymentOrderEntity) => o.refunds, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_order_id' })
  paymentOrder?: PaymentOrderEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'requested_by' })
  requestedByUser?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'processed_by' })
  processedByUser?: UserEntity;
}
