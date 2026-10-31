import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { TutorProfileEntity } from '../../tutors/entities/tutor-profile.entity';
import { CurriculumEntity } from '../../taxonomy/entities/curriculum.entity';
import { EducationLevelEntity } from '../../taxonomy/entities/education-level.entity';
import { StreamEntity } from '../../taxonomy/entities/stream.entity';
import { SubjectEntity } from '../../taxonomy/entities/subject.entity';
import { TuitionRequestSuggestionEntity } from './tuition-request-suggestion.entity';
import { TuitionRequestApplicationEntity } from './tuition-request-application.entity';

export type TuitionLearningMode = 'in_person' | 'online' | 'hybrid';
export type TuitionRequestStatus =
  | 'open'
  | 'matched'
  | 'demo_scheduled'
  | 'confirmed'
  | 'cancelled'
  | 'closed';

@Entity('tuition_requests')
export class TuitionRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'request_reference', type: 'text' })
  requestReference!: string;

  @Column('uuid', { name: 'guardian_user_id' })
  guardianUserId!: string;

  @Column('uuid', { name: 'student_user_id', nullable: true })
  studentUserId!: string | null;

  @Column({ name: 'student_name', type: 'text' })
  studentName!: string;

  @Column({ name: 'student_gender', type: 'text', default: 'any' })
  studentGender!: 'male' | 'female' | 'any';

  @Column({ name: 'institution_name', type: 'text', nullable: true })
  institutionName!: string | null;

  @Column('uuid', { name: 'curriculum_id', nullable: true })
  curriculumId!: string | null;

  @Column('uuid', { name: 'education_level_id', nullable: true })
  educationLevelId!: string | null;

  @Column('uuid', { name: 'stream_id', nullable: true })
  streamId!: string | null;

  @Column({ name: 'learning_mode', type: 'text' })
  learningMode!: TuitionLearningMode;

  @Column({ type: 'text', nullable: true })
  division!: string | null;

  @Column({ type: 'text', nullable: true })
  district!: string | null;

  @Column({ type: 'text', nullable: true })
  area!: string | null;

  @Column({ name: 'address_details', type: 'text', nullable: true })
  addressDetails!: string | null;

  @Column({ name: 'days_per_week', type: 'integer', nullable: true })
  daysPerWeek!: number | null;

  @Column('text', { name: 'preferred_days', array: true, default: '{}' })
  preferredDays!: string[];

  @Column({ name: 'preferred_time', type: 'text', nullable: true })
  preferredTime!: string | null;

  @Column({ name: 'salary_budget_min', type: 'bigint', nullable: true })
  salaryBudgetMin!: string | number | null;

  @Column({ name: 'salary_budget_max', type: 'bigint', nullable: true })
  salaryBudgetMax!: string | number | null;

  @Column({ name: 'salary_type', type: 'text', default: 'monthly' })
  salaryType!: 'monthly' | 'per_session';

  @Column({ type: 'char', length: 3, default: 'BDT' })
  currency!: string;

  @Column({ name: 'preferred_tutor_gender', type: 'text', default: 'any' })
  preferredTutorGender!: 'male' | 'female' | 'any';

  @Column({ name: 'preferred_tutor_background', type: 'text', nullable: true })
  preferredTutorBackground!: string | null;

  @Column({ name: 'requirements_notes', type: 'text', nullable: true })
  requirementsNotes!: string | null;

  @Column({ type: 'text', default: 'open' })
  status!: TuitionRequestStatus;

  @Column({ name: 'is_vip', type: 'boolean', default: false })
  isVip!: boolean;

  @Column('uuid', { name: 'assigned_tutor_user_id', nullable: true })
  assignedTutorUserId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guardian_user_id' })
  guardianUser?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'student_user_id' })
  studentUser?: UserEntity | null;

  @ManyToOne(() => CurriculumEntity, { nullable: true })
  @JoinColumn({ name: 'curriculum_id' })
  curriculum?: CurriculumEntity | null;

  @ManyToOne(() => EducationLevelEntity, { nullable: true })
  @JoinColumn({ name: 'education_level_id' })
  educationLevel?: EducationLevelEntity | null;

  @ManyToOne(() => StreamEntity, { nullable: true })
  @JoinColumn({ name: 'stream_id' })
  stream?: StreamEntity | null;

  @ManyToOne(() => TutorProfileEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_tutor_user_id' })
  assignedTutor?: TutorProfileEntity | null;

  @ManyToMany(() => SubjectEntity)
  @JoinTable({
    name: 'tuition_request_subjects',
    joinColumn: { name: 'request_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'subject_id', referencedColumnName: 'id' },
  })
  subjects?: SubjectEntity[];

  @OneToMany(() => TuitionRequestSuggestionEntity, (s) => s.request)
  suggestions?: TuitionRequestSuggestionEntity[];

  @OneToMany(() => TuitionRequestApplicationEntity, (a) => a.request)
  applications?: TuitionRequestApplicationEntity[];
}
