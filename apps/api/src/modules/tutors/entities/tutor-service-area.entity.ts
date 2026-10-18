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

  /**
   * Public service-area centre the tutor approved for distance search. It is a
   * coarse area coordinate — never a home address — and stays NULL when the
   * tutor has not supplied one (search must not substitute another location).
   */
  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  latitude!: number | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  longitude!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => TutorProfileEntity, (t) => t.serviceAreas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorProfile?: TutorProfileEntity;
}
