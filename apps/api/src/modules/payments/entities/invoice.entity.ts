import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type InvoiceStatus = 'issued' | 'void';

export interface InvoiceSnapshot {
  payerName: string | null;
  studentName: string | null;
  tutorName: string | null;
  subjectName: string | null;
  bookingReference: string;
  sessionCount: number;
}

/** Durable, numbered invoice issued when a payment is verified. */
@Entity('invoices')
@Index('ix_invoices_payer', ['payerUserId', 'issuedAt'])
export class InvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'invoice_number', type: 'text' })
  invoiceNumber!: string;

  @Column('uuid', { name: 'payment_order_id' })
  paymentOrderId!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column('uuid', { name: 'payer_user_id' })
  payerUserId!: string;

  @Column('uuid', { name: 'student_user_id' })
  studentUserId!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ type: 'char', length: 3, default: 'BDT' })
  currency!: string;

  @Column({ name: 'subtotal_minor', type: 'bigint' })
  subtotalMinor!: string | number;

  @Column({ name: 'total_minor', type: 'bigint' })
  totalMinor!: string | number;

  @Column({ name: 'commission_rate_bps', type: 'integer' })
  commissionRateBps!: number;

  @Column({ name: 'commission_minor', type: 'bigint', default: 0 })
  commissionMinor!: string | number;

  @Column({ type: 'text', default: 'issued' })
  status!: InvoiceStatus;

  @Column({ type: 'jsonb', default: {} })
  snapshot!: InvoiceSnapshot;

  @CreateDateColumn({ name: 'issued_at', type: 'timestamptz' })
  issuedAt!: Date;

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt!: Date | null;

  @Column({ name: 'void_reason', type: 'text', nullable: true })
  voidReason!: string | null;
}
