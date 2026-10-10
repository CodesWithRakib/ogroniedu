import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

@Entity('ledger_accounts')
export class LedgerAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  code!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ name: 'account_type', type: 'text' })
  accountType!: AccountType;

  @Column({ type: 'char', length: 3, default: 'BDT' })
  currency!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
