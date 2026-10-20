import { baseApi, type ApiSuccessEnvelope } from '../base-api';

export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type PaymentProvider = 'bkash' | 'nagad' | 'sslcommerz';
export type PayoutMethod = 'bkash' | 'nagad' | 'rocket' | 'bank' | 'other';
export type RefundStatus =
  'requested' | 'approved' | 'processing' | 'succeeded' | 'failed' | 'rejected';
export type PayoutStatus = 'requested' | 'approved' | 'processing' | 'paid' | 'rejected' | 'failed';

export interface CreatePaymentOrderRequest {
  bookingId: string;
  amountMinor?: number;
  provider?: PaymentProvider;
  paymentMethod?: string;
}

export interface PaymentReceipt {
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
  status: string;
  paymentMethod: string;
  provider: string;
  paidAt: string;
}

export interface CreatePaymentOrderResponse {
  orderId: string;
  checkoutUrl: string;
  amountMinor: number;
  currency: string;
  status: 'created' | 'pending' | 'succeeded' | 'failed' | 'expired' | 'cancelled' | string;
  commissionRateBps: number;
}

export interface PaymentOrderRecord {
  id: string;
  bookingId: string;
  payerUserId: string;
  amountMinor: number | string;
  currency: string;
  status: string;
  provider: string;
  commissionRateBps?: number;
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
  refunds?: PaymentRefund[];
}

