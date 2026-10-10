import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { LedgerEntryEntity } from './ledger-entry.entity';

@Entity('ledger_journals')
@Index('ix_ledger_journals_idempotency', ['idempotencyKey'], { unique: true })
@Index('ix_ledger_journals_source', ['sourceType', 'sourceId'])
export class LedgerJournalEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'source_type', type: 'text' })
  sourceType!: string;

  @Column('uuid', { name: 'source_id' })
  sourceId!: string;

  @Column({ name: 'idempotency_key', type: 'text', unique: true })
  idempotencyKey!: string;

  @Column({ type: 'text' })
  description!: string;

  @CreateDateColumn({ name: 'posted_at', type: 'timestamptz' })
  postedAt!: Date;

  @Column('uuid', { name: 'created_by', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: UserEntity;

  @OneToMany(() => LedgerEntryEntity, (e) => e.journal, { cascade: true })
  entries?: LedgerEntryEntity[];
}
