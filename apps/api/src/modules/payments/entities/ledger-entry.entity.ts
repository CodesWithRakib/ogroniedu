import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LedgerJournalEntity } from './ledger-journal.entity';
import { LedgerAccountEntity } from './ledger-account.entity';

export type LedgerDirection = 'debit' | 'credit';

@Entity('ledger_entries')
@Index('ix_ledger_entries_journal', ['journalId'])
@Index('ix_ledger_entries_account_created', ['accountId', 'createdAt'])
export class LedgerEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'journal_id' })
  journalId!: string;

  @Column('uuid', { name: 'account_id' })
  accountId!: string;

  @Column({ type: 'text' })
  direction!: LedgerDirection;

  @Column({ name: 'amount_minor', type: 'bigint' })
  amountMinor!: string | number;

  @Column({ type: 'char', length: 3, default: 'BDT' })
  currency!: string;

  /**
   * Optional party dimension. Tutor payable (account 2000) is attributed to a
   * tutor so balances can be derived from the ledger instead of a mutable
   * wallet column.
   */
  @Column('uuid', { name: 'tutor_user_id', nullable: true })
  tutorUserId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => LedgerJournalEntity, (j) => j.entries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journal_id' })
  journal?: LedgerJournalEntity;

  @ManyToOne(() => LedgerAccountEntity)
  @JoinColumn({ name: 'account_id' })
  account?: LedgerAccountEntity;
}
