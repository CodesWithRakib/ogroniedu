import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type PayoutStatus =
  'requested' | 'approved' | 'processing' | 'paid' | 'rejected' | 'cancelled' | 'failed';

export type PayoutMethod = 'bkash' | 'nagad' | 'rocket' | 'bank' | 'other';

/**
 * Tutor payout lifecycle. No provider disbursement API exists, so `mark-paid`
 * requires an operator-supplied external reference; the system never invents
 * one or reports a transfer it did not observe.
 */
@Entity('payouts')
@Unique('ux_payouts_tutor_idempotency', ['tutorUserId', 'idempotencyKey'])
@Index('ix_payouts_tutor', ['tutorUserId', 'createdAt'])
@Index('ix_payouts_status', ['status', 'createdAt'])
export class PayoutEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'payout_number', type: 'text' })
  payoutNumber!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ name: 'amount_minor', type: 'bigint' })
  amountMinor!: string | number;

  @Column({ type: 'char', length: 3, default: 'BDT' })
  currency!: string;

  @Column({ type: 'text', default: 'requested' })
  status!: PayoutStatus;

  @Column({ type: 'text' })
  method!: PayoutMethod;

  @Column({ name: 'account_reference_masked', type: 'text' })
  accountReferenceMasked!: string;

  @Column({ name: 'account_reference_hash', type: 'text' })
  accountReferenceHash!: string;

  @Column('uuid', { name: 'requested_by' })
  requestedBy!: string;

  @Column('uuid', { name: 'reviewed_by', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'decision_note', type: 'text', nullable: true })
  decisionNote!: string | null;

  @Column({ name: 'external_reference', type: 'text', nullable: true })
  externalReference!: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column('uuid', { name: 'paid_by', nullable: true })
  paidBy!: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ name: 'idempotency_key', type: 'text' })
  idempotencyKey!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
