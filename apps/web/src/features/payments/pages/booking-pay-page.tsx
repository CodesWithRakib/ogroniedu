'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Calendar,
  GraduationCap,
} from 'lucide-react';
import { Button, LoadingSpinner, Alert, AlertDescription } from '@/components/ui';
import { useGetBookingRequestByIdQuery } from '@/store/services/bookings-api';
import {
  useCreatePaymentOrderMutation,
  type CreatePaymentOrderResponse,
} from '@/store/services/payments-api';
import { normalizeUnknownError, newIdempotencyKey } from '@/lib/api-error';
import { formatBDTMinor } from '@/lib/format';
import { type Locale, formatLocalizedNumber } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { usePaymentStatus } from '../hooks/use-payment-status';
import { EasyCheckoutDesk } from '../components/easy-checkout-desk';
import { SaasCheckoutFlow, type PaymentMethodId } from '../components/saas-checkout-flow';

export interface BookingPayPageProps {
  bookingId: string;
  locale: Locale;
}

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
  const router = useRouter();
  const isBn = locale === 'bn';

  const {
    data: bookingData,
    isLoading: loadingBooking,
    isError,
    refetch,
  } = useGetBookingRequestByIdQuery(bookingId);

  const [createOrder, { isLoading: creatingOrder }] = useCreatePaymentOrderMutation();

  const [pendingOrder, setPendingOrder] = useState<CreatePaymentOrderResponse | null>(null);
  const [inPageIframeLoading, setInPageIframeLoading] = useState(true);
  const [showIframeModal, setShowIframeModal] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [paymentFailedState, setPaymentFailedState] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'saas' | 'desk'>('saas');

  const booking = bookingData?.data;
  const status = String(booking?.status ?? '');
  const priceMinor = Number(booking?.pricePerSessionMinor ?? 0);
  const isPayable = PAYABLE_STATUSES.has(status);
  const isConfirmed = CONFIRMED_STATUSES.has(status);
  const isTerminal = TERMINAL_STATUSES.has(status);

  // Authoritative real-time payment status polling with backend
  const { isSucceeded: orderSucceeded, isFailed: orderFailed } = usePaymentStatus({
    orderId: pendingOrder?.orderId,
    enabled: Boolean(pendingOrder && isPayable && !isConfirmed),
    onSuccess: () => {
      setShowIframeModal(false);
      void refetch();
    },
    onTerminalState: () => {
      void refetch();
    },
  });

  // Background polling while payment is payable or awaiting confirmation
  useEffect(() => {
    if (!isPayable || isConfirmed) return undefined;
    const timer = setInterval(() => {
      void refetch();
    }, 4000);
    return () => clearInterval(timer);
  }, [isPayable, isConfirmed, refetch]);

  // When order succeeds from hook, ensure refetch & close modal
  useEffect(() => {
    if (orderSucceeded) {
      setShowIframeModal(false);
      void refetch();
    }
  }, [orderSucceeded, refetch]);

  // When order fails from hook
  useEffect(() => {
    if (orderFailed) {
      setShowIframeModal(false);
      setPaymentFailedState(
        isBn
          ? 'পেমেন্ট ব্যর্থ হয়েছে বা গেটওয়েতে বাতিল করা হয়েছে।'
          : 'Payment failed or was cancelled at the gateway.',
      );
    }
  }, [orderFailed, isBn]);

  // Resolve frameable EasyCheckOut URL
  const targetIframeUrl = useMemo(() => {
    if (!pendingOrder) return '';
    const rawUrl = pendingOrder.gatewayPageUrl || pendingOrder.checkoutUrl;
    if (!rawUrl) return '';

    if (rawUrl.includes('/EasyCheckOut/')) {
      return rawUrl.includes('full=1')
        ? rawUrl
        : rawUrl.includes('?')
          ? `${rawUrl}&full=1`
          : `${rawUrl}?full=1`;
    }

    const sessionKey =
      pendingOrder.sessionKey ||
      rawUrl.match(/[?&]SESSIONKEY=([A-Za-z0-9]+)/i)?.[1] ||
      rawUrl.match(/\/EasyCheckOut\/(?:testcde)?([A-Za-z0-9]+)/i)?.[1];

    if (sessionKey) {
      const isSandbox =
        rawUrl.includes('sandbox.sslcommerz.com') || !rawUrl.includes('securepay.sslcommerz.com');
      const baseDomain = isSandbox
        ? 'https://sandbox.sslcommerz.com'
        : 'https://seamless-epay.sslcommerz.com';
      const pathPrefix = isSandbox ? 'testcde' : '';
      return `${baseDomain}/EasyCheckOut/${pathPrefix}${sessionKey}?full=1`;
    }

    return rawUrl;
  }, [pendingOrder]);

  // PostMessage listener for SSLCommerz callback or /payments/result
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      let data: Record<string, unknown> = {};
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      // 1. Direct message from internal result
      if (data.type === 'PAYMENT_RESULT' || data.type === 'PAYMENT_COMPLETE') {
        const resultStatus = String(data.status || '');
        if (resultStatus === 'succeeded' || resultStatus === 'success') {
          setShowIframeModal(false);
          void refetch();
        } else if (resultStatus === 'failed' || resultStatus === 'cancelled') {
          setShowIframeModal(false);
          setPaymentFailedState(
            isBn
              ? 'পেমেন্ট সম্পন্ন হয়নি বা বাতিল করা হয়েছে।'
              : 'Payment was not completed or was cancelled.',
          );
        }
        return;
      }

      // 2. Official SSLCommerz easyCheckout postMessage
      if (data.status === 'success') {
        if (typeof data.url === 'string' && data.url.includes('http')) {
          setShowIframeModal(false);
          if (data.url.includes('status=failed') || data.url.includes('status=cancelled')) {
            setPaymentFailedState(
              isBn
                ? 'পেমেন্ট গেটওয়েতে বাতিল বা ব্যর্থ হয়েছে।'
                : 'Payment was cancelled or failed at the gateway.',
            );
          } else {
            void refetch();
          }
        }
      } else if (data.status === 'failed' || data.status === 'cancel') {
        if (typeof data.url === 'string' && data.url.includes('http')) {
          setShowIframeModal(false);
          setPaymentFailedState(
            isBn
              ? 'পেমেন্ট সম্পন্ন হয়নি বা বাতিল করা হয়েছে।'
              : 'Payment was cancelled or failed.',
          );
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isBn, refetch]);

  // Trigger In-Page Payment Order Creation & Open SSLCommerz Easy Checkout
  const handleInitiatePayment = useCallback(
    async (payload: {
      method: string;
      selectedChannel: string;
      emiTenure?: string;
      discountMinor: number;
      finalAmountMinor: number;
    }) => {
      setErrorText(null);
      setPaymentFailedState(null);

      if (!isPayable || priceMinor <= 0) {
        setErrorText(
          isBn
            ? 'এই বুকিংটি এখন পেমেন্টের জন্য প্রস্তুত নয়।'
            : 'This booking is not ready for payment yet.',
        );
        return;
      }

      try {
        setInPageIframeLoading(true);
        const res = await createOrder({
          body: {
            bookingId,
            provider: 'sslcommerz',
            locale,
            paymentMethod: payload.selectedChannel,
            frontendOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          idempotencyKey: newIdempotencyKey('order'),
        }).unwrap();

        const created = (res.data ?? res) as CreatePaymentOrderResponse;
        if (!created?.checkoutUrl && !created?.gatewayPageUrl) {
          throw new Error(
            isBn
              ? 'পেমেন্ট গেটওয়ে চেকআউট লিংক পাওয়া যায়নি। আবার চেষ্টা করুন।'
              : 'The payment gateway did not return a valid session. Please try again.',
          );
        }

        setPendingOrder(created);
        setShowIframeModal(true);
      } catch (err) {
        setErrorText(normalizeUnknownError(err, locale).message);
      }
    },
    [isPayable, priceMinor, isBn, createOrder, bookingId, locale],
  );

  // Cancel in-page checkout frame & return to review
  const handleCancelInPageCheckout = useCallback(() => {
    setShowIframeModal(false);
    setPendingOrder(null);
    setPaymentFailedState(null);
    setErrorText(null);
  }, []);

  // Trigger SaaS Direct Payment initiation (Redirects directly to bKash / Cards without modal repetition!)
  const handleInitiatePaymentSaas = useCallback(
    async (payload: {
      method: PaymentMethodId;
      payerPhone?: string;
      discountMinor: number;
      finalAmountMinor: number;
    }) => {
      setErrorText(null);
      setPaymentFailedState(null);

      if (!isPayable || priceMinor <= 0) {
        setErrorText(
          isBn
            ? 'এই বুকিংটি এখন পেমেন্টের জন্য প্রস্তুত নয়।'
            : 'This booking is not ready for payment yet.',
        );
        return;
      }

      try {
        setInPageIframeLoading(true);
        const res = await createOrder({
          body: {
            bookingId,
            provider: 'sslcommerz',
            locale,
            paymentMethod: payload.method === 'any' ? undefined : payload.method,
            frontendOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          idempotencyKey: newIdempotencyKey('order'),
        }).unwrap();

        const created = (res.data ?? res) as CreatePaymentOrderResponse;
        if (!created?.checkoutUrl && !created?.gatewayPageUrl) {
          throw new Error(
            isBn
              ? 'পেমেন্ট গেটওয়ে চেকআউট লিংক পাওয়া যায়নি। আবার চেষ্টা করুন।'
              : 'The payment gateway did not return a valid session. Please try again.',
          );
        }

        setPendingOrder(created);

        // Direct hosted redirect straight into the selected payment channel (bKash/Cards/MFS)
        const targetUrl = created.gatewayPageUrl || created.checkoutUrl;
        if (targetUrl) {
          window.location.href = targetUrl;
        }

        return created;
      } catch (err) {
        setErrorText(normalizeUnknownError(err, locale).message);
      } finally {
        setInPageIframeLoading(false);
      }
    },
    [isPayable, priceMinor, isBn, createOrder, bookingId, locale],
  );

  const subjectName = isBn
    ? booking?.subject?.nameBn || booking?.subject?.name
    : booking?.subject?.name || booking?.subject?.nameBn;
  const tutorUser = booking?.tutorProfile?.user as
    | { displayName?: string | null; fullName?: string | null }
    | undefined;
  const tutorName =
    tutorUser?.displayName || tutorUser?.fullName || (isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified Tutor');
  const displaySubject = subjectName || (isBn ? 'সাধারণ বিষয়' : 'General Subject');
  const educationLevel =
    (isBn ? booking?.educationLevel?.nameBn : booking?.educationLevel?.name) ||
    booking?.educationLevel?.name ||
    '';

  // Loading state
  if (loadingBooking) {
    return (
      <div className="min-h-screen bg-muted/15 flex flex-col items-center justify-center p-4">
        <LoadingSpinner className="w-10 h-10 text-primary" />
        <p className="mt-3 text-xs font-bold text-muted-foreground">
          {isBn ? 'চেকআউট তথ্য লোড হচ্ছে…' : 'Loading checkout details…'}
        </p>
      </div>
    );
  }

  // Not found or access error state
  if (isError || !booking) {
    return (
      <div className="min-h-screen bg-muted/15 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-6 bg-card border border-border rounded-2xl text-center shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">
            {isBn ? 'বুকিং পাওয়া যায়নি' : 'Booking Not Found'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isBn
              ? 'আপনি এই বুকিংয়ের পেমেন্ট দেখার অনুমতি রাখেন না অথবা বুকিংটি মুছে ফেলা হয়েছে।'
              : 'You do not have permission to view this booking, or it has been removed.'}
          </p>
          <div className="mt-4">
            <Button asChild size="sm" className="rounded-xl font-bold">
              <Link href={withLocale('/dashboard/student/payments', locale)}>
                {isBn ? 'পেমেন্ট তালিকায় ফিরুন' : 'Back to Payments'}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 flex flex-col">
      {/* Global Minimal Checkout Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link
            href={withLocale('/', locale)}
            className="flex items-center gap-2 group transition-transform active:scale-98"
          >
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="text-base font-black tracking-tight text-foreground flex items-center gap-1.5">
              <span>Ogroni</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                Easy Checkout
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('saas')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'saas'
                  ? 'bg-card text-foreground shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isBn ? '৩-ধাপ চেকআউট' : '3-Step Checkout'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('desk')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'desk'
                  ? 'bg-card text-foreground shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isBn ? 'Easy ডাবল ডেস্ক' : 'Easy Desk'}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{isBn ? '১০০% এসক্রো সুরক্ষিত গেটওয়ে' : '100% Escrow Secured Gateway'}</span>
          </div>

          <Link
            href={withLocale('/dashboard/student/payments', locale)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            data-testid="checkout-back-link"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isBn ? 'ফিরে যান' : 'Back'}</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center">
        {/* SUCCESS STATE */}
        {isConfirmed ? (
          <div
            className="w-full max-w-lg my-8 rounded-2xl border border-emerald-500/30 bg-card p-6 sm:p-8 shadow-xl flex flex-col items-center text-center gap-5 animate-in fade-in"
            data-testid="checkout-success-view"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground">
                {isBn ? 'পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!' : 'Payment Completed Successfully!'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
                {isBn
                  ? 'আপনার বুকিং নিশ্চিত হয়েছে এবং অর্থ অগ্রণী এডু এসক্রোতে শতভাগ সুরক্ষিত রয়েছে।'
                  : 'Your tuition booking is verified and funds are safely held in OgroniEdu Escrow.'}
              </p>
            </div>

            <div className="w-full rounded-xl bg-muted/30 border border-border p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  {isBn ? 'পরিশোধিত পরিমাণ' : 'Amount Paid'}
                </span>
                <span className="text-base font-black text-foreground">
                  {formatBDTMinor(priceMinor, locale)}
                </span>
              </div>
              <div className="sm:text-right">
                <span className="text-muted-foreground block text-[11px]">
                  {isBn ? 'বুকিং রেফারেন্স' : 'Booking Reference'}
                </span>
                <span className="font-mono font-bold text-foreground">#{bookingId.slice(0, 8)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full pt-2">
              <Button
                asChild
                size="default"
                className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Link href={withLocale('/dashboard/student/sessions', locale)}>
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{isBn ? 'সেশন ক্যালেন্ডার ও রুটিন' : 'View Session Calendar'}</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="default" className="rounded-xl font-bold">
                <Link href={withLocale('/dashboard/student', locale)}>
                  <span>{isBn ? 'ড্যাশবোর্ডে ফিরুন' : 'Back to Dashboard'}</span>
                </Link>
              </Button>
            </div>
          </div>
        ) : paymentFailedState ? (
          /* FAILED / CANCELLED STATE */
          <div
            className="w-full max-w-lg my-8 rounded-2xl border border-destructive/30 bg-card p-6 sm:p-8 shadow-xl flex flex-col items-center text-center gap-5 animate-in fade-in"
            data-testid="checkout-failed-view"
          >
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground">
                {isBn ? 'পেমেন্ট সম্পন্ন হয়নি' : 'Payment Incomplete or Cancelled'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
                {paymentFailedState}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isBn
                  ? 'আপনার অ্যাকাউন্ট থেকে কোনো অর্থ কাটা হয়নি। আপনি যেকোনো সময় আবার চেষ্টা করতে পারেন।'
                  : 'No funds were deducted from your account. You can retry anytime.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full pt-2">
              <Button
                onClick={() =>
                  void handleInitiatePayment({
                    method: 'card',
                    selectedChannel: 'sslcommerz',
                    discountMinor: 0,
                    finalAmountMinor: priceMinor,
                  })
                }
                size="default"
                className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid="checkout-retry-btn"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                <span>{isBn ? 'আবার চেষ্টা করুন' : 'Try Again'}</span>
              </Button>
              <Button
                onClick={handleCancelInPageCheckout}
                variant="outline"
                size="default"
                className="rounded-xl font-bold"
              >
                <span>{isBn ? 'পেমেন্ট পদ্ধতি পরিবর্তন' : 'Change Payment Method'}</span>
              </Button>
            </div>
          </div>
        ) : isTerminal ? (
          /* TERMINAL STATE */
          <div className="w-full max-w-md my-8 rounded-2xl border border-border bg-card p-6 text-center text-foreground shadow-lg">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <h3 className="text-sm font-bold">
              {isBn ? 'এই বুকিংটি আর সক্রিয় নেই' : 'Booking no longer active'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isBn ? `স্ট্যাটাস: ${status}` : `Status: ${status}`}
            </p>
          </div>
        ) : viewMode === 'saas' ? (
          /* PREMIUM SAAS 3-STEP CHECKOUT (MATCHING USER NEW REFERENCE IMAGES) */
          <SaasCheckoutFlow
            bookingId={bookingId}
            orderId={pendingOrder?.orderId}
            amountMinor={priceMinor}
            currency="BDT"
            locale={locale}
            bookingDetails={{
              tutorName,
              subjectName: displaySubject,
              educationLevel,
              sessionCount: 1,
              studentPhone: (booking?.studentUser as { phone?: string })?.phone || '01700000000',
            }}
            isProcessing={creatingOrder || inPageIframeLoading}
            errorText={errorText}
            onInitiatePayment={handleInitiatePaymentSaas}
            verifiedSuccess={isConfirmed}
            transactionId={pendingOrder?.orderId}
          />
        ) : (
          /* CUSTOM EASY CHECKOUT DESK (MATCHING USER SCREENSHOT) */
          <EasyCheckoutDesk
            bookingId={bookingId}
            orderId={pendingOrder?.orderId}
            amountMinor={priceMinor}
            currency="BDT"
            locale={locale}
            bookingDetails={{
              tutorName,
              subjectName: displaySubject,
              educationLevel,
              sessionCount: 1,
            }}
            isProcessing={creatingOrder}
            errorText={errorText}
            onPayNow={handleInitiatePayment}
            onCancel={() => router.push(withLocale('/dashboard/student/payments', locale))}
            targetIframeUrl={targetIframeUrl}
            iframeLoading={inPageIframeLoading}
            onIframeLoaded={() => setInPageIframeLoading(false)}
            showIframeModal={showIframeModal}
            onCloseIframeModal={() => setShowIframeModal(false)}
          />
        )}
      </main>
    </div>
  );
}
