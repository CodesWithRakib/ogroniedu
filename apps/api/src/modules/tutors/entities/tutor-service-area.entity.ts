import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TutorProfileEntity } from './tutor-profile.entity';

@Entity('tutor_service_areas')
export class TutorServiceAreaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ name: 'district_code', type: 'text' })
  districtCode!: string;

  @Column({ name: 'upazila_code', type: 'text', nullable: true })
  upazilaCode!: string | null;

  @Column({ name: 'locality_name', type: 'text', nullable: true })
  localityName!: string | null;

  @Column({ name: 'radius_km', type: 'numeric', precision: 5, scale: 2, nullable: true })
  radiusKm!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => TutorProfileEntity, (t) => t.serviceAreas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;
}
