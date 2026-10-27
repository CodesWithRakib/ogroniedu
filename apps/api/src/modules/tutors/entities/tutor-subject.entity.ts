import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { TutorProfileEntity } from './tutor-profile.entity';

@Entity('tutor_subjects')
export class TutorSubjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column('uuid', { name: 'subject_id' })
  subjectId!: string;

  @Column('uuid', { name: 'education_level_id' })
  educationLevelId!: string;

  @Column('uuid', { name: 'curriculum_id', nullable: true })
  curriculumId!: string | null;

  @Column({ type: 'text', nullable: true })
  stream!: string | null;

  @Column({ name: 'rate_minor', type: 'bigint', nullable: true })
  rateMinor!: string | null;

  @Column({ type: 'char', length: 3, default: 'BDT' })
  currency!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('TutorProfileEntity', (t: TutorProfileEntity) => t.subjects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;
}
