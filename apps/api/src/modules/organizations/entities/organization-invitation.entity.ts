import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { OrganizationInvitationStatus } from '@ogroniedu/contracts';
import type { OrganizationEntity } from './organization.entity';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('organization_invitations')
export class OrganizationInvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('ix_organization_invitations_email')
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'text' })
  email!: string;

  @Column({ type: 'text', default: 'tutor' })
  role!: 'admin' | 'staff' | 'tutor';

  @Column({ name: 'invited_by_user_id', type: 'uuid' })
  invitedByUserId!: string;

  @Index('ix_organization_invitations_token', { unique: true })
  @Column({ type: 'text', unique: true })
  token!: string;

  @Column({ type: 'text', default: 'pending' })
  status!: OrganizationInvitationStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('OrganizationEntity', (org: OrganizationEntity) => org.invitations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invited_by_user_id' })
  invitedByUser?: UserEntity;
}
