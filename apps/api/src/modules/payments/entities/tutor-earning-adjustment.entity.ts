import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type AdjustmentDirection = 'credit' | 'debit';

/** Audited correction to a tutor's earnings; never edits an existing settlement. */
@Entity('tutor_earning_adjustments')
@Index('ix_tutor_adjustments_tutor', ['tutorUserId', 'createdAt'])
export class TutorEarningAdjustmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column('uuid', { name: 'payment_order_id', nullable: true })
  paymentOrderId!: string | null;

  @Column('uuid', { name: 'session_id', nullable: true })
  sessionId!: string | null;

  @Column({ name: 'amount_minor', type: 'bigint' })
  amountMinor!: string | number;

  @Column({ type: 'text' })
  direction!: AdjustmentDirection;

  @Column({ type: 'text' })
  reason!: string;

  @Column('uuid', { name: 'journal_id', nullable: true })
  journalId!: string | null;

  @Column('uuid', { name: 'created_by' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
