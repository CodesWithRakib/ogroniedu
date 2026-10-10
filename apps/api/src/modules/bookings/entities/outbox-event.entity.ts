import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('outbox_events')
@Index('ix_outbox_pending', ['createdAt'])
export class OutboxEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_type', type: 'text' })
  eventType!: string;

  @Column({ name: 'aggregate_type', type: 'text' })
  aggregateType!: string;

  @Column('uuid', { name: 'aggregate_id' })
  aggregateId!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error_code', type: 'text', nullable: true })
  lastErrorCode!: string | null;
}
