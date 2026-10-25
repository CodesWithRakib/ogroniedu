'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  Lock,
  Sparkles,
  Receipt,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Button, LoadingSpinner, EmptyState } from '@/components/ui';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useGetBookingRequestByIdQuery } from '@/store/services/bookings-api';
import {
  useCreatePaymentOrderMutation,
  type CreatePaymentOrderResponse,
  type PaymentProvider,
} from '@/store/services/payments-api';
import { normalizeUnknownError, newIdempotencyKey } from '@/lib/api-error';
import { formatBDTMinor } from '@/lib/format';
import { type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';

export interface BookingPayPageProps {
  bookingId: string;
  locale: Locale;
}

const PROVIDERS: Array<{
  id: PaymentProvider;
  nameEn: string;
  nameBn: string;
  hintEn: string;
  hintBn: string;
}> = [
  {
    id: 'sslcommerz',
    nameEn: 'SSLCOMMERZ',
    nameBn: 'SSLCOMMERZ',
    hintEn: 'Cards, mobile banking & net banking',
    hintBn: 'কার্ড, মোবাইল ব্যাংকিং ও নেট ব্যাংকিং',
  },
  {
    id: 'bkash',
    nameEn: 'bKash',
    nameBn: 'বিকাশ',
    hintEn: 'Pay from your bKash wallet',
    hintBn: 'বিকাশ ওয়ালেট থেকে পরিশোধ করুন',
  },
];

const PAYABLE_STATUSES = new Set(['accepted', 'awaiting_payment']);
const CONFIRMED_STATUSES = new Set(['confirmed', 'in_progress', 'completed']);
const TERMINAL_STATUSES = new Set([
  'declined',
  'cancelled',
  'withdrawn',
  'expired',
  'refunded',
  'replacement_requested',
]);

export function BookingPayPage({ bookingId, locale }: BookingPayPageProps) {
  const isBn = locale === 'bn';

  const {
    data: bookingData,
    isLoading: loadingBooking,
    isFetching,
    isError,
    refetch,
  } = useGetBookingRequestByIdQuery(bookingId);
  const [createOrder, { isLoading: creatingOrder }] = useCreatePaymentOrderMutation();

  const [provider, setProvider] = useState<PaymentProvider>('sslcommerz');
  const [pendingOrder, setPendingOrder] = useState<CreatePaymentOrderResponse | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const booking = bookingData?.data;
  const status = String(booking?.status ?? '');
  const priceMinor = Number(booking?.pricePerSessionMinor ?? 0);
  const isPayable = PAYABLE_STATUSES.has(status);
  const isConfirmed = CONFIRMED_STATUSES.has(status);
  const isTerminal = TERMINAL_STATUSES.has(status);

  // Poll the authoritative booking record while the provider is processing.
  // The browser itself is never allowed to mark the booking paid.
  useEffect(() => {
    if (!isPayable) return undefined;
    const timer = setInterval(() => {
      void refetch();
    }, 5000);
    return () => clearInterval(timer);
  }, [isPayable, refetch]);

  const openCheckout = useCallback((url: string) => {
    const popup = window.open(url, '_blank');
    if (popup) {
      popup.opener = null;
    } else {
      window.location.assign(url);
    }
  }, []);

  async function handlePay() {
    setErrorText(null);
    if (!isPayable || priceMinor <= 0) {
      setErrorText(
        isBn
          ? 'এই বুকিংটি এখন পেমেন্টের জন্য প্রস্তুত নয়।'
          : 'This booking is not ready for payment yet.',
      );
      return;
    }

    // Open synchronously so the browser does not block the provider window.
    const checkoutWindow = window.open('about:blank', '_blank');
    if (checkoutWindow) checkoutWindow.opener = null;

    try {
      const res = await createOrder({
        body: { bookingId, provider },
        idempotencyKey: newIdempotencyKey('order'),
      }).unwrap();
      const created = (res.data ?? res) as CreatePaymentOrderResponse;
      if (!created?.checkoutUrl) {
        throw new Error(
          isBn
            ? 'পেমেন্ট গেটওয়ে চেকআউট লিংক দেয়নি। আবার চেষ্টা করুন।'
            : 'The payment gateway did not return a checkout session. Please try again.',
        );
      }

      setPendingOrder(created);
      if (checkoutWindow) {
        checkoutWindow.location.replace(created.checkoutUrl);
      } else {
        window.location.assign(created.checkoutUrl);
      }
      void refetch();
    } catch (err) {
      checkoutWindow?.close();
      setErrorText(normalizeUnknownError(err, locale).message);
    }
  }

  const subjectName = isBn
    ? booking?.subject?.nameBn || booking?.subject?.name
    : booking?.subject?.name || booking?.subject?.nameBn;
  const tutorUser = booking?.tutorProfile?.user as
    { displayName?: string | null; fullName?: string | null } | undefined;
  const tutorName = tutorUser?.displayName || tutorUser?.fullName || (isBn ? 'শিক্ষক' : 'Tutor');
  const displaySubject = subjectName || (isBn ? 'সাধারণ বিষয়' : 'General Subject');

  if (loadingBooking) {
    return (
      <DashboardShell locale={locale} title={isBn ? 'পেমেন্ট' : 'Payment'}>
        <div className="py-24 flex justify-center">
          <LoadingSpinner />
        </div>
      </DashboardShell>
    );
  }

  if (isError || !booking) {
    return (
      <DashboardShell locale={locale} title={isBn ? 'পেমেন্ট' : 'Payment'}>
        <EmptyState
          title={isBn ? 'বুকিং পাওয়া যায়নি' : 'Booking not found'}
          description={
            isBn
              ? 'আপনি এই বুকিংয়ের পেমেন্ট দেখার অনুমতি রাখেন না অথবা বুকিংটি মুছে ফেলা হয়েছে।'
              : 'You do not have access to this booking, or it no longer exists.'
          }
          actionLabel={isBn ? 'বুকিংয়ে ফিরুন' : 'Back to bookings'}
          actionHref={withLocale('/dashboard/student/requests', locale)}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'সুরক্ষিত পেমেন্ট' : 'Secure Payment'}
      subtitle={
        isBn
          ? 'পেমেন্টের অবস্থা সরাসরি ব্যাকএন্ড থেকে যাচাই করা হয়'
          : 'Payment status is verified directly with the backend'
      }
    >
      <div className="w-full space-y-6">
        <Link
          href={withLocale(`/dashboard/bookings/${bookingId}`, locale)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {isBn ? 'বুকিং বিবরণে ফিরুন' : 'Back to booking'}
        </Link>

        {/* Hero — matches the home / tutor discovery visual language */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-gradient-to-br from-card via-card/90 to-primary-soft/30 p-5 sm:p-8 shadow-xs">
          <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-brand-soft blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-[11px] font-bold text-primary">
                <ShieldCheck className="w-3.5 h-3.5" />
                {isBn ? 'সুরক্ষিত চেকআউট' : 'Secure checkout'}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground leading-tight">
                {isConfirmed ? (
                  isBn ? (
                    <>
                      পেমেন্ট{' '}
                      <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-500 bg-clip-text text-transparent">
                        নিশ্চিত হয়েছে
                      </span>
                    </>
                  ) : (
                    <>
                      Payment{' '}
                      <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-500 bg-clip-text text-transparent">
                        confirmed
                      </span>
                    </>
                  )
                ) : isBn ? (
                  <>
                    ক্লাস শুরু করার আগে{' '}
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                      পেমেন্ট সম্পন্ন করুন
                    </span>
                  </>
                ) : (
                  <>
                    Complete your payment{' '}
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                      before class starts
                    </span>
                  </>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {isConfirmed
                  ? isBn
                    ? 'পেমেন্ট প্রোভাইডার লেনদেন যাচাই করেছে এবং বুকিং নিশ্চিত হয়েছে।'
                    : 'The payment provider verified the transaction and the booking is confirmed.'
                  : isBn
                    ? 'পেমেন্ট গেটওয়েতে সম্পন্ন করুন। ফিরে এলে এই পেজটি ব্যাকএন্ড থেকে সর্বশেষ অবস্থা দেখাবে।'
                    : 'Complete the payment on the provider page. When you return, this page reads the latest status from the backend.'}
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 px-2.5 py-1 text-foreground">
                  <Lock className="w-3 hand-3 text-primary" />
                  {isBn ? 'গেটওয়ে-যাচাইকৃত' : 'Gateway-verified'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 px-2.5 py-1 text-foreground">
                  <Receipt className="w-3 h-3 text-primary" />
                  {isBn ? 'স্বচ্ছ ফি' : 'Transparent fee'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 px-2.5 py-1 text-foreground">
                  <Sparkles className="w-3 h-3 text-primary" />
                  {isBn ? 'লাইভ স্ট্যাটাস' : 'Live status'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur px-5 py-4 min-w-[210px] shadow-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {isBn ? 'প্রদেয় পরিমাণ' : 'Amount due'}
              </p>
              <p className="mt-1 text-2xl font-black text-foreground tabular-nums">
                {formatBDTMinor(priceMinor, locale)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {isBn ? 'একটি সেশন' : 'One session'} · #{bookingId.slice(0, 8)}
              </p>
            </div>
          </div>
        </section>

        {errorText && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span role="alert">{errorText}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Main column */}
          <div className="lg:col-span-3 space-y-5">
            {isConfirmed ? (
              <div className="rounded-2xl border border-success/30 bg-success-soft/40 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-success/15 text-success flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-foreground">
                      {isBn ? 'বুকিং নিশ্চিত হয়েছে' : 'Booking confirmed'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {isBn
                        ? 'পেমেন্ট ব্যাকএন্ডে যাচাই ও রেকর্ড করা হয়েছে।'
                        : 'The payment was verified and recorded by the backend.'}
                    </p>
                  </div>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                    <dt className="text-muted-foreground">{isBn ? 'বুকিং আইডি' : 'Booking ID'}</dt>
                    <dd className="mt-0.5 font-mono font-semibold text-foreground break-all">
                      {bookingId}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                    <dt className="text-muted-foreground">{isBn ? 'পরিশোধিত' : 'Paid'}</dt>
                    <dd className="mt-0.5 font-semibold text-foreground">
                      {formatBDTMinor(priceMinor, locale)}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Link href={withLocale(`/dashboard/bookings/${bookingId}`, locale)}>
                    <Button size="sm" className="rounded-xl font-semibold">
                      {isBn ? 'বুকিং দেখুন' : 'View booking'}
                    </Button>
                  </Link>
                  <Link href={withLocale('/dashboard/student/sessions', locale)}>
                    <Button size="sm" variant="outline" className="rounded-xl font-semibold">
                      {isBn ? 'সেশন ক্যালেন্ডার' : 'Session calendar'}
                    </Button>
                  </Link>
                </div>
              </div>
            ) : pendingOrder && isPayable ? (
              <div className="rounded-2xl border border-warning/30 bg-warning-soft/40 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-warning/15 text-warning flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-foreground">
                      {isBn
                        ? 'প্রোভাইডার নিশ্চিতকরণের অপেক্ষায়'
                        : 'Waiting for provider confirmation'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {isBn
                        ? 'পেমেন্ট সম্পন্ন হলে এই পেজ স্বয়ংক্রিয়ভাবে আপডেট হবে।'
                        : 'This page updates automatically after the provider confirms the payment.'}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs">
                  <span className="text-muted-foreground">
                    {isBn ? 'অর্ডার আইডি' : 'Order ID'}:{' '}
                  </span>
                  <span className="font-mono font-semibold text-foreground break-all">
                    {pendingOrder.orderId}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl font-semibold"
                    onClick={() => openCheckout(pendingOrder.checkoutUrl)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    {isBn ? 'চেকআউট আবার খুলুন' : 'Reopen checkout'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl font-semibold"
                    onClick={() => void refetch()}
                    disabled={isFetching}
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`}
                    />
                    {isBn ? 'স্ট্যাটাস যাচাই করুন' : 'Check status'}
                  </Button>
                </div>
              </div>
            ) : isPayable ? (
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <CreditCard className="w-4 h-4 text-interactive" />
                  <h2 className="text-sm font-extrabold text-foreground">
                    {isBn ? 'পেমেন্ট পদ্ধতি নির্বাচন করুন' : 'Choose a payment method'}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROVIDERS.map((item) => {
                    const selected = provider === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setProvider(item.id)}
                        aria-pressed={selected}
                        className={`text-left rounded-2xl border p-4 transition-all ${
                          selected
                            ? 'border-primary bg-primary-soft/60 shadow-xs'
                            : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-hover'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-extrabold text-foreground">
                            {isBn ? item.nameBn : item.nameEn}
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selected ? 'border-primary' : 'border-muted-foreground/40'
                            }`}
                          >
                            {selected && <span className="w-2 h-2 rounded-full bg-primary" />}
                          </span>
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {isBn ? item.hintBn : item.hintEn}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-info/30 bg-info-soft/60 px-3.5 py-3 text-[11px] text-info-soft-foreground flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    {isBn
                      ? 'আপনি প্রোভাইডারের নিরাপদ পেজে যাবেন। এখানে কার্ড বা ওয়ালেট তথ্য নেওয়া হয় না।'
                      : 'You will be redirected to the provider’s secure page. Card and wallet details are never collected here.'}
                  </span>
                </div>

                <Button
                  onClick={() => void handlePay()}
                  disabled={creatingOrder || priceMinor <= 0}
                  className="w-full rounded-xl font-bold"
                >
                  {creatingOrder ? (
                    <>
                      <LoadingSpinner className="w-4 h-4 mr-2" />
                      {isBn ? 'চেকআউট তৈরি হচ্ছে…' : 'Creating checkout…'}
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      {isBn
                        ? `${formatBDTMinor(priceMinor, locale)} পরিশোধ করুন`
                        : `Pay ${formatBDTMinor(priceMinor, locale)} securely`}
                    </>
                  )}
                </Button>
              </div>
            ) : isTerminal ? (
              <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-foreground">
                      {isBn ? 'এই বুকিংটি আর সক্রিয় নেই' : 'This booking is no longer active'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {isBn
                        ? `বর্তমান অবস্থা: ${status}. পেমেন্ট নেওয়া হবে না।`
                        : `Current status: ${status}. No payment will be taken.`}
                    </p>
                  </div>
                </div>
                <Link href={withLocale('/dashboard/student/requests', locale)}>
                  <Button size="sm" variant="outline" className="rounded-xl font-semibold">
                    {isBn ? 'অনুরোধে ফিরুন' : 'Back to requests'}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-info/30 bg-info-soft/50 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-info/15 text-info flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-foreground">
                      {isBn ? 'শিক্ষকের উত্তরের অপেক্ষায়' : 'Waiting for the tutor'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {isBn
                        ? 'শিক্ষক অনুরোধ গ্রহণ করলে পেমেন্ট চালু হবে।'
                        : 'Payment becomes available after the tutor accepts your request.'}
                    </p>
                  </div>
                </div>
                <Link href={withLocale('/dashboard/student/requests', locale)}>
                  <Button size="sm" variant="outline" className="rounded-xl font-semibold">
                    {isBn ? 'অনুরোধ দেখুন' : 'View requests'}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Summary column */}
          <aside className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                <Receipt className="w-4 h-4 text-interactive" />
                {isBn ? 'অর্ডার সারসংক্ষেপ' : 'Order summary'}
              </h2>
              <dl className="space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{isBn ? 'বিষয়' : 'Subject'}</dt>
                  <dd className="font-semibold text-foreground text-right">{displaySubject}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{isBn ? 'শিক্ষক' : 'Tutor'}</dt>
                  <dd className="font-semibold text-foreground text-right">{tutorName}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{isBn ? 'সেশন মূল্য' : 'Session fee'}</dt>
                  <dd className="font-semibold text-foreground text-right tabular-nums">
                    {formatBDTMinor(priceMinor, locale)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{isBn ? 'স্ট্যাটাস' : 'Status'}</dt>
                  <dd className="font-semibold text-foreground text-right capitalize">
                    {status ? status.replace(/_/g, ' ') : '—'}
                  </dd>
                </div>
              </dl>
              <div className="pt-3 border-t border-border flex items-center justify-between text-sm">
                <span className="font-bold text-foreground">{isBn ? 'মোট' : 'Total'}</span>
                <span className="font-black text-foreground tabular-nums">
                  {formatBDTMinor(priceMinor, locale)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-primary-soft/20 p-5 space-y-2.5 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                <ShieldCheck className="w-4 h-4 text-primary" />
                {isBn ? 'কেন এই পেমেন্ট নিরাপদ' : 'Why this payment is safe'}
              </div>
              <p className="leading-relaxed">
                {isBn
                  ? 'পেমেন্ট সফল হয়েছে কেবল তখনই ধরা হয় যখন প্রোভাইডার সার্ভার-টু-সার্ভার যাচাই করে ব্যাকএন্ডে নিশ্চিত করে।'
                  : 'A payment is treated as successful only after the provider is verified server-to-server and the backend confirms it.'}
              </p>
              <p className="leading-relaxed">
                {isBn
                  ? 'এই পেজে কোনো কার্ড নম্বর, ওয়ালেট পিন বা গোপন কোড নেওয়া হয় না।'
                  : 'No card number, wallet PIN or secret code is collected on this page.'}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}
