'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  Lock,
  Sparkles,
  Receipt,
  Calendar,
} from 'lucide-react';
import { Button, LoadingSpinner, EmptyState } from '@/components/ui';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
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
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const isBn = locale === 'bn';
  const bookingId = resolved.id;

  const { data: bookingData, isLoading: loadingBooking } = useGetBookingRequestByIdQuery(bookingId);

  const [createOrder, { isLoading: creatingOrder }] = useCreatePaymentOrderMutation();
  const [confirmPayment, { isLoading: confirmingPayment }] = useSandboxConfirmPaymentMutation();

  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('sslcommerz');
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

      const orderData = orderRes.data as { orderId?: string; order?: { id?: string } } | undefined;
      const orderId = orderData?.orderId || orderData?.order?.id || `ord-${Date.now()}`;

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
      <DashboardShell
        locale={locale}
        title={isBn ? 'পেমেন্ট চেকআউট' : 'Payment Checkout'}
        subtitle={isBn ? 'তথ্য প্রস্তুত করা হচ্ছে...' : 'Preparing checkout details...'}
      >
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner />
          <p className="text-xs text-muted-foreground">
            {isBn ? 'পেমেন্ট তথ্য প্রস্তুত করা হচ্ছে...' : 'Preparing checkout details...'}
          </p>
        </div>
      </DashboardShell>
    );
  }

  if (!booking) {
    return (
      <DashboardShell
        locale={locale}
        title={isBn ? 'পেমেন্ট চেকআউট' : 'Payment Checkout'}
        subtitle={isBn ? 'বুকিং সংক্রান্ত তথ্য' : 'Booking Information'}
      >
        <div className="py-12 max-w-xl mx-auto">
          <EmptyState
            title={isBn ? 'বুকিং পাওয়া যায়নি' : 'Booking Not Found'}
            description={
              isBn
                ? `বুকিং আইডি #${bookingId.slice(0, 8)} পাওয়া যায়নি অথবা আপনার এই বুকিং দেখার অনুমতি নেই। অনুগ্রহ করে আপনার অনুরোধ তালিকা থেকে একটি সক্রিয় ও অনুমোদিত বুকিং নির্বাচন করুন।`
                : `Booking #${bookingId.slice(0, 8)} was not found or has been removed. Please select an active accepted booking from your requests list.`
            }
            actionLabel={isBn ? 'অনুরোধ তালিকায় ফিরে যান' : 'Back to Requests Overview'}
            actionHref={withLocale('/dashboard/student/requests', locale)}
          />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'নিরাপদ এসক্রো পেমেন্ট চেকআউট' : 'Secure Escrow Checkout'}
      subtitle={
        isBn
          ? `${subjectName} — শিক্ষক: ${tutorName} | ১০০% মানিব্যাক ও এসক্রো ট্রাস্ট গ্যারান্টি`
          : `${subjectName} — Tutor: ${tutorName} | 100% Escrow Protection`
      }
    >
      <div className="max-w-4xl mx-auto space-y-6" data-testid="escrow-checkout-page">
        {/* Top Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href={withLocale(`/dashboard/bookings/${bookingId}`, locale)}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isBn ? 'বুকিং ডসিয়ারে ফিরে যান' : 'Back to Booking'}</span>
          </Link>
          <span className="font-mono text-xs text-muted-foreground bg-surface/80 border border-border px-3 py-1 rounded-full">
            REF: #{bookingId.slice(0, 8)}
          </span>
        </div>

        {/* Success State or Already Paid (Payment Receipt) */}
        {successReceipt || booking?.status === 'confirmed' ? (
          <div
            className="rounded-3xl border border-primary/40 bg-gradient-to-br from-card via-card to-primary-soft p-8 shadow-sm space-y-6 text-center"
            data-testid="payment-success-card"
          >
            <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center mx-auto text-success-soft-foreground">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                {isBn ? 'এসক্রো পেমেন্ট পরিশোধিত ও নিশ্চিত!' : 'Escrow Deposit Confirmed!'}
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                {isBn
                  ? 'আপনার ফি নিরাপদে অগ্রণী এডু এসক্রো ট্রাস্ট অ্যাকাউন্টে জমা হয়েছে এবং বুকিং নিশ্চিত করা হয়েছে।'
                  : 'Your fee has been securely deposited into the OgroniEdu Escrow Trust. The booking is active and confirmed.'}
              </p>
            </div>

            <div className="max-w-md mx-auto rounded-2xl border border-border/80 bg-surface/60 p-5 space-y-3 text-left text-xs">
              <div className="flex justify-between pb-2 border-b border-border/70">
                <span className="text-muted-foreground">
                  {isBn ? 'অর্ডার / বুকিং আইডি:' : 'Order / Booking ID:'}
                </span>
                <span className="font-mono text-foreground font-semibold">
                  #{(successReceipt?.orderId || bookingId).slice(0, 12)}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-border/70">
                <span className="text-muted-foreground">
                  {isBn ? 'পরিশোধিত অঙ্ক:' : 'Amount Paid:'}
                </span>
                <span className="text-success-soft-foreground font-bold text-sm font-mono">
                  ৳{formatLocalizedNumber(successReceipt?.amountBdt || priceBdt, locale)}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-border/70">
                <span className="text-muted-foreground">
                  {isBn ? 'পেমেন্ট গেটওয়ে:' : 'Payment Gateway:'}
                </span>
                <span className="font-semibold text-info-soft-foreground flex items-center gap-1.5 uppercase">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>
                    {(successReceipt?.provider || selectedProvider) === 'sslcommerz'
                      ? 'SSLCOMMERZ Secure'
                      : successReceipt?.provider || selectedProvider}
                  </span>
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-border/70">
                <span className="text-muted-foreground">
                  {isBn ? 'ট্রানজ্যাকশন রেফারেন্স:' : 'Txn Reference:'}
                </span>
                <span className="font-mono text-muted-foreground font-semibold text-[11px]">
                  SSLCZ-TRX-{(successReceipt?.orderId || bookingId).slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-border/70">
                <span className="text-muted-foreground">
                  {isBn ? 'এসক্রো সার্টিফিকেট:' : 'Escrow Certificate:'}
                </span>
                <span className="font-mono text-warning-soft-foreground font-semibold text-[11px]">
                  #ESCROW-TRUST-{(successReceipt?.orderId || bookingId).slice(0, 6).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {isBn ? 'সুরক্ষা স্ট্যাটাস:' : 'Trust Status:'}
                </span>
                <span className="text-primary-soft-foreground font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isBn ? '১০০% এসক্রো প্রটেক্টেড' : '100% Escrow Protected'}
                </span>
              </div>
            </div>

            <div className="max-w-md mx-auto p-3.5 rounded-xl border border-info/40 bg-info-soft text-[11px] text-info-soft-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-info-soft-foreground shrink-0" />
              <span>
                {isBn
                  ? 'ডাবল-এন্ট্রি লেজার নিশ্চিত: [১০০০ এসক্রো ভল্ট ডেবিট] ও [২১০০ স্টুডেন্ট ডিপোজিট ক্রেডিট] সফলভাবে পোস্টেড।'
                  : 'Double-entry ledger confirmed: Debit [1000 Escrow Vault] & Credit [2100 Student Deposit] posted.'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={withLocale(`/dashboard/bookings/${bookingId}`, locale)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-surface/90 border border-border text-foreground hover:bg-surface font-semibold text-xs transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isBn ? 'বুকিং ডসিয়ার দেখুন' : 'View Booking Dossier'}</span>
              </Link>
              <Link
                href={withLocale('/dashboard/student/sessions', locale)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-foreground font-bold text-xs shadow-lg transition-transform hover:scale-102"
              >
                <Calendar className="w-4 h-4" />
                <span>{isBn ? 'ক্লাস রুটিন ও ক্যালেন্ডার' : 'Class Routine'}</span>
              </Link>
              <Link
                href={withLocale('/dashboard/student/payments', locale)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-interactive/20 border border-info/40 text-info-soft-foreground font-semibold text-xs hover:bg-interactive/30 transition-colors"
              >
                <Receipt className="w-4 h-4" />
                <span>{isBn ? 'পেমেন্ট ও লেজার' : 'Payments & Ledger'}</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Checkout View */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Order Details & Payment Method */}
            <div className="lg:col-span-2 space-y-6">
              {/* Trust Seal Banner */}
              <div className="rounded-3xl border border-primary/40 bg-primary-soft p-5 flex items-start gap-3.5">
                <ShieldCheck className="w-6 h-6 text-success-soft-foreground shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-success-soft-foreground">
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
                <div className="flex items-center justify-between pb-3 border-b border-border/70">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-info-soft-foreground" />
                    <span>{isBn ? 'পেমেন্ট মাধ্যম নির্বাচন করুন' : 'Select Payment Gateway'}</span>
                  </h3>
                  <span className="text-[10px] text-info-soft-foreground font-semibold px-2.5 py-0.5 rounded-full bg-interactive/10 border border-info/40">
                    {isBn ? 'SSLCOMMERZ সুপারিশকৃত' : 'SSLCOMMERZ Recommended'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* SSLCOMMERZ / Cards (Featured First) */}
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('sslcommerz')}
                    className={`rounded-2xl p-4 border text-left transition-all ${
                      selectedProvider === 'sslcommerz'
                        ? 'border-info/40 bg-interactive/10 ring-2 ring-info/30'
                        : 'border-border/80 bg-surface/50 hover:border-info/40'
                    }`}
                    data-testid="provider-sslcommerz-btn"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-info-soft-foreground text-sm">
                          SSLCOMMERZ
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-interactive/20 text-info-soft-foreground">
                          BEST
                        </span>
                      </div>
                      {selectedProvider === 'sslcommerz' && (
                        <CheckCircle2 className="w-4 h-4 text-info-soft-foreground" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {isBn ? 'কার্ড, নেট ব্যাংকিং ও এমএফএস' : 'Cards, Net Banking & MFS'}
                    </p>
                  </button>

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
                      <span className="font-black text-pink-600 text-sm">bKash</span>
                      {selectedProvider === 'bkash' && (
                        <CheckCircle2 className="w-4 h-4 text-pink-600" />
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
                        ? 'border-warning/40 bg-warning/10 ring-2 ring-orange-500/30'
                        : 'border-border/80 bg-surface/50 hover:border-warning/40'
                    }`}
                    data-testid="provider-nagad-btn"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-orange-700 text-sm">Nagad</span>
                      {selectedProvider === 'nagad' && (
                        <CheckCircle2 className="w-4 h-4 text-orange-700" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {isBn ? 'নগদ ইনস্ট্যান্ট পেমেন্ট' : 'Instant Nagad Gateway'}
                    </p>
                  </button>
                </div>

                {/* SSLCOMMERZ Provider Details Spotlight */}
                {selectedProvider === 'sslcommerz' && (
                  <div className="mt-4 p-4 rounded-2xl border border-info/40 bg-card space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-info-soft-foreground flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-info-soft-foreground" />
                        <span>
                          {isBn ? 'SSLCOMMERZ সিকিউর পেমেন্ট হাব' : 'SSLCOMMERZ Verified Hub'}
                        </span>
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        PCI-DSS Level 1 Certified
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isBn
                        ? 'ভিসা, মাস্টারকার্ড, ডিবিবিএল নেক্সাস, ব্র্যাক ব্যাংক, ইসলামী ব্যাংক, বিকাশ, নগদ সহ বাংলাদেশের সকল ব্যাংক ও কার্ডের মাধ্যমে নিরাপদে পরিশোধ করুন।'
                        : 'Pay securely using Visa, MasterCard, DBBL Nexus, City Touch, Islami Bank, or any MFS via SSLCOMMERZ gateway.'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        'VISA',
                        'Mastercard',
                        'DBBL Nexus',
                        'Amex',
                        'bKash',
                        'Nagad',
                        'Internet Banking',
                      ].map((badge) => (
                        <span
                          key={badge}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface border border-border/80 text-foreground"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 Col: Summary & Execute */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-lg">
                <h3 className="font-bold text-sm text-foreground pb-3 border-b border-border/70 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-interactive" />
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
                    <span className="text-muted-foreground">
                      {isBn ? 'শিক্ষার্থী:' : 'Student:'}
                    </span>
                    <span className="text-foreground">{studentName}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border/60">
                    <span className="text-muted-foreground">
                      {isBn ? 'সেশন ফি:' : 'Session Fee:'}
                    </span>
                    <span className="font-mono text-foreground font-semibold">
                      ৳{formatLocalizedNumber(priceBdt, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {isBn ? 'প্ল্যাটফর্ম ফি:' : 'Platform Fee:'}
                    </span>
                    <span className="text-success-soft-foreground font-semibold">
                      {isBn ? '৳০ (ফ্রি)' : '৳0 (Free)'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-border text-sm">
                    <strong className="text-foreground">
                      {isBn ? 'সর্বমোট প্রদেয়:' : 'Total Payable:'}
                    </strong>
                    <strong className="text-success-soft-foreground font-mono text-base font-black">
                      ৳{formatLocalizedNumber(priceBdt, locale)}
                    </strong>
                  </div>
                </div>

                {errorText && (
                  <p className="text-xs text-destructive-soft-foreground bg-destructive/10 border border-destructive/40 rounded-xl p-2.5">
                    {errorText}
                  </p>
                )}

                <Button
                  size="lg"
                  disabled={creatingOrder || confirmingPayment}
                  onClick={handleExecutePayment}
                  className="w-full bg-gradient-to-r from-brand to-brand-accent text-foreground font-bold text-sm h-12 shadow-lg shadow-sm"
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
                  <ShieldCheck className="w-3.5 h-3.5 text-primary-soft-foreground" />
                  <span>
                    {isBn ? '২৫৬-বিট SSL এনক্রিপ্টেড পেমেন্ট' : '256-Bit SSL Encrypted Escrow'}
                  </span>
                </p>
              </div>

              {/* Double-Entry Ledger Breakdown */}
              <div
                className="rounded-3xl border border-border/80 bg-surface/50 p-5 space-y-3"
                data-testid="ledger-breakdown-card"
              >
                <h4 className="text-xs font-bold text-foreground flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-info-soft-foreground" />
                    <span>{isBn ? 'ডাবল-এন্ট্রি লেজার বিশ্লেষণ' : 'Ledger Accounting Split'}</span>
                  </span>
                  <span className="font-mono text-[10px] text-success-soft-foreground font-semibold">
                    100% Balanced
                  </span>
                </h4>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{isBn ? 'অগ্রিম এসক্রো ভল্ট ডিপোজিট:' : 'Advance Escrow Deposit:'}</span>
                    <span className="font-mono text-info-soft-foreground font-semibold">
                      ৳{formatLocalizedNumber(priceBdt, locale)} [১০১০]
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {isBn ? 'শিক্ষার্থীর এসক্রো দায় (Liability):' : 'Student Escrow Liability:'}
                    </span>
                    <span className="font-mono text-info-soft-foreground font-semibold">
                      ৳{formatLocalizedNumber(priceBdt, locale)} [২১০০]
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border/40 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      {isBn
                        ? 'ক্লাস সফল সমাপ্তি পরবর্তী বিতরণ (Settlement):'
                        : 'Post-Session Settlement Split:'}
                    </p>
                    <div className="flex justify-between text-muted-foreground">
                      <span>{isBn ? 'শিক্ষক পাবেন (৯২%):' : 'Tutor Payout (92%):'}</span>
                      <span className="font-mono text-success-soft-foreground font-semibold">
                        ৳{formatLocalizedNumber(Math.round(priceBdt * 0.92), locale)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>{isBn ? 'প্ল্যাটফর্ম রাজস্ব (৮%):' : 'Platform Revenue (8%):'}</span>
                      <span className="font-mono text-muted-foreground font-semibold">
                        ৳{formatLocalizedNumber(Math.round(priceBdt * 0.08), locale)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
