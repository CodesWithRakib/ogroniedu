import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { TutorProfileEntity } from './tutor-profile.entity';

@Entity('tutor_availability')
export class TutorAvailabilityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ type: 'smallint' })
  weekday!: number; // 0=Sunday to 6=Saturday

  @Column({ name: 'start_local', type: 'time' })
  startLocal!: string;

  @Column({ name: 'end_local', type: 'time' })
  endLocal!: string;

  @Column({ type: 'text', default: 'Asia/Dhaka' })
  timezone!: string;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom!: string | null;

  @Column({ name: 'effective_until', type: 'date', nullable: true })
  effectiveUntil!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne('TutorProfileEntity', (t: TutorProfileEntity) => t.availabilities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;
}
