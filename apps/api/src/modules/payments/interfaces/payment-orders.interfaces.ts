import type { PaymentOrderStatus } from '../entities';

export interface PaymentReceiptDto {
  receiptId: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  orderId: string;
  bookingId: string;
  payerName: string;
  studentName: string;
  tutorName: string;
  subjectName: string;
  amountBdt: string;
  amountMinor: number;
  currency: string;
  status: PaymentOrderStatus;
  paymentMethod: string;
  provider: string;
  paidAt: string;
}
