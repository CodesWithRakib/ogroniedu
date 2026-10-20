import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Versioned platform commission policy. A new version is created instead of
 * mutating history so that funded orders and settlements keep the rate that
 * applied when they were created.
 */
@Entity('commission_policies')
@Index('ux_commission_policies_active', ['code'], { unique: true, where: '"is_active"' })
export class CommissionPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  code!: string;

  @Column({ type: 'integer' })
  version!: number;

  @Column({ name: 'platform_fee_bps', type: 'integer' })
  platformFeeBps!: number;

  @Column({ name: 'min_payout_minor', type: 'bigint' })
  minPayoutMinor!: string | number;

  @Column({ type: 'char', length: 3, default: 'BDT' })
  currency!: string;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