export interface PaymentRefund {
  id: string;
  refundNumber: string | null;
  paymentOrderId: string;
  bookingId: string | null;
  amountMinor: string | number;
  currency: string;
  reason: string | null;
  status: RefundStatus;
  providerRefundId: string | null;
  providerStatus: string | null;
  providerReference: string | null;
  providerConfirmedAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  failureReason: string | null;
  eligibilitySnapshot: Record<string, unknown>;
  ledgerJournalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payout {
  id: string;
  payoutNumber: string;
  tutorUserId: string;
  amountMinor: string | number;
  currency: string;
  status: PayoutStatus;
  method: PayoutMethod;
  accountReferenceMasked: string;
  requestedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  paidAt: string | null;
  paidBy: string | null;
  externalReference: string | null;
  failureReason: string | null;
  decisionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionSettlement {
  id: string;
  sessionId: string;
  bookingId: string;
  grossAmountMinor: string | number;
  platformFeeMinor: string | number;
  tutorNetMinor: string | number;
  commissionRateBps: number;
  settledAt: string;
}

export interface TutorEarningAdjustment {
  id: string;
  amountMinor: string | number;
  direction: 'credit' | 'debit';
  reason: string;
  createdAt: string;
}

export interface TutorFinanceSummary {
  lifetimeNetMinor: string;
  availableMinor: string;
  reservedMinor: string;
  paidOutMinor: string;
  escrowPendingMinor: string;
  minimumPayoutMinor: string;
  payouts: Payout[];
  settlements: SessionSettlement[];
  adjustments: TutorEarningAdjustment[];
}

export interface CommissionPolicy {
  id: string;
  code: string;
  version: number;
  platformFeeBps: number;
  minPayoutMinor: string | number;
  currency: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ReconciliationReport {
  runId: string | null;
  reconciledAt: string;
  totalOrders: number;
  succeededOrders: number;
  totalTransactions: number;
  totalRefunds: number;
  totalPayouts: number;
  isLedgerBalanced: boolean;
  ledgerTotalDebitsPoisha: string;
  ledgerTotalCreditsPoisha: string;
  unreconciledDiscrepancies: Array<{ reference: string; reason: string }>;
}

export interface LedgerReconciliation {
  isBalanced: boolean;
  totalDebits: string;
  totalCredits: string;
  discrepancy: string;
  status: 'reconciled' | 'discrepancy_detected';
  checkedAt: string;
  accounts: Array<{ code: string; name: string; accountType: string; balance: string }>;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  paymentOrderId: string;
  bookingId: string;
  payerUserId: string;
  studentUserId: string;
  tutorUserId: string;
  currency: string;
  subtotalMinor: string | number;
  totalMinor: string | number;
  commissionRateBps: number;
  commissionMinor: string | number;
  status: string;
  snapshot: Record<string, unknown>;
  issuedAt: string;
}

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyPaymentOrders: builder.query<ApiSuccessEnvelope<PaymentOrderRecord[]>, void>({
      query: () => '/api/v1/payments/orders',
      providesTags: [{ type: 'PaymentOrder', id: 'LIST' }],
    }),
    createPaymentOrder: builder.mutation<
      ApiSuccessEnvelope<CreatePaymentOrderResponse>,
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
    getPaymentReceipt: builder.query<ApiSuccessEnvelope<PaymentReceipt>, string>({
      query: (orderId) => `/api/v1/payments/orders/${orderId}/receipt`,
      providesTags: (_r, _e, orderId) => [{ type: 'PaymentReceipt', id: orderId }],
    }),

    // ------------------------------------------------------------- refunds
    requestRefund: builder.mutation<
      ApiSuccessEnvelope<PaymentRefund>,
      { paymentOrderId: string; amountMinor: number; reason: string; idempotencyKey?: string }
    >({
      query: (body) => ({ url: '/api/v1/payments/refunds', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Refund', id: 'LIST' },
        { type: 'PaymentOrder', id: 'LIST' },
        { type: 'Reconciliation', id: 'SUMMARY' },
      ],
    }),
    getMyRefunds: builder.query<ApiSuccessEnvelope<PaymentRefund[]>, void>({
      query: () => '/api/v1/payments/refunds',
      providesTags: [{ type: 'Refund', id: 'LIST' }],
    }),
    getRefund: builder.query<ApiSuccessEnvelope<PaymentRefund>, string>({
      query: (refundId) => `/api/v1/payments/refunds/${refundId}`,
      providesTags: (_r, _e, refundId) => [{ type: 'Refund', id: refundId }],
    }),
    settleMilestone: builder.mutation<ApiSuccessEnvelope<unknown>, { sessionId: string }>({
      query: (body) => ({ url: '/api/v1/payments/milestones/settle', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Reconciliation', id: 'SUMMARY' },
        { type: 'Notification', id: 'LIST' },
        { type: 'Session', id: 'LIST' },
        { type: 'TutorFinance', id: 'SUMMARY' },
      ],
    }),

    // ------------------------------------------------------------- invoices
    getInvoice: builder.query<ApiSuccessEnvelope<InvoiceRecord>, string>({
      query: (invoiceId) => `/api/v1/payments/invoices/${invoiceId}`,
      providesTags: (_r, _e, invoiceId) => [{ type: 'Invoice', id: invoiceId }],
    }),

    // ------------------------------------------------------- tutor finance
    getTutorFinanceSummary: builder.query<ApiSuccessEnvelope<TutorFinanceSummary>, void>({
      query: () => '/api/v1/tutor/finance/summary',
      providesTags: [{ type: 'TutorFinance', id: 'SUMMARY' }],
    }),
    getMyPayouts: builder.query<ApiSuccessEnvelope<Payout[]>, void>({
      query: () => '/api/v1/tutor/finance/payouts',
      providesTags: [{ type: 'Payout', id: 'MINE' }],
    }),
    requestPayout: builder.mutation<
      ApiSuccessEnvelope<Payout>,
      {
        amountMinor: number;
        method: PayoutMethod;
        accountReference: string;
        idempotencyKey: string;
      }
    >({
      query: (body) => ({ url: '/api/v1/tutor/finance/payouts', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Payout', id: 'MINE' },
        { type: 'Payout', id: 'LIST' },
        { type: 'TutorFinance', id: 'SUMMARY' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),

    // ------------------------------------------------------ admin finance
    getFinanceRefunds: builder.query<ApiSuccessEnvelope<PaymentRefund[]>, { status?: string }>({
      query: ({ status }) => ({
        url: '/api/v1/admin/finance/refunds',
        params: status ? { status } : undefined,
      }),
      providesTags: [{ type: 'Refund', id: 'LIST' }],
    }),
    decideRefund: builder.mutation<
      ApiSuccessEnvelope<PaymentRefund>,
      { refundId: string; decision: 'approve' | 'reject'; note?: string }
    >({
      query: ({ refundId, ...body }) => ({
        url: `/api/v1/admin/finance/refunds/${refundId}/decide`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Refund', id: 'LIST' }],
    }),
    processRefund: builder.mutation<
      ApiSuccessEnvelope<{ refund: PaymentRefund; manualConfirmationRequired: boolean }>,
      string
    >({
      query: (refundId) => ({
        url: `/api/v1/admin/finance/refunds/${refundId}/process`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Refund', id: 'LIST' },
        { type: 'Reconciliation', id: 'SUMMARY' },
      ],
    }),
    confirmManualRefund: builder.mutation<
      ApiSuccessEnvelope<PaymentRefund>,
      { refundId: string; externalReference: string; note?: string; confirmedAt?: string }
    >({
      query: ({ refundId, ...body }) => ({
        url: `/api/v1/admin/finance/refunds/${refundId}/confirm-manual`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Refund', id: 'LIST' },
        { type: 'Reconciliation', id: 'SUMMARY' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),

    getFinancePayouts: builder.query<ApiSuccessEnvelope<Payout[]>, { status?: string }>({
      query: ({ status }) => ({
        url: '/api/v1/admin/finance/payouts',
        params: status ? { status } : undefined,
      }),
      providesTags: [{ type: 'Payout', id: 'LIST' }],
    }),
    approvePayout: builder.mutation<ApiSuccessEnvelope<Payout>, string>({
      query: (payoutId) => ({
        url: `/api/v1/admin/finance/payouts/${payoutId}/approve`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Payout', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    rejectPayout: builder.mutation<
      ApiSuccessEnvelope<Payout>,
      { payoutId: string; reason: string }
    >({
      query: ({ payoutId, reason }) => ({
        url: `/api/v1/admin/finance/payouts/${payoutId}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: [
        { type: 'Payout', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    markPayoutPaid: builder.mutation<
      ApiSuccessEnvelope<Payout>,
      { payoutId: string; externalReference: string; note?: string }
    >({
      query: ({ payoutId, ...body }) => ({
        url: `/api/v1/admin/finance/payouts/${payoutId}/mark-paid`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Payout', id: 'LIST' },
        { type: 'Reconciliation', id: 'SUMMARY' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    markPayoutFailed: builder.mutation<
      ApiSuccessEnvelope<Payout>,
      { payoutId: string; reason: string }
    >({
      query: ({ payoutId, reason }) => ({
        url: `/api/v1/admin/finance/payouts/${payoutId}/mark-failed`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: [{ type: 'Payout', id: 'LIST' }],
    }),

    listCommissionPolicies: builder.query<ApiSuccessEnvelope<CommissionPolicy[]>, void>({
      query: () => '/api/v1/admin/finance/commission-policy',
      providesTags: [{ type: 'CommissionPolicy', id: 'LIST' }],
    }),
    createCommissionPolicy: builder.mutation<
      ApiSuccessEnvelope<CommissionPolicy>,
      { platformFeeBps: number; minPayoutMinor: number; notes?: string }
    >({
      query: (body) => ({
        url: '/api/v1/admin/finance/commission-policy',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'CommissionPolicy', id: 'LIST' },
        { type: 'TutorFinance', id: 'SUMMARY' },
      ],
    }),

    runFinanceReconciliation: builder.mutation<ApiSuccessEnvelope<ReconciliationReport>, void>({
      query: () => ({ url: '/api/v1/admin/finance/reconciliation/run', method: 'POST' }),
      invalidatesTags: [
        { type: 'Reconciliation', id: 'SUMMARY' },
        { type: 'Reconciliation', id: 'ADMIN' },
      ],
    }),
    getLedgerReconciliation: builder.query<ApiSuccessEnvelope<LedgerReconciliation>, void>({
      query: () => '/api/v1/admin/finance/ledger/reconciliation',
      providesTags: [{ type: 'Reconciliation', id: 'SUMMARY' }],
    }),
    getLedgerBalance: builder.query<ApiSuccessEnvelope<unknown>, string>({
      query: (accountCode) => `/api/v1/admin/finance/ledger/balance/${accountCode}`,
      providesTags: (_r, _e, code) => [{ type: 'LedgerBalance', id: code }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyPaymentOrdersQuery,
  useLazyGetMyPaymentOrdersQuery,
  useCreatePaymentOrderMutation,
  useGetPaymentReceiptQuery,
  useLazyGetPaymentReceiptQuery,
  useRequestRefundMutation,
  useGetMyRefundsQuery,
  useGetRefundQuery,
  useSettleMilestoneMutation,
  useGetInvoiceQuery,
  useGetTutorFinanceSummaryQuery,
  useGetMyPayoutsQuery,
  useRequestPayoutMutation,
  useGetFinanceRefundsQuery,
  useDecideRefundMutation,
  useProcessRefundMutation,
  useConfirmManualRefundMutation,
  useGetFinancePayoutsQuery,
  useApprovePayoutMutation,
  useRejectPayoutMutation,
  useMarkPayoutPaidMutation,
  useMarkPayoutFailedMutation,
  useListCommissionPoliciesQuery,
  useCreateCommissionPolicyMutation,
  useRunFinanceReconciliationMutation,
  useGetLedgerReconciliationQuery,
  useGetLedgerBalanceQuery,
} = paymentsApi;

/** Absolute URL for endpoints opened in a new tab (invoice print). */
export function apiUrl(path: string): string {
  return `${API_ORIGIN.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
