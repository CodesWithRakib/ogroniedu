import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TuitionRequestEntity } from './tuition-request.entity';
import { TutorProfileEntity } from '../../tutors/entities/tutor-profile.entity';

export type ApplicationStatus =
  | 'pending'
  | 'shortlisted_by_admin'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

@Entity('tuition_request_applications')
export class TuitionRequestApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'request_id' })
  requestId!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ name: 'cover_pitch', type: 'text' })
  coverPitch!: string;

  @Column({ name: 'proposed_salary', type: 'bigint', nullable: true })
  proposedSalary!: string | number | null;

  @Column('text', { name: 'available_days', array: true, default: '{}' })
  availableDays!: string[];

  @Column({ type: 'text', default: 'pending' })
  status!: ApplicationStatus;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => TuitionRequestEntity, (r) => r.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request?: TuitionRequestEntity;

  @ManyToOne(() => TutorProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;
}
