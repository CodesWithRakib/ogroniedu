import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

export type InstitutionType =
  'school' | 'college' | 'school_and_college' | 'university' | 'madrasah';

@Entity('academic_institutions')
@Index('ix_academic_institutions_type', ['type'])
@Index('ix_academic_institutions_district', ['district'])
export class InstitutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  code!: string;

  @Column({ name: 'name_en', type: 'text' })
  nameEn!: string;

  @Column({ name: 'name_bn', type: 'text' })
  nameBn!: string;

  @Column({ type: 'text', default: 'school_and_college' })
  type!: InstitutionType;

  @Column({ type: 'text', nullable: true })
  district!: string | null;

  @Column({ type: 'text', nullable: true })
  division!: string | null;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
