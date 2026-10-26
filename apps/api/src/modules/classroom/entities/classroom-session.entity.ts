import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import type { ClassroomMode, ClassroomSessionStatus } from '@ogroniedu/contracts';
import { ClassroomAttendanceRecordEntity } from './classroom-attendance-record.entity';
import { ClassroomConnectionEventEntity } from './classroom-connection-event.entity';

@Entity('classroom_sessions')
@Index('ix_classroom_sessions_room_name', ['roomName'], { unique: true })
@Index('ix_classroom_sessions_booking_session', ['bookingSessionId'])
@Index('ix_classroom_sessions_host_status', ['hostUserId', 'status'])
export class ClassroomSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'room_name', type: 'varchar', length: 128, unique: true })
  roomName!: string;

  @Column({ type: 'varchar', length: 32, default: 'SMALL_GROUP' })
  mode!: ClassroomMode;

  @Column({ type: 'varchar', length: 32, default: 'SCHEDULED' })
  status!: ClassroomSessionStatus;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column('uuid', { name: 'booking_session_id', nullable: true })
  bookingSessionId!: string | null;

  @Column('uuid', { name: 'booking_id', nullable: true })
  bookingId!: string | null;

  @Column('uuid', { name: 'batch_id', nullable: true })
  batchId!: string | null;

  @Column('uuid', { name: 'host_user_id' })
  hostUserId!: string;

  @Column({ name: 'max_participants', type: 'integer', default: 6 })
  maxParticipants!: number;

  @Column({ name: 'is_recording_enabled', type: 'boolean', default: false })
  isRecordingEnabled!: boolean;

  @Column({ name: 'recording_status', type: 'varchar', length: 32, default: 'none' })
  recordingStatus!: string;

  @Column({ name: 'recording_metadata', type: 'jsonb', nullable: true })
  recordingMetadata!: Record<string, unknown> | null;

  @Column({ name: 'livekit_room_sid', type: 'varchar', length: 128, nullable: true })
  livekitRoomSid!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_user_id' })
  hostUser?: UserEntity;

  @ManyToOne(() => BookingSessionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'booking_session_id' })
  bookingSession?: BookingSessionEntity | null;

  @ManyToOne(() => BookingEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity | null;

  @OneToMany(() => ClassroomAttendanceRecordEntity, (record) => record.classroomSession)
  attendanceRecords?: ClassroomAttendanceRecordEntity[];

  @OneToMany(() => ClassroomConnectionEventEntity, (event) => event.classroomSession)
  connectionEvents?: ClassroomConnectionEventEntity[];
}
