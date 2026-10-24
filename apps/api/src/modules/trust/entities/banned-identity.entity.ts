import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('banned_identities')
export class BannedIdentityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'banned_user_id', nullable: true })
  bannedUserId?: string | null;

  @Index('idx_banned_identities_phone')
  @Column({ name: 'phone_e164', type: 'varchar', length: 30, nullable: true })
  phoneE164?: string | null;

  @Index('idx_banned_identities_email')
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Index('idx_banned_identities_nid')
  @Column({ name: 'nid_number', type: 'varchar', length: 100, nullable: true })
  nidNumber?: string | null;

  @Index('idx_banned_identities_doc_hash')
  @Column({ name: 'document_hash', type: 'varchar', length: 255, nullable: true })
  documentHash?: string | null;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'varchar', length: 30, default: 'permanent' })
  severity!: string;

  @Column('uuid', { name: 'banned_by', nullable: true })
  bannedBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
