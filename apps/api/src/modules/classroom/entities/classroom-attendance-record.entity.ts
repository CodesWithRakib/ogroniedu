import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import type { ClassroomRole } from '@ogroniedu/contracts';
import { ClassroomSessionEntity } from './classroom-session.entity';

@Entity('classroom_attendance_records')
@Unique('uq_classroom_attendee', ['classroomSessionId', 'userId'])
@Index('ix_classroom_attendee_session', ['classroomSessionId'])
@Index('ix_classroom_attendee_identity', ['classroomSessionId', 'participantIdentity'])
export class ClassroomAttendanceRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'classroom_session_id' })
  classroomSessionId!: string;

  @Column('uuid', { name: 'user_id' })
  userId!: string;

  @Column({ name: 'participant_identity', type: 'varchar', length: 128 })
  participantIdentity!: string;

  @Column({ name: 'participant_name', type: 'varchar', length: 255 })
  participantName!: string;

  @Column({ type: 'varchar', length: 32, default: 'STUDENT' })
  role!: ClassroomRole;

  @Column({ name: 'first_joined_at', type: 'timestamptz', nullable: true })
  firstJoinedAt!: Date | null;

  @Column({ name: 'last_left_at', type: 'timestamptz', nullable: true })
  lastLeftAt!: Date | null;

  @Column({ name: 'total_duration_seconds', type: 'integer', default: 0 })
  totalDurationSeconds!: number;

  @Column({ name: 'connection_status', type: 'varchar', length: 32, default: 'DISCONNECTED' })
  connectionStatus!: 'CONNECTED' | 'DISCONNECTED';

  @Column({ name: 'reconnection_count', type: 'integer', default: 0 })
  reconnectionCount!: number;

  @Column({ name: 'is_hand_raised', type: 'boolean', default: false })
  isHandRaised!: boolean;

  @Column({ name: 'hand_raised_at', type: 'timestamptz', nullable: true })
  handRaisedAt!: Date | null;

  @Column({ name: 'is_stage_promoted', type: 'boolean', default: false })
  isStagePromoted!: boolean;

  @Column({ name: 'stage_promoted_at', type: 'timestamptz', nullable: true })
  stagePromotedAt!: Date | null;

  @Column({ name: 'device_info', type: 'jsonb', nullable: true })
  deviceInfo!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => ClassroomSessionEntity, (session) => session.attendanceRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classroom_session_id' })
  classroomSession?: ClassroomSessionEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}
