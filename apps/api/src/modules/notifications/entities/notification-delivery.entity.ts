import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('notification_deliveries')
export class NotificationDeliveryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'notification_id', type: 'uuid' })
  notificationId!: string;

  @Column({ type: 'text' })
  channel!: string; // 'in_app', 'email', 'sms', 'push', 'whatsapp'

  @Column({ type: 'text', nullable: true })
  provider!: string | null;

  @Column({ name: 'provider_message_id', type: 'text', nullable: true })
  providerMessageId!: string | null;

  @Column({ type: 'text', default: 'delivered' })
  status!: string; // 'queued', 'sent', 'delivered', 'failed', 'suppressed'

  @Column({ type: 'integer', default: 1 })
  attempts!: number;

  @Column({ name: 'last_error_code', type: 'text', nullable: true })
  lastErrorCode!: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
