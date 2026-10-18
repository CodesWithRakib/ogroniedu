import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import type { ReplacementStatus } from './tutor-replacement-case.entity';

export type ReplacementActorRole = 'student' | 'guardian' | 'admin' | 'super_admin' | 'system';

/**
 * Append-only case history. `userVisibleNote` may be shown to the case owner;
 * `internalNote` is reviewer-only and must never be serialized to applicants
 * or public endpoints.
 */
@Entity('tutor_replacement_case_events')
export class TutorReplacementCaseEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'case_id' })
  caseId!: string;

  @Column('uuid', { name: 'actor_user_id', nullable: true })
  actorUserId!: string | null;

  @Column({ name: 'actor_role', type: 'text', default: 'system' })
  actorRole!: ReplacementActorRole;

  @Column({ name: 'event_type', type: 'text' })
  eventType!: string;

  @Column({ name: 'from_status', type: 'text', nullable: true })
  fromStatus!: ReplacementStatus | null;

  @Column({ name: 'to_status', type: 'text', nullable: true })
  toStatus!: ReplacementStatus | null;

  @Column({ name: 'user_visible_note', type: 'text', nullable: true })
  userVisibleNote!: string | null;

  @Column({ name: 'internal_note', type: 'text', nullable: true })
  internalNote!: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
