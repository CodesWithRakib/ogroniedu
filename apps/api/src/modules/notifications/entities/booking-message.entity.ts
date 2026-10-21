import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';

@Entity('booking_messages')
export class BookingMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_booking_messages_booking')
  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity;

  @Column({ name: 'sender_user_id', type: 'uuid' })
  senderUserId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_user_id' })
  senderUser?: UserEntity;

  @Index('idx_booking_messages_recipient')
  @Column({ name: 'recipient_user_id', type: 'uuid' })
  recipientUserId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser?: UserEntity;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'is_redacted', type: 'boolean', default: false })
  isRedacted!: boolean;

  @Column({ name: 'redaction_reason', type: 'text', nullable: true })
  redactionReason?: string | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date | null;

  @Column('uuid', { array: true, name: 'attachment_asset_ids', default: () => "'{}'" })
  attachmentAssetIds!: string[];

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'" })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
