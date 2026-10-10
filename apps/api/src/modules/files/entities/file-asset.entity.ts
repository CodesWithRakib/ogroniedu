import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export type FileVisibility = 'private' | 'public_approved';
export type MalwareScanStatus = 'pending' | 'clean' | 'infected' | 'failed' | 'not_required';

@Entity('file_assets')
export class FileAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'owner_user_id', nullable: true })
  ownerUserId!: string | null;

  @Column({ name: 'storage_provider', type: 'text' })
  storageProvider!: string;

  @Column({ name: 'storage_key', type: 'text', unique: true })
  storageKey!: string;

  @Column({ name: 'original_filename', type: 'text', nullable: true })
  originalFilename!: string | null;

  @Column({ name: 'media_type', type: 'text' })
  mediaType!: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes!: string | number;

  @Column({ name: 'checksum_sha256', type: 'text', nullable: true })
  checksumSha256!: string | null;

  @Column({ type: 'text', default: 'private' })
  visibility!: FileVisibility;

  @Column({ type: 'text' })
  purpose!: string;

  @Column({ name: 'malware_scan_status', type: 'text', default: 'clean' })
  malwareScanStatus!: MalwareScanStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
