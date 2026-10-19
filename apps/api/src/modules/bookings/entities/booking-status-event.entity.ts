import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BookingEntity } from './booking.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import type { BookingStatus } from '../enums/booking-status.enum';

/** Append-only record of every booking status transition (actor + reason). */
@Entity('booking_status_events')
@Index('ix_booking_status_events_booking', ['bookingId', 'createdAt'])
export class BookingStatusEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column({ name: 'from_status', type: 'text', nullable: true })
  fromStatus!: BookingStatus | null;

  @Column({ name: 'to_status', type: 'text' })
  toStatus!: BookingStatus;

  @Column('uuid', { name: 'actor_user_id', nullable: true })
  actorUserId!: string | null;

  @Column({ name: 'actor_role', type: 'text', nullable: true })
  actorRole!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'safe_metadata', type: 'jsonb', default: {} })
  safeMetadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser?: UserEntity | null;
}
