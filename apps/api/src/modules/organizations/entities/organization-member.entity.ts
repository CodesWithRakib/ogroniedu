import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import type { OrganizationMemberRole, OrganizationMemberStatus } from '@ogroniedu/contracts';
import type { OrganizationEntity } from './organization.entity';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('organization_members')
@Unique('uq_organization_member', ['organizationId', 'userId'])
export class OrganizationMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('ix_organization_members_org_user')
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Index('ix_organization_members_user')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'text', default: 'tutor' })
  role!: OrganizationMemberRole;

  @Column({ type: 'text', default: 'active' })
  status!: OrganizationMemberStatus;

  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invitedBy?: string | null;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('OrganizationEntity', (org: OrganizationEntity) => org.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}
