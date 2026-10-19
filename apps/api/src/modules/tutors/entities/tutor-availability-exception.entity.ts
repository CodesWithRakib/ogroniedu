import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TutorProfileEntity } from './tutor-profile.entity';
import { UserEntity } from '../../auth/entities/user.entity';

/** Date-specific blocked period for a tutor (holiday, exam, emergency). */
@Entity('tutor_availability_exceptions')
@Index('ix_tutor_availability_exceptions_window', ['tutorUserId', 'startsAt', 'endsAt'])
export class TutorAvailabilityExceptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({ type: 'text', default: 'Asia/Dhaka' })
  timezone!: string;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column('uuid', { name: 'created_by_user_id', nullable: true })
  createdByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => TutorProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser?: UserEntity | null;
}
