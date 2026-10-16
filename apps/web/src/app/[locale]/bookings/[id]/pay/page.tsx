'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Lock,
  Sparkles,
  ExternalLink,
  Receipt,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';
import { useGetBookingRequestByIdQuery } from '@/store/services/bookings-api';
import {
  useCreatePaymentOrderMutation,
  useSandboxConfirmPaymentMutation,
  type PaymentProvider,
} from '@/store/services/payments-api';
import { playAudioTone } from '@/lib/audio/notification-sound';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';

interface BookingPayPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default function BookingPayPage({ params }: BookingPayPageProps) {
  const router = useRouter();
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const isBn = locale === 'bn';
  const bookingId = resolved.id;

  const { data: bookingData, isLoading: loadingBooking } =
    useGetBookingRequestByIdQuery(bookingId);

  const [createOrder, { isLoading: creatingOrder }] = useCreatePaymentOrderMutation();
  const [confirmPayment, { isLoading: confirmingPayment }] = useSandboxConfirmPaymentMutation();

  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('bkash');
  const [successReceipt, setSuccessReceipt] = useState<{
    orderId: string;
    amountBdt: number;
    provider: string;
  } | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const booking = bookingData?.data;
  const priceBdt = booking?.pricePerSessionMinor
    ? Math.round(Number(booking.pricePerSessionMinor) / 100)
    : 1200;

  const subjectName = isBn
    ? booking?.subject?.nameBn || booking?.subject?.name || 'টিউটরিং বিষয়'
    : booking?.subject?.name || 'Tuition Subject';
  const tutorName =
    booking?.tutorProfile?.user?.displayName ||
    booking?.tutorProfile?.user?.fullName ||
    (isBn ? 'নির্ধারিত শিক্ষক' : 'Assigned Tutor');
  const studentName =
    booking?.studentUser?.displayName ||
    booking?.studentUser?.fullName ||
    (isBn ? 'শিক্ষার্থী' : 'Student');

  async function handleExecutePayment() {
    setErrorText(null);
    try {
      const idempotencyKey = `pay-${bookingId}-${Date.now()}`;
      const orderRes = await createOrder({
        body: { bookingId, provider: selectedProvider },
        idempotencyKey,
      }).unwrap();

      const orderData = orderRes.data as { order?: { id?: string } } | undefined;
      const orderId = orderData?.order?.id || `ord-${Date.now()}`;

      // Simulate instantaneous gateway confirmation in dev/sandbox
      await confirmPayment({ orderId, provider: selectedProvider }).unwrap();

      playAudioTone('success');
      setSuccessReceipt({
        orderId,
        amountBdt: priceBdt,
        provider: selectedProvider,
      });
    } catch {
      setErrorText(
        isBn
          ? 'পেমেন্ট প্রসেসিং ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
          : 'Payment processing failed. Please retry.',
      );
      playAudioTone('alert');
    }
  }

