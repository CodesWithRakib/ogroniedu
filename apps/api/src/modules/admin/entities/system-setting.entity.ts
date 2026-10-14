import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSettingEntity {
  @PrimaryColumn({ type: 'text' })
  key!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  value!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column('uuid', { name: 'updated_by', nullable: true })
  updatedBy!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
