import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type ReconciliationStatus =
  | 'running'
  | 'reconciled'
  | 'discrepancy_detected'
  | 'failed';

/** Durable record of a reconciliation execution (not just a live computation). */
@Entity('reconciliation_runs')
@Index('ix_reconciliation_runs_started', ['startedAt'])
export class ReconciliationRunEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  status!: ReconciliationStatus;

  @Column('uuid', { name: 'run_by', nullable: true })
  runBy!: string | null;

  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @Column({ name: 'orders_checked', type: 'integer', default: 0 })
  ordersChecked!: number;

  @Column({ name: 'transactions_checked', type: 'integer', default: 0 })
  transactionsChecked!: number;

  @Column({ name: 'refunds_checked', type: 'integer', default: 0 })
  refundsChecked!: number;

  @Column({ name: 'payouts_checked', type: 'integer', default: 0 })
  payoutsChecked!: number;

  @Column({ name: 'discrepancy_count', type: 'integer', default: 0 })
  discrepancyCount!: number;

  @Column({ name: 'ledger_total_debits_minor', type: 'bigint', default: 0 })
  ledgerTotalDebitsMinor!: string | number;

  @Column({ name: 'ledger_total_credits_minor', type: 'bigint', default: 0 })
  ledgerTotalCreditsMinor!: string | number;

  @Column({ type: 'jsonb', default: {} })
  details!: Record<string, unknown>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;
}
