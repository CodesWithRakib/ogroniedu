import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import type { SupportTicketCategory } from '../enums/support-ticket-category.enum';
import type { SupportTicketStatus } from '../enums/support-ticket-status.enum';

export type { SupportTicketCategory } from '../enums/support-ticket-category.enum';
export type { SupportTicketStatus } from '../enums/support-ticket-status.enum';

@Entity('support_tickets')
export class SupportTicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ticket_number', type: 'text', nullable: true })
  ticketNumber!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  email!: string;

  @Column({ name: 'phone_e164', type: 'text', nullable: true })
  phoneE164?: string | null;

  @Column({ type: 'text', default: 'general' })
  category!: SupportTicketCategory;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'text', default: 'submitted' })
  status!: SupportTicketStatus;

  @Column({ name: 'reporter_user_id', type: 'uuid', nullable: true })
  reporterUserId?: string | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy?: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reporter_user_id' })
  reporter?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolver?: UserEntity;
}
