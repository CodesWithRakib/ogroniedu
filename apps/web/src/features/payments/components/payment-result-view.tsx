'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  Printer,
  ShieldCheck,
  ChevronLeft,
  ArrowRight,
} from 'lucide-react';
import { Button, LoadingSpinner, Card, CardContent } from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { formatBDTMinor } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import { usePaymentStatus } from '../hooks/use-payment-status';
import { apiUrl } from '@/store/services/payments-api';

export interface PaymentResultViewProps {
  orderId: string;
  locale: Locale;
  initialStatus?: string;
  bookingId?: string;
}

export function PaymentResultView({
  orderId,
  locale,
  initialStatus,
  bookingId: propBookingId,
}: PaymentResultViewProps) {
  const isBn = locale === 'bn';

  const {
    order,
    status: currentStatus,
    isLoading,
    isSucceeded,
    isFailed,
    isCancelled,
    refetch,
    isFetching,
  } = usePaymentStatus({
    orderId,
    enabled: true,
  });

  const bookingId = order?.bookingId || propBookingId;
  const amountMinor = order?.amountMinor || 0;
  const currency = order?.currency || 'BDT';
  const receipt = order?.receipt;
  const tutorName = order?.booking?.tutorName || receipt?.tutorName || (isBn ? 'শিক্ষক' : 'Tutor');
  const subjectName =
    order?.booking?.subjectName || receipt?.subjectName || (isBn ? 'বিষয়' : 'Subject');

  // Handle Printable Invoice
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (isLoading && !order) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-foreground">
        <LoadingSpinner className="w-10 h-10 text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          {isBn
            ? 'পেমেন্টের সর্বশেষ তথ্য যাচাই করা হচ্ছে...'
            : 'Verifying authoritative payment status with backend.'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-3xl mx-auto flex flex-col gap-6 py-6 px-4 text-foreground"
      data-testid="payment-result-view"
    >
      {/* Navigation back */}
      {bookingId && (
        <Link
          href={withLocale(`/dashboard/bookings/${bookingId}`, locale)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{isBn ? 'বুকিং বিবরণে ফিরে যান' : 'Back to booking details'}</span>
        </Link>
      )}

      {/* Case 1: Verified Succeeded Payment */}
      {isSucceeded && (
        <Card className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-6 sm:p-8 text-center border-b border-border bg-muted/20 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-1">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
              {isBn ? 'যাচাইকৃত লেনদেন' : 'Authoritatively Verified'}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {isBn ? 'পেমেন্ট সফল হয়েছে!' : 'Payment Succeeded!'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto font-normal leading-relaxed">
              {isBn
                ? 'আপনার পেমেন্ট সফলভাবে সম্পন্ন হয়েছে এবং টিউশন বুকিংটি নিশ্চিত করা হয়েছে।'
                : 'The payment was verified by the provider and your tuition booking is confirmed.'}
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 flex flex-col gap-6">
            {/* Payment & Booking Breakdown */}
            <div className="rounded-xl border border-border bg-muted/20 p-5 flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isBn ? 'লেনদেন সারাংশ' : 'Transaction Summary'}
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <dt className="text-muted-foreground font-medium">
                    {isBn ? 'অর্ডার রেফারেন্স' : 'Order Reference'}
                  </dt>
                  <dd className="font-mono font-bold text-foreground mt-0.5 break-all">{orderId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">
                    {isBn ? 'পরিশোধিত অর্থ' : 'Amount Paid'}
                  </dt>
                  <dd className="text-base font-bold text-foreground mt-0.5">
                    {formatBDTMinor(amountMinor, locale)} {currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">{isBn ? 'শিক্ষক' : 'Tutor'}</dt>
                  <dd className="font-semibold text-foreground mt-0.5">{tutorName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">{isBn ? 'বিষয়' : 'Subject'}</dt>
                  <dd className="font-semibold text-foreground mt-0.5">{subjectName}</dd>
                </div>
                {order?.verifiedAt && (
                  <div>
                    <dt className="text-muted-foreground font-medium">
                      {isBn ? 'যাচাইয়ের সময়' : 'Verified At'}
                    </dt>
                    <dd className="font-medium text-muted-foreground mt-0.5">
                      {new Date(order.verifiedAt).toLocaleString(
                        locale === 'bn' ? 'bn-BD' : 'en-US',
                      )}
                    </dd>
                  </div>
                )}
                {receipt?.invoiceNumber && (
                  <div>
                    <dt className="text-muted-foreground font-medium">
                      {isBn ? 'ইনভয়েস নম্বর' : 'Invoice Number'}
                    </dt>
                    <dd className="font-mono font-semibold text-foreground mt-0.5">
                      {receipt.invoiceNumber}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Escrow Guarantee Pill */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {isBn
                  ? 'আপনার অর্থ এসক্রো অ্যাকাউন্টে সুরক্ষিত আছে। ক্লাস সম্পন্ন হওয়ার পর তা শিক্ষককে ছাড় করা হবে।'
                  : 'Your payment is safeguarded in escrow. Tutor payouts are only released after sessions are satisfactorily conducted.'}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {receipt?.invoiceId && (
                  <a
                    href={apiUrl(
                      `/api/v1/payments/invoices/${receipt.invoiceId}/print?locale=${locale}`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto"
                    data-testid="result-download-invoice-btn"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl font-semibold border-border"
                    >
                      <FileText className="w-4 h-4 mr-1.5" />
                      {isBn ? 'অফিশিয়াল ইনভয়েস' : 'Official Invoice'}
                    </Button>
                  </a>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="rounded-xl font-semibold border-border"
                  data-testid="result-print-btn"
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  {isBn ? 'প্রিন্ট' : 'Print'}
                </Button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {bookingId && (
                  <Link
                    href={withLocale(`/dashboard/bookings/${bookingId}`, locale)}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      type="button"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold"
                    >
                      <span>{isBn ? 'বুকিং দেখুন' : 'View Booking'}</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case 2: Failed Payment */}
      {isFailed && (
        <Card className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-6 sm:p-8 text-center border-b border-border bg-destructive/10 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center mb-1">
              <XCircle className="w-7 h-7" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/25">
              {isBn ? 'ব্যর্থ লেনদেন' : 'Transaction Failed'}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {isBn ? 'পেমেন্ট সম্পন্ন করা যায়নি' : 'Payment Could Not Be Completed'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto font-normal leading-relaxed">
              {isBn
                ? 'পেমেন্ট গেটওয়ে বা ব্যাংক লেনদেনটি বাতিল করেছে। আপনার কোনো অর্থ কাটা হয়নি।'
                : 'The payment provider or your bank declined the transaction. No funds were debited.'}
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-muted/20 p-5 flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  {isBn ? 'অর্ডার রেফারেন্স' : 'Order Reference'}
                </span>
                <span className="font-mono font-semibold text-foreground">{orderId}</span>
              </div>
              {order?.failureReason && (
                <div className="flex justify-between items-center text-destructive font-semibold">
                  <span>{isBn ? 'ব্যর্থতার কারণ' : 'Reason'}</span>
                  <span>{order.failureReason}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Link href={withLocale('/dashboard/support', locale)} className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full rounded-xl font-semibold">
                  {isBn ? 'সাহায্য কেন্দ্রের সাথে যোগাযোগ করুন' : 'Contact Support'}
                </Button>
              </Link>

              {bookingId && (
                <Link
                  href={withLocale(`/bookings/${bookingId}/pay`, locale)}
                  className="w-full sm:w-auto"
                >
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold">
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    {isBn ? 'আবার পেমেন্ট চেষ্টা করুন' : 'Try Payment Again'}
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case 3: Cancelled Payment */}
      {isCancelled && (
        <Card className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-6 sm:p-8 text-center border-b border-border bg-warning/10 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-warning/15 text-warning flex items-center justify-center mb-1">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning/15 text-warning border border-warning/25">
              {isBn ? 'বাতিলকৃত' : 'Cancelled'}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {isBn ? 'পেমেন্ট বাতিল করা হয়েছে' : 'Payment Was Cancelled'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto font-normal leading-relaxed">
              {isBn
                ? 'আপনি চেকআউট বাতিল করেছেন। আপনার বুকিং সংরক্ষিত রয়েছে এবং আপনি যেকোনো সময় পেমেন্ট করতে পারেন।'
                : 'You cancelled the checkout session. Your booking remains active and ready for payment whenever you wish.'}
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              {bookingId ? (
                <>
                  <Link
                    href={withLocale(`/dashboard/bookings/${bookingId}`, locale)}
                    className="w-full sm:w-auto"
                  >
                    <Button variant="outline" size="sm" className="w-full rounded-xl font-semibold">
                      {isBn ? 'বুকিংয়ে ফিরুন' : 'Back to Booking'}
                    </Button>
                  </Link>

                  <Link
                    href={withLocale(`/bookings/${bookingId}/pay`, locale)}
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold">
                      {isBn ? 'চেকআউটে ফিরুন' : 'Return to Checkout'}
                    </Button>
                  </Link>
                </>
              ) : (
                <Link
                  href={withLocale('/dashboard/student/requests', locale)}
                  className="w-full sm:w-auto"
                >
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold">
                    {isBn ? 'আমার বুকিং তালিকা' : 'My Bookings'}
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case 4: Pending / Verification In Progress */}
      {!isSucceeded && !isFailed && !isCancelled && (
        <Card className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-6 sm:p-8 text-center border-b border-border bg-muted/20 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
              <LoadingSpinner className="w-7 h-7 text-primary" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              {isBn ? 'যাচাইকরণ চলছে' : 'Verification In Progress'}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {isBn ? 'পেমেন্ট যাচাই করা হচ্ছে…' : 'Verifying Your Payment…'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto font-normal leading-relaxed">
              {isBn
                ? 'পেমেন্ট গেটওয়ে সার্ভার থেকে লেনদেনটি নিশ্চিত করা হচ্ছে। অনুগ্রহ করে অপেক্ষা করুন।'
                : 'We are querying the payment gateway server-to-server to confirm your transaction. Please hold on.'}
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-muted/20 p-5 flex flex-col gap-2 text-center text-xs">
              <p className="text-muted-foreground font-medium">
                {isBn
                  ? 'গেটওয়ে নিশ্চিতকরণ প্রাপ্ত হলে এই দৃশ্যটি স্বয়ংক্রিয়ভাবে আপডেট হবে।'
                  : 'This view will automatically refresh once the gateway confirmation arrives.'}
              </p>
              <p className="font-mono text-muted-foreground text-[11px]">Order #{orderId}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                onClick={refetch}
                disabled={isFetching}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold px-6"
                data-testid="result-check-status-btn"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                {isBn ? 'এখনই স্ট্যাটাস পরীক্ষা করুন' : 'Check Status Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
