import { baseApi, type ApiSuccessEnvelope } from '../base-api';

export type PaymentProvider = 'bkash' | 'nagad' | 'sslcommerz';

export interface CreatePaymentOrderRequest {
  bookingId: string;
  amountMinor?: number;
  provider?: PaymentProvider;
}

export interface PaymentReceipt {
  receiptId: string;
  orderId: string;
  bookingId: string;
  payerName: string;
  studentName: string;
  tutorName: string;
  subjectName: string;
  amountBdt: string;
  currency: string;
  status: string;
  paymentMethod: string;
  paidAt: string;
}

export interface PaymentOrderRecord {
  id: string;
  bookingId: string;
  payerUserId: string;
  amountMinor: number | string;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    status: string;
    pricePerSessionMinor?: number | string;
    subject?: { nameEn?: string; nameBn?: string };
    tutorProfile?: { user?: { displayName?: string } };
    studentUser?: { displayName?: string };
    requesterUser?: { displayName?: string };
  };
  transactions?: Array<{
    id: string;
    providerTransactionId?: string;
    verifiedAt?: string;
    status: string;
  }>;
}

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyPaymentOrders: builder.query<ApiSuccessEnvelope<PaymentOrderRecord[]>, void>({
      query: () => '/api/v1/payments/orders',
      providesTags: [{ type: 'PaymentOrder', id: 'LIST' }],
    }),
    createPaymentOrder: builder.mutation<
      ApiSuccessEnvelope<unknown>,
      { body: CreatePaymentOrderRequest; idempotencyKey: string }
    >({
      query: ({ body, idempotencyKey }) => ({
        url: '/api/v1/payments/orders',
        method: 'POST',
        body,
        headers: { 'idempotency-key': idempotencyKey },
      }),
      invalidatesTags: [
        { type: 'PaymentOrder', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    sandboxConfirmPayment: builder.mutation<
      ApiSuccessEnvelope<unknown>,
      { orderId: string; provider?: PaymentProvider }
    >({
      query: ({ orderId, provider }) => ({
        url: `/api/v1/payments/orders/${orderId}/sandbox-confirm`,
        method: 'POST',
        body: { provider },
      }),
      invalidatesTags: [
        { type: 'PaymentOrder', id: 'LIST' },
        { type: 'PaymentReceipt', id: 'LIST' },
        { type: 'BookingRequest', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    getPaymentReceipt: builder.query<ApiSuccessEnvelope<PaymentReceipt>, string>({
      query: (orderId) => `/api/v1/payments/orders/${orderId}/receipt`,
      providesTags: (_r, _e, orderId) => [{ type: 'PaymentReceipt', id: orderId }],
    }),
    processRefund: builder.mutation<
      ApiSuccessEnvelope<unknown>,
      { paymentOrderId: string; amountMinor: number; reason: string }
    >({
      query: (body) => ({ url: '/api/v1/payments/refunds', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Refund', id: 'LIST' },
        { type: 'PaymentReceipt', id: 'LIST' },
        { type: 'Reconciliation', id: 'SUMMARY' },
      ],
    }),
    settleMilestone: builder.mutation<ApiSuccessEnvelope<unknown>, { sessionId: string }>({
      query: (body) => ({ url: '/api/v1/payments/milestones/settle', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Reconciliation', id: 'SUMMARY' },
        { type: 'Notification', id: 'LIST' },
        { type: 'Session', id: 'LIST' },
      ],
    }),
    getReconciliation: builder.query<ApiSuccessEnvelope<unknown>, void>({
      query: () => '/api/v1/payments/reconciliation',
      providesTags: [{ type: 'Reconciliation', id: 'SUMMARY' }],
    }),
    getLedgerBalance: builder.query<ApiSuccessEnvelope<unknown>, string>({
      query: (accountCode) => `/api/v1/payments/ledger/balance/${accountCode}`,
      providesTags: (_r, _e, code) => [{ type: 'LedgerBalance', id: code }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyPaymentOrdersQuery,
  useLazyGetMyPaymentOrdersQuery,
  useCreatePaymentOrderMutation,
  useSandboxConfirmPaymentMutation,
  useGetPaymentReceiptQuery,
  useLazyGetPaymentReceiptQuery,
  useProcessRefundMutation,
  useSettleMilestoneMutation,
  useGetReconciliationQuery,
  useGetLedgerBalanceQuery,
} = paymentsApi;
