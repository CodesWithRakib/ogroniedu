import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { PaymentOrderEntity } from './payment-order.entity';

export type PaymentTransactionStatus = 'pending' | 'succeeded' | 'failed' | 'reversed';

@Entity('payment_transactions')
@Unique(['provider', 'providerTransactionId'])
@Unique(['provider', 'providerEventId'])
@Index('ix_payment_transactions_order', ['paymentOrderId'])
export class PaymentTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'payment_order_id' })
  paymentOrderId!: string;

  @Column({ type: 'text' })
  provider!: string;

  @Column({ name: 'provider_transaction_id', type: 'text', nullable: true })
  providerTransactionId!: string | null;

  @Column({ name: 'provider_event_id', type: 'text', nullable: true })
  providerEventId!: string | null;

  @Column({ name: 'amount_minor', type: 'bigint' })
  amountMinor!: string | number;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ type: 'text' })
  status!: PaymentTransactionStatus;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @Column({ name: 'raw_payload_redacted', type: 'jsonb', default: {} })
  rawPayloadRedacted!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => PaymentOrderEntity, (o) => o.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_order_id' })
  paymentOrder?: PaymentOrderEntity;
}
