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

export interface CreatePaymentOrderResultDto {
  orderId: string;
  checkoutUrl: string;
  sessionKey?: string;
  gatewayPageUrl?: string;
  storeLogo?: string;
  amountMinor: number;
  currency: string;
  status: PaymentOrderStatus;
  commissionRateBps: number;
}

export interface PaymentOrderStatusDto {
  orderId: string;
  bookingId: string;
  payerUserId: string;
  amountMinor: number;
  currency: string;
  status: PaymentOrderStatus;
  provider: string;
  providerReference?: string | null;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string | null;
  failureReason?: string | null;
  receipt?: PaymentReceiptDto | null;
  booking?: {
    id: string;
    subjectName: string;
    tutorName: string;
    studentName: string;
    rateMinor: number;
    status: string;
  };
}
