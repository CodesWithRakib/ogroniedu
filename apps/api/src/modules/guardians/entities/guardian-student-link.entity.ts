import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('guardian_student_links')
@Index('ix_guardian_links_student_status', ['studentUserId', 'status'])
export class GuardianStudentLinkEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'guardian_user_id' })
  guardianUserId!: string;

  @Column('uuid', { name: 'student_user_id' })
  studentUserId!: string;

  @Column({ name: 'relationship_type', type: 'text' })
  relationshipType!: 'father' | 'mother' | 'legal_guardian' | 'other';

  @Column({
    type: 'text',
    default: 'pending',
  })
  status!: 'pending' | 'active' | 'rejected' | 'revoked';

  @Column({ name: 'consent_policy_version', type: 'text', nullable: true })
  consentPolicyVersion!: string | null;

  @Column({ name: 'consent_recorded_at', type: 'timestamptz', nullable: true })
  consentRecordedAt!: Date | null;

  @Column('uuid', { name: 'verified_by', nullable: true })
  verifiedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guardian_user_id' })
  guardian?: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_user_id' })
  student?: UserEntity;
}
