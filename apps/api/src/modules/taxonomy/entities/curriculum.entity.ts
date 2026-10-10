import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('curricula')
export class CurriculumEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  code!: string;

  @Column({ name: 'name_en', type: 'text' })
  nameEn!: string;

  @Column({ name: 'name_bn', type: 'text' })
  nameBn!: string;

  @Column({ name: 'country_code', type: 'char', length: 2, default: 'BD' })
  countryCode!: string;

  @Column({ name: 'board_name', type: 'text', nullable: true })
  boardName!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
