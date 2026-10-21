import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'actor_user_id', nullable: true })
  actorUserId!: string | null;

  @Column({ type: 'text' })
  action!: string;

  @Index('ix_audit_resource_created')
  @Column({ name: 'resource_type', type: 'text' })
  resourceType!: string;

  @Column({ name: 'resource_id', type: 'text', nullable: true })
  resourceId!: string | null;

  @Index('ix_audit_logs_organization')
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null;

  @Column({ name: 'request_id', type: 'text', nullable: true })
  requestId!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'safe_metadata', type: 'jsonb', default: () => "'{}'::jsonb" })
  safeMetadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
