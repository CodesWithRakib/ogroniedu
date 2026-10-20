'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { PaymentCheckoutView } from '@/components/payments/PaymentCheckoutView';
import { PaymentReceipt } from '../components/paymentReceipt';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Alert,
  AlertDescription,
  LoadingSpinner,
  EmptyState,
} from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import { usePaymentOrder, type PaymentProvider } from '../hooks/use-payment-order';

/**
 * Payments entry: Comprehensive Due Tuition vs. Paid History Hub,
 * escrow guarantees, and seamless sandbox/production checkout.
 */
function PaymentsContent({ locale }: { locale: Locale }) {
  const pay = usePaymentOrder(locale);
  const { dict, order, bookingOptions } = pay;
  const isBn = locale === 'bn';

  const paidCount =
    (pay.paidOrders?.length ?? 0) > 0 ? pay.paidOrders.length : (pay.paidBookings?.length ?? 0);
  const dueCount = pay.dueBookings?.length ?? 0;

  const [receiptModalOpen, setReceiptModalOpen] = React.useState(false);

  const openReceipt = async (orderId: string) => {
    await pay.handleViewReceipt(orderId);
    setReceiptModalOpen(true);
  };

  return (
    <DashboardShell locale={locale} title={dict.payments.title} subtitle={dict.payments.subtitle}>
      {/* 1. Security & Escrow Trust Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/25 text-primary shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
              {isBn ? '১০০% নিরাপদ এসক্রো পেমেন্ট সুরক্ষা' : '100% Escrow Protected Payments'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed font-normal">
              {isBn
                ? 'ক্লাস সন্তোষজনকভাবে সম্পন্ন না হওয়া পর্যন্ত আপনার অর্থ অগ্রণী এডু এসক্রো অ্যাকাউন্টে সুরক্ষিত থাকে।'
                : 'Your tuition fees remain safely in escrow until sessions are successfully conducted.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-foreground font-semibold text-xs px-3.5 py-2 rounded-xl bg-surface border border-border shrink-0 self-start sm:self-auto">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>bKash • Nagad • SSLCommerz</span>
        </div>
      </div>

      {/* 2. Top Metric KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Card 1: Payment Due */}
        <div
          onClick={() => pay.setActiveTab('due')}
          className={`cursor-pointer p-4 sm:p-5 rounded-2xl border transition-all ${
            pay.activeTab === 'due'
              ? 'bg-warning-soft border-warning/40 ring-1 ring-warning/30 shadow-xs'
              : 'bg-card border-border hover:border-warning/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {isBn ? 'পরিশোধের অপেক্ষায় (বকেয়া)' : 'Payment Due / Pending'}
            </span>
            <div className="h-8 w-8 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-xl sm:text-2xl font-black text-foreground">
              ৳{' '}
              {formatLocalizedNumber(Math.round(pay.totalDueMinor / 100).toLocaleString(), locale)}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 font-medium flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-warning animate-pulse" />
              <span>
                {isBn
                  ? `${formatLocalizedNumber(pay.dueBookings.length, locale)}টি টিউশন ফি পরিশোধ করুন`
                  : `${pay.dueBookings.length} tuition(s) awaiting payment`}
              </span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Paid */}
        <div
          onClick={() => pay.setActiveTab('paid')}
          className={`cursor-pointer p-4 sm:p-5 rounded-2xl border transition-all ${
            pay.activeTab === 'paid'
              ? 'bg-success-soft border-success/40 ring-1 ring-success/30 shadow-xs'
              : 'bg-card border-border hover:border-success/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {isBn ? 'মোট পরিশোধিত ফি' : 'Total Paid History'}
            </span>
            <div className="h-8 w-8 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-xl sm:text-2xl font-black text-foreground">
              ৳{' '}
              {formatLocalizedNumber(Math.round(pay.totalPaidMinor / 100).toLocaleString(), locale)}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 font-medium flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-success" />
              <span>
                {isBn
                  ? `${formatLocalizedNumber(paidCount, locale)}টি সফল পেমেন্ট ও রশিদ সংরক্ষিত`
                  : `${paidCount} successful payment(s)`}
              </span>
            </p>
          </div>
        </div>

        {/* Card 3: Escrow Balance / Guarantee */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {isBn ? 'এসক্রো নিরাপত্তা স্তর' : 'Escrow Protection'}
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-xl sm:text-2xl font-black text-foreground">
              {isBn ? '১০০% সুরক্ষিত' : '100% Protected'}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {isBn ? 'বাংলাদেশ ব্যাংক ও দ্বৈত লেজার জামানত' : 'Double-entry ledger verified'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Navigation / Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-muted/40 rounded-2xl border border-border mb-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => pay.setActiveTab('due')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            pay.activeTab === 'due'
              ? 'bg-card text-foreground shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className={`w-3.5 h-3.5 ${pay.dueBookings.length > 0 ? 'text-warning' : ''}`} />
          <span>{isBn ? 'বকেয়া ও পরিশোধযোগ্য' : 'Due & Pending Payments'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              pay.dueBookings.length > 0
                ? 'bg-warning/15 text-warning-soft-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {formatLocalizedNumber(pay.dueBookings.length, locale)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => pay.setActiveTab('paid')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            pay.activeTab === 'paid'
              ? 'bg-card text-foreground shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          <span>{isBn ? 'পরিশোধিত তালিকা ও রশিদ' : 'Paid Tuitions & Receipts'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-success/15 text-success-soft-foreground">
            {formatLocalizedNumber(paidCount, locale)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => pay.setActiveTab('checkout')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            pay.activeTab === 'checkout'
              ? 'bg-card text-foreground shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'পেমেন্ট চেকআউট' : 'Make Payment / Checkout'}</span>
        </button>
      </div>

      {/* 4. Tab 1: Due & Pending Payments ("kongula payment korte hbe") */}
      {pay.activeTab === 'due' && (
        <div className="space-y-4">
          {pay.requests.isLoading ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : pay.dueBookings.length === 0 ? (
            <Card className="rounded-2xl border-border bg-card p-8 sm:p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-success-soft text-success flex items-center justify-center mx-auto mb-4 border border-success/20">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-foreground">
                {isBn ? 'কোনো বকেয়া পেমেন্ট নেই!' : 'No Pending Payments Due!'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                {isBn
                  ? 'আপনার সমস্ত অনুমোদিত টিউশনের ফি পরিশোধ করা হয়েছে। নতুন শিক্ষকের সাথে ক্লাস শুরু করতে বুকিং অনুরোধ পাঠান।'
                  : 'All your accepted tuitions are up to date. Send new tuition requests to connect with expert tutors.'}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => pay.setActiveTab('paid')}
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-semibold"
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  <span>{isBn ? 'পরিশোধিত তালিকা দেখুন' : 'View Paid History'}</span>
                </Button>
                <Button asChild size="sm" className="rounded-xl font-bold bg-primary text-white">
                  <Link href={withLocale('/tutors', locale)}>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    <span>{isBn ? 'শিক্ষক খুঁজুন' : 'Find Tutors'}</span>
                  </Link>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pay.dueBookings.map((b) => {
                const tutorName =
                  b.tutorProfile?.user?.displayName ||
                  b.tutorProfile?.user?.fullName ||
                  (isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified Tutor');
                const subjectName =
                  (isBn ? b.subject?.nameBn : b.subject?.name) ||
                  b.subject?.nameBn ||
                  b.subject?.name ||
                  (isBn ? 'বিষয়' : 'Subject');
                const educationLevel =
                  (isBn ? b.educationLevel?.nameBn : b.educationLevel?.name) ||
                  b.educationLevel?.name ||
                  '';
                const rate = Number(b.pricePerSessionMinor)
                  ? (Number(b.pricePerSessionMinor) / 100).toFixed(0)
                  : '1,000';

                return (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl bg-card border-2 border-warning/30 hover:border-warning/60 transition-all shadow-xs flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-warning-soft text-warning-soft-foreground border border-warning/20 mb-2">
                            <Clock className="w-3 h-3" />
                            <span>{isBn ? 'পরিশোধ প্রয়োজন' : 'Payment Due'}</span>
                          </span>
                          <h4 className="text-base font-extrabold text-foreground truncate">
                            {tutorName}
                          </h4>
                          <p className="text-xs font-semibold text-primary mt-0.5 truncate">
                            {subjectName} {educationLevel ? `• ${educationLevel}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            {isBn ? 'ফি / ক্লাস' : 'Per Session'}
                          </span>
                          <span className="text-lg font-black text-foreground">
                            ৳ {formatLocalizedNumber(rate, locale)}
                          </span>
                        </div>
                      </div>

                      {b.tutorProfile?.headline && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed bg-muted/20 p-2.5 rounded-xl border border-border">
                          {b.tutorProfile.headline}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {isBn ? 'অনুরোধ তারিখ:' : 'Requested:'}{' '}
                          <span className="font-semibold text-foreground">
                            {formatDate(b.createdAt, locale)}
                          </span>
                        </span>
                        <span className="font-mono text-muted-foreground">#{b.id.slice(0, 8)}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-muted-foreground">
                        {isBn ? 'এসক্রো সুরক্ষা সক্রিয়' : 'Escrow Protected'}
                      </span>
                      <Button
                        type="button"
                        onClick={() => pay.selectBookingForPayment(b.id)}
                        className="bg-primary hover:bg-primary-hover text-white text-xs font-bold h-10 px-5 rounded-xl shadow-xs flex items-center gap-1.5"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>{isBn ? 'এখনই পরিশোধ করুন' : 'Pay Now'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Paid History & Receipts ("kongula paid kore felche") */}
      {pay.activeTab === 'paid' && (
        <div className="space-y-4">
          {pay.ordersQuery.isLoading || pay.requests.isLoading ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : pay.paidOrders.length === 0 && pay.paidBookings.length === 0 ? (
            <Card className="rounded-2xl border-border bg-card p-8 sm:p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/40 text-muted-foreground flex items-center justify-center mx-auto mb-4 border border-border">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-foreground">
                {isBn ? 'এখনও কোনো পেমেন্ট রেকর্ড নেই' : 'No Payment History Found'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                {isBn
                  ? 'আপনার কোনো টিউশন ফি পরিশোধ করা হলে এখানে রসিদ এবং ট্রানজ্যাকশন হিস্টোরি প্রদর্শিত হবে।'
                  : 'When you pay tuition fees, verified receipts and transaction references will appear here.'}
              </p>
            </Card>
          ) : (
            <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-border bg-muted/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                    {isBn ? 'পরিশোধিত টিউশন ও আর্থিক রেকর্ড' : 'Paid Tutoring & Escrow Ledger'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isBn
                      ? 'সম্পন্ন করা পেমেন্টের বিবরণ ও রসিদ কপি'
                      : 'Verified transactions and downloadable receipts'}
                  </p>
                </div>
                <span className="text-xs font-bold text-success-soft-foreground bg-success-soft border border-success/20 px-3 py-1 rounded-full">
                  {isBn
                    ? `${formatLocalizedNumber(paidCount, locale)}টি সম্পন্ন`
                    : `${paidCount} Completed`}
                </span>
              </div>

              <div className="divide-y divide-border">
                {pay.paidOrders.map((ord) => {
                  const b = ord.booking;
                  const tutorName =
                    b?.tutorProfile?.user?.displayName ||
                    (isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified Tutor');
                  const subjectName =
                    (isBn ? b?.subject?.nameBn : b?.subject?.nameEn) ||
                    b?.subject?.nameEn ||
                    (isBn ? 'টিউশন কোর্স' : 'Tutoring Course');
                  const amount = (Number(ord.amountMinor) / 100).toFixed(0);
                  const txnId =
                    ord.transactions?.[0]?.providerTransactionId ||
                    `ORD-${ord.id.slice(0, 8).toUpperCase()}`;

                  return (
                    <div
                      key={ord.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/15 transition-colors"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-success-soft text-success border border-success/25 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-foreground truncate">
                              {tutorName}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-soft text-success-soft-foreground border border-success/25">
                              {isBn ? 'পরিশোধিত (এসক্রো সুরক্ষিত)' : 'Paid (Escrow Safe)'}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-muted-foreground mt-0.5 truncate">
                            {subjectName} • {formatDate(ord.createdAt, locale)}
                          </p>
                          <p className="text-[11px] font-mono text-muted-foreground mt-1">
                            Ref: {txnId} • Gateway:{' '}
                            <span className="font-bold uppercase text-foreground">
                              {ord.provider}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                        <div className="text-left sm:text-right">
                          <span className="text-base sm:text-lg font-black text-foreground block">
                            ৳ {formatLocalizedNumber(amount, locale)}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {ord.currency}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openReceipt(ord.id)}
                          data-testid="view-receipt-btn"
                          className="rounded-xl text-xs font-semibold h-9"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1 text-primary" />
                          <span>{isBn ? 'রশিদ দেখুন' : 'View Receipt'}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* Also render paid bookings if not yet in paidOrders array */}
                {pay.paidBookings
                  .filter((b) => !pay.paidOrders.some((o) => o.bookingId === b.id))
                  .map((b) => {
                    const tutorName =
                      b.tutorProfile?.user?.displayName ||
                      (isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified Tutor');
                    const subjectName =
                      (isBn ? b.subject?.nameBn : b.subject?.name) ||
                      (isBn ? 'টিউশন কোর্স' : 'Tutoring Course');
                    const amount = Number(b.pricePerSessionMinor)
                      ? (Number(b.pricePerSessionMinor) / 100).toFixed(0)
                      : '1,000';

                    return (
                      <div
                        key={b.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/15 transition-colors"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-success-soft text-success border border-success/25 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-extrabold text-foreground truncate">
                                {tutorName}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-soft text-success-soft-foreground border border-success/25">
                                {isBn ? 'পরিশোধিত ও কনফার্মড' : 'Paid & Confirmed'}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-muted-foreground mt-0.5 truncate">
                              {subjectName} • {formatDate(b.createdAt, locale)}
                            </p>
                            <p className="text-[11px] font-mono text-muted-foreground mt-1">
                              Booking Ref: #{b.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                          <div className="text-left sm:text-right">
                            <span className="text-base sm:text-lg font-black text-foreground block">
                              ৳ {formatLocalizedNumber(amount, locale)}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                              BDT
                            </span>
                          </div>
                          <span className="text-xs font-bold text-primary flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4 text-success" />
                            <span>{isBn ? 'এসক্রো ফান্ডে জমা' : 'In Escrow'}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Tab 3: Payment Checkout View */}
      {pay.activeTab === 'checkout' && (
        <>
          {pay.requests.isLoading ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : bookingOptions.length === 0 ? (
            <EmptyState
              title={
                pay.pendingCount > 0
                  ? isBn
                    ? 'অনুমোদনের অপেক্ষায় রয়েছে'
                    : 'Pending Tutor Acceptance'
                  : isBn
                    ? 'পেমেন্ট করার জন্য কোনো সক্রিয় বুকিং নেই'
                    : 'No Active Tutoring Bookings'
              }
              description={
                pay.pendingCount > 0
                  ? isBn
                    ? 'আপনার পাঠানো টিউশন অনুরোধটি শিক্ষক অনুমোদন করার সাথে সাথে এখানে পেমেন্ট করার অপশন চলে আসবে।'
                    : 'Your tuition request is pending tutor acceptance. Once accepted, payment options will appear here.'
                  : isBn
                    ? 'টিউশন ফি পরিশোধ করার জন্য প্রথমে একজন শিক্ষক বেছে নিন এবং বুকিং অনুরোধ সম্পন্ন করুন।'
                    : 'To make tuition payments, please connect with a tutor and complete a booking request first.'
              }
              actionLabel={
                pay.pendingCount > 0
                  ? isBn
                    ? 'অনুরোধ তালিকা দেখুন'
                    : 'View Requests'
                  : isBn
                    ? 'টিউটর খুঁজুন'
                    : 'Find a Tutor'
              }
              actionHref={
                pay.pendingCount > 0
                  ? withLocale('/dashboard/student/requests', locale)
                  : withLocale('/tutors', locale)
              }
            />
          ) : (
            <>
              <Card className="mb-6 border-border rounded-2xl shadow-xs overflow-hidden bg-card">
                <CardHeader className="pb-4 border-b border-border">
                  <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span>{isBn ? 'টিউশন ফি পরিশোধ অর্ডার' : 'New Tuition Payment Order'}</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground font-medium">
                    {isBn
                      ? 'নির্ধারিত টিউশন নির্বাচন করে নিরাপদ গেটওয়েতে ফি প্রদান করুন।'
                      : 'Select your active booking and proceed to the secured Bangladesh Bank compliant escrow checkout.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <form
                    onSubmit={pay.handleCreateOrder}
                    className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-end"
                    data-testid="create-order-form"
                  >
                    <div className="space-y-1.5 md:col-span-1">
                      <Label htmlFor="pay-booking" className="text-xs font-bold text-foreground">
                        {isBn ? 'টিউশন / কোর্স নির্বাচন করুন' : 'Select Tuition / Course'}
                      </Label>
                      <NativeSelect
                        id="pay-booking"
                        value={pay.bookingId}
                        onChange={(e) => pay.handleSelectBooking(e.target.value)}
                        className="h-11 bg-surface text-xs font-semibold"
                        data-testid="pay-booking-select"
                      >
                        {bookingOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        {isBn ? 'সার্ভার-যাচাইকৃত পরিমাণ' : 'Server-verified amount'}
                      </Label>
                      <div className="h-11 rounded-xl border border-border bg-surface px-3.5 flex items-center justify-between text-xs font-bold text-foreground">
                        <span className="tabular-nums">
                          ৳ {formatLocalizedNumber(Number(pay.amountBdt) || 0, locale)}
                        </span>
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {isBn
                          ? 'পরিমাণ বুকিং থেকে নির্ধারিত হয়, সম্পাদনাযোগ্য নয়।'
                          : 'Amount is taken from the booking and cannot be edited.'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pay-provider" className="text-xs font-bold text-foreground">
                        {dict.payments.selectGateway}
                      </Label>
                      <NativeSelect
                        id="pay-provider"
                        value={pay.provider}
                        onChange={(e) => pay.setProvider(e.target.value as PaymentProvider)}
                        className="h-11 bg-surface text-xs font-semibold"
                        data-testid="pay-provider-select"
                      >
                        <option value="bkash">{dict.payments.bkashTitle}</option>
                        <option value="nagad">{dict.payments.nagadTitle}</option>
                        <option value="sslcommerz">{dict.payments.sslTitle}</option>
                      </NativeSelect>
                    </div>

                    <div className="md:col-span-3 flex justify-end pt-2">
                      <Button
                        type="submit"
                        isLoading={pay.creating}
                        data-testid="create-order-btn"
                        className="bg-primary hover:bg-primary-hover text-white px-8 text-xs font-bold h-11 rounded-xl shadow-xs"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {isBn ? 'পেমেন্ট গেটওয়েতে যান' : 'Proceed to Checkout'}
                      </Button>
                    </div>
                  </form>
                  {pay.formError && (
                    <Alert variant="destructive" className="mt-4 rounded-xl">
                      <AlertDescription role="alert">{pay.formError}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <PaymentCheckoutView
                locale={locale}
                initialOrder={order ?? undefined}
                onPay={pay.handlePay}
              />
            </>
          )}

          {pay.canRefund && order && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                isLoading={pay.refunding}
                onClick={pay.handleRefund}
                data-testid="refund-btn"
              >
                {isBn ? 'রিফান্ড অনুরোধ' : 'Request refund'}
              </Button>
            </div>
          )}
        </>
      )}

      {/* 7. Verified Payment Receipt Dialog */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>{isBn ? 'পেমেন্ট রশিদ' : 'Payment Receipt'}</DialogTitle>
          </DialogHeader>
          {pay.selectedReceipt ? (
            <PaymentReceipt
              receipt={pay.selectedReceipt}
              locale={locale}
              onClose={() => setReceiptModalOpen(false)}
            />
          ) : (
            <div className="p-8 text-center bg-card rounded-2xl border border-border">
              <LoadingSpinner />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

export function PaymentsPage({ locale }: { locale: Locale }) {
  return (
    <React.Suspense
      fallback={
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <PaymentsContent locale={locale} />
    </React.Suspense>
  );
}
