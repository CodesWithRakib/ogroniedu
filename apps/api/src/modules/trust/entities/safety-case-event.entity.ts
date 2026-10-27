import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import type { SafetyReportEntity } from './safety-report.entity';

export type CaseEventType =
  | 'submitted'
  | 'triaged'
  | 'assigned'
  | 'reassigned'
  | 'status_changed'
  | 'information_requested'
  | 'information_provided'
  | 'escalated'
  | 'safety_action_applied'
  | 'safety_action_revoked'
  | 'evidence_accessed'
  | 'resolved'
  | 'closed'
  | 'reopened';

@Entity('safety_case_events')
export class SafetyCaseEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'report_id' })
  reportId!: string;

  @Column('uuid', { name: 'actor_id' })
  actorId!: string;

  @Column({ name: 'event_type', type: 'text' })
  eventType!: CaseEventType;

  @Column({ name: 'from_status', type: 'text', nullable: true })
  fromStatus?: string | null;

  @Column({ name: 'to_status', type: 'text', nullable: true })
  toStatus?: string | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('SafetyReportEntity', (report: SafetyReportEntity) => report.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'report_id' })
  report?: SafetyReportEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'actor_id' })
  actor?: UserEntity;
}
