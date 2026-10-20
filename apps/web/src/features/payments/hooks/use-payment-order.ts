'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { getDictionary, type Locale } from '@/lib/i18n';
import { normalizeUnknownError, newIdempotencyKey } from '@/lib/api-error';
import { useAppSelector } from '@/store';
import { useGetBookingRequestsQuery, type BookingRequestItem } from '@/store/services/bookings-api';
import {
  useCreatePaymentOrderMutation,
  useLazyGetPaymentReceiptQuery,
  useProcessRefundMutation,
  useGetMyPaymentOrdersQuery,
  type CreatePaymentOrderResponse,
  type PaymentOrderRecord,
} from '@/store/services/payments-api';
import type {
  PaymentOrderDetails,
  PaymentProvider,
  PaymentReceiptData,
} from '@/features/payments/types/payment-checkout.types';

export type { PaymentProvider, BookingRequestItem, PaymentOrderRecord };

export interface PaymentBookingOption {
  id: string;
  label: string;
  subjectName: string;
  tutorName: string;
  rateMinor?: number;
  status?: string;
}

export type PaymentTab = 'due' | 'paid' | 'checkout';

/** Feature-level payments hook: due tuitions, payment history, draft checkout, and receipt handling. */
export function usePaymentOrder(locale: Locale) {
  const searchParams = useSearchParams();
  const queryBookingId = searchParams?.get('bookingId');
  const user = useAppSelector((s) => s.auth.user);

  const requests = useGetBookingRequestsQuery();
  const rawItems = requests.data?.data ?? [];

  const ordersQuery = useGetMyPaymentOrdersQuery();
  const paymentOrders = ordersQuery.data?.data ?? [];

  // 1. Due / Awaiting Payment Bookings
  const dueBookings = React.useMemo(() => {
    return rawItems.filter((r) => r.status === 'accepted' || r.status === 'awaiting_payment');
  }, [rawItems]);

  // 2. Paid / Confirmed / Completed Bookings
  const paidBookings = React.useMemo(() => {
    return rawItems.filter(
      (r) => r.status === 'confirmed' || r.status === 'in_progress' || r.status === 'completed',
    );
  }, [rawItems]);

  // 3. Paid Orders from payment_orders table
  const paidOrders = React.useMemo(() => {
    return paymentOrders.filter((o) => o.status === 'succeeded');
  }, [paymentOrders]);

  // Financial metric calculations
  const totalDueMinor = React.useMemo(() => {
    return dueBookings.reduce((sum, b) => sum + (Number(b.pricePerSessionMinor) || 0), 0);
  }, [dueBookings]);

  const totalPaidMinor = React.useMemo(() => {
    if (paidOrders.length > 0) {
      return paidOrders.reduce((sum, o) => sum + (Number(o.amountMinor) || 0), 0);
    }
    return paidBookings.reduce((sum, b) => sum + (Number(b.pricePerSessionMinor) || 0), 0);
  }, [paidOrders, paidBookings]);

  const escrowProtectedMinor = React.useMemo(() => {
    return paidBookings
      .filter((b) => b.status === 'confirmed' || b.status === 'in_progress')
      .reduce((sum, b) => sum + (Number(b.pricePerSessionMinor) || 0), 0);
  }, [paidBookings]);

  const pendingCount = React.useMemo(() => {
    return rawItems.filter((r) => r.status === 'requested').length;
  }, [rawItems]);

  const dueCount = React.useMemo(() => {
    return dueBookings?.length ?? 0;
  }, [dueBookings]);

  const paidCount = React.useMemo(() => {
    return (paidOrders?.length ?? 0) > 0 ? paidOrders.length : (paidBookings?.length ?? 0);
  }, [paidOrders, paidBookings]);

  const eligibleItems = React.useMemo(() => {
    // If there are due bookings, prioritize them for checkout selection
    if (dueBookings.length > 0) {
      return dueBookings;
    }
    return rawItems.filter(
      (r) =>
        r.status === 'accepted' ||
        r.status === 'confirmed' ||
        r.status === 'awaiting_payment' ||
        r.status === 'in_progress',
    );
  }, [dueBookings, rawItems]);

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
        status: r.status,
      };
    });
  }, [eligibleItems, locale]);

  const [activeTab, setActiveTab] = React.useState<PaymentTab>(() => {
    if (queryBookingId) return 'checkout';
    return 'due';
  });

  const [bookingId, setBookingId] = React.useState('');
  const [amountBdt, setAmountBdt] = React.useState('1000');
  const [provider, setProvider] = React.useState<PaymentProvider>('sslcommerz');
  const [order, setOrder] = React.useState<PaymentOrderDetails | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = React.useState<PaymentReceiptData | null>(null);
  const [receiptLoading, setReceiptLoading] = React.useState(false);

  const [createOrder, { isLoading: creating }] = useCreatePaymentOrderMutation();
  const [fetchReceipt] = useLazyGetPaymentReceiptQuery();
  const [processRefund, { isLoading: refunding }] = useProcessRefundMutation();

  const canRefund = user?.roles?.some(
    (r) => r === 'admin' || r === 'super_admin' || r === 'guardian',
  );

  React.useEffect(() => {
    if (queryBookingId && bookingOptions.some((b) => b.id === queryBookingId)) {
      setBookingId(queryBookingId);
      const found = bookingOptions.find((b) => b.id === queryBookingId);
      if (found?.rateMinor) {
        setAmountBdt((found.rateMinor / 100).toString());
      }
      setActiveTab('checkout');
    } else if (!bookingId && bookingOptions[0]) {
      setBookingId(bookingOptions[0].id);
      if (bookingOptions[0].rateMinor) {
        setAmountBdt((bookingOptions[0].rateMinor / 100).toString());
      }
    }
  }, [bookingOptions, bookingId, queryBookingId]);

  function handleSelectBooking(newBookingId: string) {
    setBookingId(newBookingId);
    const found = bookingOptions.find((b) => b.id === newBookingId);
    if (found?.rateMinor) {
      setAmountBdt((found.rateMinor / 100).toString());
    }
  }

  function selectBookingForPayment(targetBookingId: string) {
    setBookingId(targetBookingId);
    const found = rawItems.find((b) => b.id === targetBookingId);
    if (found?.pricePerSessionMinor) {
      setAmountBdt((Number(found.pricePerSessionMinor) / 100).toString());
    }
    setActiveTab('checkout');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }
  }

  async function requestCheckout(targetBookingId: string, gateway: PaymentProvider) {
    const res = await createOrder({
      body: { bookingId: targetBookingId, provider: gateway },
      idempotencyKey: newIdempotencyKey('order'),
    }).unwrap();
    const created = (res.data ?? res) as CreatePaymentOrderResponse;
    if (!created?.orderId || !created?.checkoutUrl) {
      throw new Error(
        locale === 'bn'
          ? 'পেমেন্ট গেটওয়ে চেকআউট লিংক দেয়নি। আবার চেষ্টা করুন।'
          : 'The payment gateway did not return a checkout session. Please try again.',
      );
    }
    return created;
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!bookingId) return;
    try {
      const created = await requestCheckout(bookingId, provider);
      setOrder({
        id: created.orderId,
        bookingId,
        payerName: user?.displayName ?? '',
        studentName: '',
        tutorName: '',
        subjectName: '',
        amountMinor: created.amountMinor,
        currency: created.currency || 'BDT',
        status: 'pending',
        provider,
        createdAt: new Date().toISOString(),
        checkoutUrl: created.checkoutUrl,
      });
      setActiveTab('checkout');
    } catch (err) {
      setFormError(normalizeUnknownError(err, locale).message);
    }
  }

  async function handlePay(gateway: PaymentProvider) {
    if (!order) throw new Error('No order');
    setFormError(null);

    // Reserve the tab synchronously so browsers do not block the provider
    // checkout window opened after the async order request.
    const checkoutWindow =
      typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;
    if (checkoutWindow) checkoutWindow.opener = null;

    let checkoutUrl = order.checkoutUrl;
    let activeOrderId = order.id;
    if (!checkoutUrl || order.provider !== gateway) {
      try {
        const created = await requestCheckout(order.bookingId, gateway);
        checkoutUrl = created.checkoutUrl;
        activeOrderId = created.orderId;
        setOrder({
          ...order,
          id: created.orderId,
          amountMinor: created.amountMinor,
          currency: created.currency || order.currency,
          provider: gateway,
          status: 'pending',
          checkoutUrl,
        });
      } catch (err) {
        checkoutWindow?.close();
        throw err;
      }
    }

    if (checkoutWindow) {
      checkoutWindow.location.replace(checkoutUrl);
    } else {
      window.location.assign(checkoutUrl);
    }

    // The provider redirect is never proof of payment. Poll the backend receipt
    // (which is only issued after the verified webhook) and never mark success
    // from this browser.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const receiptRes = await fetchReceipt(activeOrderId).unwrap();
        const receipt = receiptRes.data;
        if (receipt.status === 'succeeded') {
          requests.refetch();
          ordersQuery.refetch();
          return receipt;
        }
      } catch {
        // Receipt is not available until the webhook is processed.
      }
    }

    throw new Error(
      locale === 'bn'
        ? 'পেমেন্ট এখনও নিশ্চিত হয়নি। গেটওয়েতে পেমেন্ট সম্পন্ন করে এই পেজ রিফ্রেশ করুন।'
        : 'Payment is not confirmed yet. Complete the payment in the provider window, then refresh this page.',
    );
  }

  async function handleViewReceipt(orderId: string) {
    setReceiptLoading(true);
    try {
      const res = await fetchReceipt(orderId).unwrap();
      setSelectedReceipt(res.data);
    } catch (err) {
      setFormError(normalizeUnknownError(err, locale).message);
    } finally {
      setReceiptLoading(false);
    }
  }

  async function handleRefund() {
    if (!order) return;
    try {
      await processRefund({
        paymentOrderId: order.id,
        amountMinor: order.amountMinor,
        reason: 'customer_request_refund',
      }).unwrap();
      requests.refetch();
      ordersQuery.refetch();
    } catch (err) {
      setFormError(normalizeUnknownError(err, locale).message);
    }
  }

  return {
    dict: getDictionary(locale),
    requests,
    ordersQuery,
    paymentOrders,
    dueBookings,
    paidBookings,
    paidOrders,
    totalDueMinor,
    totalPaidMinor,
    escrowProtectedMinor,
    dueCount,
    paidCount,
    bookingIds,
    bookingOptions,
    pendingCount,
    bookingId,
    setBookingId,
    handleSelectBooking,
    selectBookingForPayment,
    amountBdt,
    setAmountBdt,
    provider,
    setProvider,
    order,
    formError,
    creating,
    refunding,
    canRefund,
    activeTab,
    setActiveTab,
    selectedReceipt,
    setSelectedReceipt,
    receiptLoading,
    handleViewReceipt,
    handleCreateOrder,
    handlePay,
    handleRefund,
  };
}
