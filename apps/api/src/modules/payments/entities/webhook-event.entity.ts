import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type WebhookEventStatus =
  | 'received'
  | 'processed'
  | 'duplicate'
  | 'rejected'
  | 'failed';

/**
 * Durable provider event log. The unique (provider, provider_event_id) index is
 * the idempotency boundary: two concurrent deliveries can never both process.
 */
@Entity('webhook_events')
@Unique('ux_webhook_events_provider_event', ['provider', 'providerEventId'])
@Index('ix_webhook_events_order', ['paymentOrderId', 'receivedAt'])
@Index('ix_webhook_events_status', ['status', 'receivedAt'])
export class WebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  provider!: string;

  @Column({ name: 'provider_event_id', type: 'text' })
  providerEventId!: string;

  @Column({ name: 'event_type', type: 'text' })
  eventType!: string;

  @Column({ name: 'signature_valid', type: 'boolean', default: false })
  signatureValid!: boolean;

  @Column({ name: 'payload_hash', type: 'text' })
  payloadHash!: string;

  @Column({ name: 'payload_redacted', type: 'jsonb', default: {} })
  payloadRedacted!: Record<string, unknown>;

  @Column({ type: 'text', default: 'received' })
  status!: WebhookEventStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'payment_order_id', type: 'uuid', nullable: true })
  paymentOrderId!: string | null;

  @CreateDateColumn({ name: 'received_at', type: 'timestamptz' })
  receivedAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;
}
