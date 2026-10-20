import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { SafetyReportEntity } from './safety-report.entity';

@Entity('safety_case_messages')
export class SafetyCaseMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'report_id' })
  reportId!: string;

  @Column('uuid', { name: 'sender_id' })
  senderId!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'is_internal_note', type: 'boolean', default: false })
  isInternalNote!: boolean;

  @Column('uuid', { array: true, name: 'attachment_asset_ids', default: () => "'{}'" })
  attachmentAssetIds!: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => SafetyReportEntity, (report) => report.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report?: SafetyReportEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'sender_id' })
  sender?: UserEntity;
}
