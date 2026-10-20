import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type EscrowHoldStatus =
  | 'held'
  | 'partially_released'
  | 'released'
  | 'partially_refunded'
  | 'refunded'
  | 'closed';

/**
 * Funds actually received for one payment order. Settlement and refunds consume
 * this row, so a tutor can never be credited more than the customer paid and a
 * refund can never exceed the unspent balance.
 */
@Entity('escrow_holds')
@Index('ix_escrow_holds_booking', ['bookingId', 'createdAt'])
@Index('ix_escrow_holds_tutor', ['tutorUserId', 'status'])
export class EscrowHoldEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'payment_order_id' })
  paymentOrderId!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column('uuid', { name: 'payer_user_id' })
  payerUserId!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ name: 'amount_minor', type: 'bigint' })
  amountMinor!: string | number;

  @Column({ name: 'released_minor', type: 'bigint', default: 0 })
  releasedMinor!: string | number;

  @Column({ name: 'refunded_minor', type: 'bigint', default: 0 })
  refundedMinor!: string | number;

  @Column({ type: 'char', length: 3, default: 'BDT' })
  currency!: string;

  @Column({ name: 'commission_rate_bps', type: 'integer' })
  commissionRateBps!: number;

  @Column({ name: 'commission_policy_id', type: 'uuid', nullable: true })
  commissionPolicyId!: string | null;

  @Column({ type: 'text', default: 'held' })
  status!: EscrowHoldStatus;

  @Column({ name: 'held_at', type: 'timestamptz' })
  heldAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
