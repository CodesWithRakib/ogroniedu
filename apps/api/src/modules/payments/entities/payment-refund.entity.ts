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
import { PaymentOrderEntity } from './payment-order.entity';
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

  @Column('uuid', { name: 'requested_by' })
  requestedBy!: string;

  @Column('uuid', { name: 'processed_by', nullable: true })
  processedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => PaymentOrderEntity, (o) => o.refunds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_order_id' })
  paymentOrder?: PaymentOrderEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'requested_by' })
  requestedByUser?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'processed_by' })
  processedByUser?: UserEntity;
}
