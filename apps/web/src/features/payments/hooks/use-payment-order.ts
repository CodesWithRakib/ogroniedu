'use client';

import React from 'react';
import { getDictionary, type Locale } from '@/lib/i18n';
import { normalizeUnknownError, newIdempotencyKey } from '@/lib/api-error';
import { useAppSelector } from '@/store';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';
import {
  useCreatePaymentOrderMutation,
  useLazyGetPaymentReceiptQuery,
  useProcessRefundMutation,
} from '@/store/services/payments-api';
import type {
  PaymentOrderDetails,
  PaymentProvider,
} from '@/features/payments/types/payment-checkout.types';

export type { PaymentProvider };

export interface PaymentBookingOption {
  id: string;
  label: string;
  subjectName: string;
  tutorName: string;
  rateMinor?: number;
}

/** Feature-level payments hook: order draft form, checkout receipt polling, and refund action. */
export function usePaymentOrder(locale: Locale) {
  const user = useAppSelector((s) => s.auth.user);
  const requests = useGetBookingRequestsQuery();
  const rawItems = requests.data?.data ?? [];
  const eligibleItems = React.useMemo(() => {
    return rawItems.filter(
      (r) =>
        r.status === 'accepted' ||
        r.status === 'confirmed' ||
        r.status === 'awaiting_payment' ||
        r.status === 'in_progress',
    );
  }, [rawItems]);

  const pendingCount = React.useMemo(() => {
    return rawItems.filter((r) => r.status === 'requested').length;
  }, [rawItems]);

  const bookingIds = React.useMemo(() => eligibleItems.map((r) => r.id), [eligibleItems]);

  const bookingOptions = React.useMemo<PaymentBookingOption[]>(() => {
    return eligibleItems.map((r) => {
      const tutorName =
        r.tutorProfile?.user?.displayName ||
        r.tutorProfile?.user?.fullName ||
        (locale === 'bn' ? 'শিক্ষক' : 'Tutor');
      const subjectName =
        locale === 'bn' && r.subject?.nameBn
          ? r.subject.nameBn
          : r.subject?.name || (locale === 'bn' ? 'বিষয়' : 'Subject');
      return {
        id: r.id,
        label: `${subjectName} — ${tutorName} (#${r.id.slice(0, 6)})`,
        subjectName,
        tutorName,
        rateMinor: Number(r.pricePerSessionMinor) || undefined,
      };
    });
  }, [eligibleItems, locale]);

  const [bookingId, setBookingId] = React.useState('');
  const [amountBdt, setAmountBdt] = React.useState('1000');
  const [provider, setProvider] = React.useState<PaymentProvider>('bkash');
  const [order, setOrder] = React.useState<PaymentOrderDetails | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [createOrder, { isLoading: creating }] = useCreatePaymentOrderMutation();
  const [fetchReceipt] = useLazyGetPaymentReceiptQuery();
  const [processRefund, { isLoading: refunding }] = useProcessRefundMutation();
  const canRefund = user?.roles?.some(
    (r) => r === 'admin' || r === 'super_admin' || r === 'guardian',
  );

  React.useEffect(() => {
    if (!bookingId && bookingOptions[0]) {
      setBookingId(bookingOptions[0].id);
      if (bookingOptions[0].rateMinor) {
        setAmountBdt((bookingOptions[0].rateMinor / 100).toString());
      }
    }
  }, [bookingOptions, bookingId]);

  function handleSelectBooking(newBookingId: string) {
    setBookingId(newBookingId);
    const found = bookingOptions.find((b) => b.id === newBookingId);
    if (found?.rateMinor) {
      setAmountBdt((found.rateMinor / 100).toString());
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!bookingId) return;
    const amountMinor = Math.round(Number(amountBdt) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setFormError(locale === 'bn' ? 'সঠিক পরিমাণ দিন।' : 'Enter a valid amount.');
      return;
    }
    try {
      const res = await createOrder({
        body: { bookingId, amountMinor, provider },
        idempotencyKey: newIdempotencyKey('order'),
      }).unwrap();
      const created = (res.data ?? res) as Record<string, unknown>;
      setOrder({
        id: String(created.id ?? created.orderId ?? `ord-${Date.now()}`),
        bookingId,
        payerName: user?.displayName ?? '',
        studentName: '',
        tutorName: '',
        subjectName: '',
        amountMinor,
        currency: 'BDT',
        status: 'pending',
        provider,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setFormError(normalizeUnknownError(err, locale).message);
    }
  }

  async function handlePay(gateway: PaymentProvider) {
    if (!order) throw new Error('No order');
    setOrder({ ...order, provider: gateway });
    // Sandbox: the provider confirms via signed server webhook. The
    // receipt endpoint only succeeds once that webhook has been
    // processed — we never fabricate a receipt locally.
    const receiptRes = await fetchReceipt(order.id)
      .unwrap()
      .catch((err: unknown) => {
        throw new Error(normalizeUnknownError(err, locale).message);
      });
    const receipt = receiptRes.data;
    if (receipt.status !== 'succeeded') {
      throw new Error(
        locale === 'bn'
          ? 'পেমেন্ট এখনও নিশ্চিত হয়নি। ওয়েবহুক নিশ্চিতকরণের পর রসিদ পাওয়া যাবে।'
          : 'Payment not yet confirmed. The receipt appears after webhook confirmation.',
      );
    }
    return receipt;
  }

  async function handleRefund() {
    if (!order) return;
    try {
      await processRefund({
        paymentOrderId: order.id,
        amountMinor: order.amountMinor,
        reason: 'customer_request_refund',
      }).unwrap();
    } catch (err) {
      setFormError(normalizeUnknownError(err, locale).message);
    }
  }

  return {
    dict: getDictionary(locale),
    requests,
    bookingIds,
    bookingOptions,
    pendingCount,
    bookingId,
    setBookingId,
    handleSelectBooking,
    amountBdt,
    setAmountBdt,
    provider,
    setProvider,
    order,
    formError,
    creating,
    refunding,
    canRefund,
    handleCreateOrder,
    handlePay,
    handleRefund,
  };
}
