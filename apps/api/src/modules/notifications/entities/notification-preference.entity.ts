import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

export type NotificationCategoryType =
  'booking' | 'schedule' | 'payment' | 'learning' | 'system' | 'marketing';

export type NotificationChannelType = 'in_app' | 'email' | 'sms' | 'push' | 'whatsapp';

@Entity('notification_preferences')
@Unique('uq_notification_preferences', ['userId', 'category', 'channel'])
export class NotificationPreferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_notif_prefs_user')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  category!: NotificationCategoryType;

  @Column({ type: 'varchar', length: 20 })
  channel!: NotificationChannelType;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
