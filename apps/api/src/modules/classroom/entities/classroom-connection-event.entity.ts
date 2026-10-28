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
import type { ClassroomSessionEntity } from './classroom-session.entity';

@Entity('classroom_connection_events')
@Index('ix_classroom_events_session_time', ['classroomSessionId', 'eventTimestamp'])
export class ClassroomConnectionEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'classroom_session_id' })
  classroomSessionId!: string;

  @Column('uuid', { name: 'user_id', nullable: true })
  userId!: string | null;

  @Column({ name: 'participant_identity', type: 'varchar', length: 128 })
  participantIdentity!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType!: string;

  @Column({ name: 'event_timestamp', type: 'timestamptz' })
  eventTimestamp!: Date;

  @Column({ name: 'livekit_event_id', type: 'varchar', length: 128, nullable: true, unique: true })
  livekitEventId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(
    'ClassroomSessionEntity',
    (session: ClassroomSessionEntity) => session.connectionEvents,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'classroom_session_id' })
  classroomSession?: ClassroomSessionEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity | null;
}
