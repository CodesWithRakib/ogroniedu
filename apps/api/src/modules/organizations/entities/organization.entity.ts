import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import type { OrganizationType, OrganizationStatus } from '@ogroniedu/contracts';
import { OrganizationMemberEntity } from './organization-member.entity';
import { OrganizationInvitationEntity } from './organization-invitation.entity';

@Entity('organizations')
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Index('ix_organizations_slug', { unique: true })
  @Column({ type: 'text', unique: true })
  slug!: string;

  @Column({ type: 'text', default: 'coaching_center' })
  type!: OrganizationType;

  @Index('ix_organizations_status')
  @Column({ type: 'text', default: 'pending_approval' })
  status!: OrganizationStatus;

  @Index('ix_organizations_owner')
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @Column({ name: 'trade_license_number', type: 'text', nullable: true })
  tradeLicenseNumber?: string | null;

  @Column({ name: 'contact_email', type: 'text' })
  contactEmail!: string;

  @Column({ name: 'contact_phone', type: 'text', nullable: true })
  contactPhone?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'text', nullable: true })
  division?: string | null;

  @Column({ type: 'text', nullable: true })
  district?: string | null;

  @Column({ type: 'jsonb', default: {} })
  settings!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => OrganizationMemberEntity, (member) => member.organization)
  members?: OrganizationMemberEntity[];

  @OneToMany(() => OrganizationInvitationEntity, (invitation) => invitation.organization)
  invitations?: OrganizationInvitationEntity[];
}
