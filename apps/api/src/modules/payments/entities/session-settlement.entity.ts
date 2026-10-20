import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type SettlementStatus = 'settled' | 'reversed';

/** One immutable settlement per completed session, bounded by its escrow hold. */
@Entity('session_settlements')
@Index('ix_session_settlements_tutor', ['tutorUserId', 'settledAt'])
@Index('ix_session_settlements_hold', ['escrowHoldId'])
export class SessionSettlementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'session_id' })
  sessionId!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column('uuid', { name: 'payment_order_id' })
  paymentOrderId!: string;

  @Column('uuid', { name: 'escrow_hold_id' })
  escrowHoldId!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ name: 'gross_amount_minor', type: 'bigint' })
  grossAmountMinor!: string | number;

  @Column({ name: 'platform_fee_minor', type: 'bigint' })
  platformFeeMinor!: string | number;

  @Column({ name: 'tutor_net_minor', type: 'bigint' })
  tutorNetMinor!: string | number;

  @Column({ name: 'commission_rate_bps', type: 'integer' })
  commissionRateBps!: number;

  @Column({ name: 'commission_policy_id', type: 'uuid', nullable: true })
  commissionPolicyId!: string | null;

  @Column({ type: 'char', length: 3, default: 'BDT' })
  currency!: string;

  @Column({ type: 'text', default: 'settled' })
  status!: SettlementStatus;

  @Column('uuid', { name: 'journal_id' })
  journalId!: string;

  @Column('uuid', { name: 'reversal_journal_id', nullable: true })
  reversalJournalId!: string | null;

  @Column('uuid', { name: 'settled_by' })
  settledBy!: string;

  @CreateDateColumn({ name: 'settled_at', type: 'timestamptz' })
  settledAt!: Date;

  @Column({ name: 'reversed_at', type: 'timestamptz', nullable: true })
  reversedAt!: Date | null;
}
