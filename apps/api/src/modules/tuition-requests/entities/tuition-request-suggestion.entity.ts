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
import { UserEntity } from '../../auth/entities/user.entity';

export type SuggestionStatus =
  | 'suggested'
  | 'accepted_by_guardian'
  | 'declined_by_guardian'
  | 'demo_scheduled'
  | 'confirmed';

@Entity('tuition_request_suggestions')
export class TuitionRequestSuggestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'request_id' })
  requestId!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column('uuid', { name: 'suggested_by_user_id', nullable: true })
  suggestedByUserId!: string | null;

  @Column({ name: 'match_score', type: 'integer', default: 85 })
  matchScore!: number;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote!: string | null;

  @Column({ type: 'text', default: 'suggested' })
  status!: SuggestionStatus;

  @Column({ name: 'guardian_feedback', type: 'text', nullable: true })
  guardianFeedback!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => TuitionRequestEntity, (r) => r.suggestions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request?: TuitionRequestEntity;

  @ManyToOne(() => TutorProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'suggested_by_user_id' })
  suggestedByUser?: UserEntity | null;
}
