import type { Locale } from '@/lib/i18n';
import type {
  PaymentProvider,
  PaymentReceipt,
  PaymentOrderRecord,
} from '@/store/services/payments-api';

export type { PaymentProvider, PaymentOrderRecord };

export type CheckoutGateway = PaymentProvider;

export type PaymentOrderStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

/** Order snapshot rendered by the checkout view. */
export interface PaymentOrderDetails {
  id: string;
  bookingId: string;
  payerName: string;
  studentName: string;
  tutorName: string;
  subjectName: string;
  amountMinor: number; // e.g. 100000 = 1000.00 BDT
  currency: string;
  status: PaymentOrderStatus;
  provider: PaymentProvider;
  createdAt: string;
  paidAt?: string;
  /** Provider-hosted checkout URL. Payment success is only ever confirmed by the backend. */
  checkoutUrl?: string;
}

/** Receipt shape — single-sourced from the payments API type. */
export type PaymentReceiptData = PaymentReceipt;

export interface PaymentCheckoutViewProps {
  locale: Locale;
  initialOrder?: PaymentOrderDetails;
  receipt?: PaymentReceiptData | null;
  payDisabledReason?: string | null;
  onPay?: (provider: PaymentProvider) => Promise<PaymentReceiptData>;
}

/** Total amount in BDT units, preserving the original fixed-2 formatting. */
export function orderAmountBdt(order: Pick<PaymentOrderDetails, 'amountMinor'>): string {
  return (order.amountMinor / 100).toFixed(2);
}

/** 92% tutor share, preserving the original floating-point formula. */
export function tutorShareBdt(order: Pick<PaymentOrderDetails, 'amountMinor'>): string {
  return ((order.amountMinor * 0.92) / 100).toFixed(2);
}

/** 8% platform share, preserving the original floating-point formula. */
export function platformShareBdt(order: Pick<PaymentOrderDetails, 'amountMinor'>): string {
  return ((order.amountMinor * 0.08) / 100).toFixed(2);
}
