import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('feature_flags')
export class FeatureFlagEntity {
  @PrimaryColumn({ type: 'text' })
  key!: string;

  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  rules!: Record<string, any>;

  @Column('uuid', { name: 'updated_by', nullable: true })
  updatedBy!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