  if (loadingBooking) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <LoadingSpinner />
        <p className="text-xs text-muted-foreground">
          {isBn ? 'পেমেন্ট তথ্য প্রস্তুত করা হচ্ছে...' : 'Preparing checkout details...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6" data-testid="escrow-checkout-page">
        {/* Top Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href={withLocale(`/bookings/${bookingId}`, locale)}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isBn ? 'বুকিং ডসিয়ারে ফিরে যান' : 'Back to Booking'}</span>
          </Link>
          <span className="font-mono text-xs text-muted-foreground bg-surface/80 border border-border px-3 py-1 rounded-full">
            REF: #{bookingId.slice(0, 8)}
          </span>
        </div>

        {/* Success State (Payment Receipt) */}
        {successReceipt ? (
          <div
            className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-card via-card to-emerald-950/20 p-8 shadow-2xl space-y-6 text-center"
            data-testid="payment-success-card"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {isBn ? 'এসক্রো পেমেন্ট সফল হয়েছে!' : 'Escrow Deposit Succeeded!'}
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                {isBn
                  ? 'আপনার ফি নিরাপদে অগ্রণী এডু এসক্রো ট্রাস্ট অ্যাকাউন্টে জমা হয়েছে এবং বুকিং নিশ্চিত করা হয়েছে।'
                  : 'Your fee has been securely deposited into the OgroniEdu Escrow Trust. The booking is now confirmed.'}
              </p>
            </div>

            <div className="max-w-md mx-auto rounded-2xl border border-border/80 bg-surface/60 p-5 space-y-3 text-left text-xs">
              <div className="flex justify-between pb-2 border-b border-border/70">
                <span className="text-muted-foreground">{isBn ? 'অর্ডার আইডি:' : 'Order ID:'}</span>
                <span className="font-mono text-foreground font-semibold">
                  #{successReceipt.orderId.slice(0, 12)}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-border/70">
                <span className="text-muted-foreground">{isBn ? 'পরিশোধিত অঙ্ক:' : 'Amount Paid:'}</span>
                <span className="text-emerald-400 font-bold text-sm font-mono">
                  ৳{formatLocalizedNumber(successReceipt.amountBdt, locale)}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-border/70">
                <span className="text-muted-foreground">{isBn ? 'পেমেন্ট মেথড:' : 'Method:'}</span>
                <span className="font-semibold text-foreground uppercase">
                  {successReceipt.provider}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isBn ? 'সুরক্ষা স্ট্যাটাস:' : 'Trust Status:'}</span>
                <span className="text-teal-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isBn ? '১০০% এসক্রো প্রটেক্টেড' : '100% Escrow Protected'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href={withLocale(`/bookings/${bookingId}`, locale)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-primary text-slate-950 font-bold text-xs shadow-lg transition-transform hover:scale-102"
              >
                <Calendar className="w-4 h-4" />
                <span>{isBn ? 'ক্লাস রুটিন ও ক্যালেন্ডার দেখুন' : 'View Class Routine'}</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Checkout View */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Order Details & Payment Method */}
            <div className="lg:col-span-2 space-y-6">
              {/* Trust Seal Banner */}
              <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-5 flex items-start gap-3.5">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-emerald-300">
                    {isBn ? '১০০% নিরাপদ এসক্রো গ্যারান্টি' : '100% Escrow Protection'}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isBn
                      ? 'আপনার টাকা সরাসরি শিক্ষকের অ্যাকাউন্টে যাবে না। ক্লাস শেষ হওয়া ও আপনার অনুমোদনের পর শিক্ষক পারিশ্রমিক পাবেন। অসন্তোষে রয়েছে ১০০% রিফান্ড গ্যারান্টি।'
                      : 'Funds are securely locked in escrow. Payout is released to the tutor only after sessions are completed to your satisfaction.'}
                  </p>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2 pb-3 border-b border-border/70">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span>{isBn ? 'পেমেন্ট মাধ্যম নির্বাচন করুন' : 'Select Payment Gateway'}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* bKash */}
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('bkash')}
                    className={`rounded-2xl p-4 border text-left transition-all ${
                      selectedProvider === 'bkash'
                        ? 'border-pink-500 bg-pink-500/10 ring-2 ring-pink-500/30'
                        : 'border-border/80 bg-surface/50 hover:border-pink-500/40'
                    }`}
                    data-testid="provider-bkash-btn"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-pink-500 text-sm">bKash</span>
                      {selectedProvider === 'bkash' && (
                        <CheckCircle2 className="w-4 h-4 text-pink-500" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {isBn ? 'বিকাশ ইনস্ট্যান্ট পেমেন্ট' : 'Instant bKash Gateway'}
                    </p>
                  </button>

                  {/* Nagad */}
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('nagad')}
                    className={`rounded-2xl p-4 border text-left transition-all ${
                      selectedProvider === 'nagad'
                        ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30'
                        : 'border-border/80 bg-surface/50 hover:border-orange-500/40'
                    }`}
                    data-testid="provider-nagad-btn"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-orange-500 text-sm">Nagad</span>
                      {selectedProvider === 'nagad' && (
                        <CheckCircle2 className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {isBn ? 'নগদ ইনস্ট্যান্ট পেমেন্ট' : 'Instant Nagad Gateway'}
                    </p>
                  </button>

                  {/* SSLCOMMERZ / Cards */}
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('sslcommerz')}
                    className={`rounded-2xl p-4 border text-left transition-all ${
                      selectedProvider === 'sslcommerz'
                        ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30'
                        : 'border-border/80 bg-surface/50 hover:border-cyan-500/40'
                    }`}
                    data-testid="provider-sslcommerz-btn"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-cyan-400 text-sm">Cards & Bank</span>
                      {selectedProvider === 'sslcommerz' && (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {isBn ? 'ভিসা / মাস্টারকার্ড' : 'Visa / Master / Banking'}
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Summary & Execute */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-lg">
                <h3 className="font-bold text-sm text-foreground pb-3 border-b border-border/70 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-purple-400" />
                  <span>{isBn ? 'বুকিং ও ফি বিবরণী' : 'Order Summary'}</span>
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isBn ? 'বিষয়:' : 'Subject:'}</span>
                    <strong className="text-foreground">{subjectName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isBn ? 'শিক্ষক:' : 'Tutor:'}</span>
                    <span className="text-foreground">{tutorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isBn ? 'শিক্ষার্থী:' : 'Student:'}</span>
                    <span className="text-foreground">{studentName}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border/60">
                    <span className="text-muted-foreground">{isBn ? 'সেশন ফি:' : 'Session Fee:'}</span>
                    <span className="font-mono text-foreground font-semibold">
                      ৳{formatLocalizedNumber(priceBdt, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isBn ? 'প্ল্যাটফর্ম ফি:' : 'Platform Fee:'}</span>
                    <span className="text-emerald-400 font-semibold">{isBn ? '৳০ (ফ্রি)' : '৳0 (Free)'}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-border text-sm">
                    <strong className="text-foreground">{isBn ? 'সর্বমোট প্রদেয়:' : 'Total Payable:'}</strong>
                    <strong className="text-emerald-400 font-mono text-base font-black">
                      ৳{formatLocalizedNumber(priceBdt, locale)}
                    </strong>
                  </div>
                </div>

                {errorText && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
                    {errorText}
                  </p>
                )}

                <Button
                  size="lg"
                  disabled={creatingOrder || confirmingPayment}
                  onClick={handleExecutePayment}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-sm h-12 shadow-lg shadow-emerald-500/20"
                  data-testid="execute-escrow-payment-btn"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  <span>
                    {creatingOrder || confirmingPayment
                      ? isBn
                        ? 'পেমেন্ট সম্পন্ন হচ্ছে...'
                        : 'Processing...'
                      : isBn
                        ? `নিরাপদে ৳${formatLocalizedNumber(priceBdt, locale)} পরিশোধ করুন`
                        : `Pay ৳${formatLocalizedNumber(priceBdt, locale)} Safely`}
                  </span>
                </Button>

                <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>{isBn ? '২৫৬-বিট SSL এনক্রিপ্টেড পেমেন্ট' : '256-Bit SSL Encrypted Escrow'}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
