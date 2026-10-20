import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Serialization row for tutor payouts. Payout requests lock this row with
 * `FOR UPDATE` before computing availability, which prevents two concurrent
 * requests from both spending the same tutor payable balance.
 */
@Entity('tutor_financial_accounts')
export class TutorFinancialAccountEntity {
  @PrimaryColumn('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ type: 'char', length: 3, default: 'BDT' })
  currency!: string;

  @Column({ name: 'reserved_minor', type: 'bigint', default: 0 })
  reservedMinor!: string | number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
