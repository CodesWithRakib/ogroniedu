import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('subjects')
export class SubjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  code!: string;

  @Column({ name: 'name_en', type: 'text' })
  nameEn!: string;

  @Column({ name: 'name_bn', type: 'text' })
  nameBn!: string;

  @Column({ type: 'text', default: 'academic' })
  category!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
