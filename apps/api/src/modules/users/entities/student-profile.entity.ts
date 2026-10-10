import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('student_profiles')
export class StudentProfileEntity {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId!: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: string | null;

  @Column('uuid', { name: 'education_level_id', nullable: true })
  educationLevelId!: string | null;

  @Column('uuid', { name: 'curriculum_id', nullable: true })
  curriculumId!: string | null;

  @Column({ name: 'institution_name', type: 'text', nullable: true })
  institutionName!: string | null;

  @Column({ type: 'text', nullable: true })
  stream!: string | null;

  @Column({ name: 'district_code', type: 'text', nullable: true })
  districtCode!: string | null;

  @Column({ name: 'upazila_code', type: 'text', nullable: true })
  upazilaCode!: string | null;

  @Column({ name: 'learning_goals', type: 'text', nullable: true })
  learningGoals!: string | null;

  @Column({
    name: 'profile_visibility',
    type: 'text',
    default: 'private',
  })
  profileVisibility!: 'private' | 'limited';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}
