import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { UserEntity } from '../../auth/entities/user.entity';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

@Entity('session_attendance')
@Unique(['sessionId', 'participantUserId'])
export class SessionAttendanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'session_id' })
  sessionId!: string;

  @Column('uuid', { name: 'participant_user_id' })
  participantUserId!: string;

  @Column({ name: 'attendance_status', type: 'text' })
  attendanceStatus!: AttendanceStatus;

  @Column('uuid', { name: 'recorded_by' })
  recordedBy!: string;

  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt!: Date;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'correction_reason', type: 'text', nullable: true })
  correctionReason!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => BookingSessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session?: BookingSessionEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'participant_user_id' })
  participantUser?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'recorded_by' })
  recordedByUser?: UserEntity;
}
