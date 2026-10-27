'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  FileText,
  Printer,
  ShieldCheck,
  ChevronLeft,
  Calendar,
  Lock,
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
    isPending,
    isTimedOut,
    refetch,
    isFetching,
  } = usePaymentStatus({
    orderId,
    enabled: true,
  });

  const effectiveStatus = currentStatus || initialStatus || 'pending';
  const bookingId = order?.bookingId || propBookingId;
  const amountMinor = order?.amountMinor || 0;
  const currency = order?.currency || 'BDT';
  const receipt = order?.receipt;
  const tutorName = order?.booking?.tutorName || receipt?.tutorName || (isBn ? 'শিক্ষক' : 'Tutor');
  const subjectName =
    order?.booking?.subjectName || receipt?.subjectName || (isBn ? 'বিষয়' : 'Subject');

  // Handle Printable Invoice
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (isLoading && !order) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-900">
        <LoadingSpinner className="w-10 h-10 text-blue-600" />
        <p className="text-sm font-bold text-slate-600">
          {isBn
            ? 'পেমেন্টের সর্বশেষ অবস্থা ব্যাকএন্ড থেকে যাচাই করা হচ্ছে…'
            : 'Verifying authoritative payment status with backend…'}
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{isBn ? 'বুকিং বিবরণে ফিরুন' : 'Back to booking details'}</span>
        </Link>
      )}

      {/* Case 1: Verified Succeeded Payment */}
      {isSucceeded && (
        <Card className="rounded-3xl border-2 border-emerald-500/30 bg-white shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 p-6 sm:p-8 text-white text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-inner">
              <CheckCircle2 className="w-9 h-9 text-white stroke-[2.5]" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-white/25 border border-white/40 uppercase tracking-wider">
              {isBn ? 'যাচাইকৃত লেনদেন' : 'Authoritatively Verified'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              {isBn ? 'পেমেন্ট সফল হয়েছে!' : 'Payment Succeeded!'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-md mx-auto mt-1.5 font-medium leading-relaxed">
              {isBn
                ? 'পেমেন্ট গেটওয়ে লেনদেন নিশ্চিত করেছে এবং আপনার বুকিং সফলভাবে কনফার্ম করা হয়েছে।'
                : 'The payment was verified by the provider and your tuition booking is confirmed.'}
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 flex flex-col gap-6">
            {/* Payment & Booking Breakdown */}
            <div className="rounded-2xl border border-border bg-surface-muted p-5 flex flex-col gap-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                {isBn ? 'লেনদেন সারসংক্ষেপ' : 'Transaction Summary'}
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <dt className="text-slate-500 font-medium">
                    {isBn ? 'অর্ডার রেফারেন্স' : 'Order Reference'}
                  </dt>
                  <dd className="font-mono font-bold text-slate-900 mt-0.5 break-all">{orderId}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-medium">
                    {isBn ? 'প্রদেয় পরিমাণ' : 'Amount Paid'}
                  </dt>
                  <dd className="text-base font-black text-slate-900 mt-0.5">
                    {formatBDTMinor(amountMinor, locale)} {currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-medium">{isBn ? 'শিক্ষক' : 'Tutor'}</dt>
                  <dd className="font-extrabold text-slate-900 mt-0.5">{tutorName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-medium">{isBn ? 'বিষয়' : 'Subject'}</dt>
                  <dd className="font-extrabold text-slate-900 mt-0.5">{subjectName}</dd>
                </div>
                {order?.verifiedAt && (
                  <div>
                    <dt className="text-slate-500 font-medium">
                      {isBn ? 'যাচাইয়ের সময়' : 'Verified At'}
                    </dt>
                    <dd className="font-semibold text-slate-700 mt-0.5">
                      {new Date(order.verifiedAt).toLocaleString(
                        locale === 'bn' ? 'bn-BD' : 'en-US',
                      )}
                    </dd>
                  </div>
                )}
                {receipt?.invoiceNumber && (
                  <div>
                    <dt className="text-slate-500 font-medium">
                      {isBn ? 'ইনভয়েস নম্বর' : 'Invoice Number'}
                    </dt>
                    <dd className="font-mono font-bold text-blue-700 mt-0.5">
                      {receipt.invoiceNumber}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Escrow Guarantee Notice */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center gap-3 text-xs text-emerald-900 font-medium">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>
                {isBn
                  ? 'আপনার অর্থ অগ্রণী এডু এসক্রো অ্যাকাউন্টে সুরক্ষিত রয়েছে। সেশন সম্পন্ন না হওয়া পর্যন্ত শিক্ষক কোনো অর্থ উত্তোলন করতে পারবেন না।'
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
                      className="w-full rounded-xl font-bold border-slate-300 text-slate-800"
                    >
                      <FileText className="w-4 h-4 mr-1.5" />
                      {isBn ? 'অফিশিয়াল ইনভয়েস' : 'Official Invoice'}
                    </Button>
                  </a>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="rounded-xl font-bold border-slate-300 text-slate-800"
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
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md shadow-emerald-600/20"
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
        <Card className="rounded-3xl border-2 border-rose-500/30 bg-white shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-rose-500 via-red-600 to-rose-600 p-6 sm:p-8 text-white text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-inner">
              <XCircle className="w-9 h-9 text-white stroke-[2.5]" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-white/25 border border-white/40 uppercase tracking-wider">
              {isBn ? 'ব্যর্থ লেনদেন' : 'Transaction Failed'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              {isBn ? 'পেমেন্ট সম্পন্ন করা যায়নি' : 'Payment Could Not Be Completed'}
            </h1>
            <p className="text-xs sm:text-sm text-rose-100 max-w-md mx-auto mt-1.5 font-medium leading-relaxed">
              {isBn
                ? 'পেমেন্ট গেটওয়ে বা ব্যাংক লেনদেনটি বাতিল করেছে। আপনার অ্যাকাউন্ট থেকে কোনো টাকা কাটা হয়নি।'
                : 'The payment provider or your bank declined the transaction. No funds were debited.'}
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 flex flex-col gap-6">
            <div className="rounded-2xl border border-border bg-surface-muted p-5 flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">
                  {isBn ? 'অর্ডার রেফারেন্স' : 'Order Reference'}
                </span>
                <span className="font-mono font-bold text-slate-800">{orderId}</span>
              </div>
              {order?.failureReason && (
                <div className="flex justify-between items-center text-rose-700 font-semibold">
                  <span>{isBn ? 'ব্যর্থতার কারণ' : 'Reason'}</span>
                  <span>{order.failureReason}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Link href={withLocale('/dashboard/support', locale)} className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full rounded-xl font-bold">
                  {isBn ? 'সহায়তা কেন্দ্রে যোগাযোগ করুন' : 'Contact Support'}
                </Button>
              </Link>

              {bookingId && (
                <Link
                  href={withLocale(`/bookings/${bookingId}/pay`, locale)}
                  className="w-full sm:w-auto"
                >
                  <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black shadow-md shadow-rose-600/20">
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    {isBn ? 'আবার পেমেন্ট করার চেষ্টা করুন' : 'Try Payment Again'}
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case 3: Cancelled Payment */}
      {isCancelled && (
        <Card className="rounded-3xl border-2 border-amber-500/30 bg-white shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 sm:p-8 text-white text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-inner">
              <AlertTriangle className="w-9 h-9 text-white stroke-[2.5]" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-white/25 border border-white/40 uppercase tracking-wider">
              {isBn ? 'বাতিলকৃত' : 'Cancelled'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              {isBn ? 'পেমেন্ট বাতিল করা হয়েছে' : 'Payment Was Cancelled'}
            </h1>
            <p className="text-xs sm:text-sm text-amber-100 max-w-md mx-auto mt-1.5 font-medium leading-relaxed">
              {isBn
                ? 'আপনি লেনদেনটি সম্পন্ন করেননি। আপনার বুকিং সংরক্ষিত রয়েছে এবং আপনি যেকোনো সময় পেমেন্ট সম্পন্ন করতে পারবেন।'
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
                    <Button variant="outline" size="sm" className="w-full rounded-xl font-bold">
                      {isBn ? 'বুকিংয়ে ফিরুন' : 'Back to Booking'}
                    </Button>
                  </Link>

                  <Link
                    href={withLocale(`/bookings/${bookingId}/pay`, locale)}
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-md shadow-blue-600/20">
                      {isBn ? 'চেকআউটে ফিরুন' : 'Return to Checkout'}
                    </Button>
                  </Link>
                </>
              ) : (
                <Link
                  href={withLocale('/dashboard/student/requests', locale)}
                  className="w-full sm:w-auto"
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black">
                    {isBn ? 'আমার বুকিং তালিকা' : 'My Bookings'}
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case 4: Pending / Verification In Progress */}
      {isPending && (
        <Card className="rounded-3xl border-2 border-blue-500/30 bg-white shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 sm:p-8 text-white text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-inner">
              <Clock className="w-9 h-9 text-white stroke-[2.5] animate-pulse" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-white/25 border border-white/40 uppercase tracking-wider">
              {isBn ? 'যাচাইকরণ প্রক্রিয়াধীন' : 'Verification In Progress'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              {isBn ? 'পেমেন্ট যাচাই করা হচ্ছে…' : 'Verifying Your Payment…'}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-md mx-auto mt-1.5 font-medium leading-relaxed">
              {isBn
                ? 'পেমেন্ট গেটওয়ের সাথে স্বয়ংক্রিয় যাচাই চলছে। দয়া করে কয়েক সেকেন্ড অপেক্ষা করুন।'
                : 'We are querying the payment gateway server-to-server to confirm your transaction. Please hold on.'}
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 flex flex-col gap-6">
            <div className="rounded-2xl border border-border bg-surface-muted p-5 flex flex-col gap-2 text-center text-xs">
              <p className="text-slate-600 font-medium">
                {isBn
                  ? 'লেনদেন নিশ্চিত হলে এই পেজটি স্বয়ংক্রিয়ভাবে আপডেট হবে।'
                  : 'This view will automatically refresh once the gateway confirmation arrives.'}
              </p>
              <p className="font-mono text-slate-500 text-[11px]">Order #{orderId}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                onClick={refetch}
                disabled={isFetching}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold px-6"
                data-testid="result-check-status-btn"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                {isBn ? 'এখনই স্ট্যাটাস যাচাই করুন' : 'Check Status Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
