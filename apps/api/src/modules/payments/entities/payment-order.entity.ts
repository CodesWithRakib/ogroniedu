import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { PaymentTransactionEntity } from './payment-transaction.entity';
import { PaymentRefundEntity } from './payment-refund.entity';

export type PaymentOrderStatus =
  'created' | 'pending' | 'succeeded' | 'failed' | 'expired' | 'cancelled';

@Entity('payment_orders')
@Unique(['payerUserId', 'idempotencyKey'])
@Index('ix_payment_orders_booking', ['bookingId'])
export class PaymentOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_reference', type: 'text', nullable: true })
  orderReference!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column('uuid', { name: 'payer_user_id' })
  payerUserId!: string;

  @Column({ name: 'amount_minor', type: 'bigint' })
  amountMinor!: string | number;

  @Column({ type: 'char', length: 3, default: 'BDT' })
  currency!: string;

  @Column({ type: 'text', default: 'created' })
  status!: PaymentOrderStatus;

  @Column({ name: 'idempotency_key', type: 'text' })
  idempotencyKey!: string;

  @Column({ type: 'text' })
  provider!: string;

  /** Commission snapshot taken when the order is created (basis points). */
  @Column({ name: 'commission_rate_bps', type: 'integer', default: 800 })
  commissionRateBps!: number;

  @Column({ name: 'commission_policy_id', type: 'uuid', nullable: true })
  commissionPolicyId!: string | null;

  /** Provider session/checkout reference used for server-side status sync. */
  @Column({ name: 'provider_reference', type: 'text', nullable: true })
  providerReference!: string | null;

  @Column({ name: 'escrow_hold_id', type: 'uuid', nullable: true })
  escrowHoldId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => BookingEntity)
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'payer_user_id' })
  payerUser?: UserEntity;

  @OneToMany(() => PaymentTransactionEntity, (t) => t.paymentOrder)
  transactions?: PaymentTransactionEntity[];

  @OneToMany(() => PaymentRefundEntity, (r) => r.paymentOrder)
  refunds?: PaymentRefundEntity[];
}
