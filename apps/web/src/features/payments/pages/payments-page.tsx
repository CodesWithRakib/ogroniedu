'use client';

import React, { useState, useMemo } from 'react';
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
  Search,
  Download,
  Filter,
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

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState<'all' | 'sslcommerz' | 'bkash' | 'nagad'>(
    'all',
  );

  const openReceipt = async (orderId: string) => {
    await pay.handleViewReceipt(orderId);
    setReceiptModalOpen(true);
  };

  // Filtered paid orders list
  const filteredPaidOrders = useMemo(() => {
    return pay.paidOrders.filter((ord) => {
      const b = ord.booking;
      const tutor = (b?.tutorProfile?.user?.displayName || '').toLowerCase();
      const subject = ((isBn ? b?.subject?.nameBn : b?.subject?.nameEn) || '').toLowerCase();
      const ref = (ord.transactions?.[0]?.providerTransactionId || ord.id).toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || tutor.includes(q) || subject.includes(q) || ref.includes(q);
      const matchesGateway = gatewayFilter === 'all' || ord.provider === gatewayFilter;

      return matchesSearch && matchesGateway;
    });
  }, [pay.paidOrders, searchQuery, gatewayFilter, isBn]);

  return (
    <DashboardShell locale={locale} title={dict.payments.title} subtitle={dict.payments.subtitle}>
      {/* 1. Security & Escrow Trust Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-xl bg-card border border-border text-foreground">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight">
              {isBn ? '১০০% নিরাপদ এসক্রো পেমেন্ট সুরক্ষা' : '100% Escrow Protected Payments'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed font-normal">
              {isBn
                ? 'ক্লাস সন্তোষজনকভাবে সম্পন্ন না হওয়া পর্যন্ত আপনার অর্থ অগ্রণী এডু এসক্রো অ্যাকাউন্টে সুরক্ষিত থাকে।'
                : 'Your tuition fees remain safely in escrow until sessions are successfully conducted.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-foreground font-bold text-xs px-3.5 py-2 rounded-xl bg-muted/40 border border-border shrink-0 self-start sm:self-auto">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>bKash • Nagad • SSLCommerz</span>
        </div>
      </div>

      {/* 2. Top Metric KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Card 1: Payment Due */}
        <div
          onClick={() => pay.setActiveTab('due')}
          className={`cursor-pointer p-5 rounded-xl border transition-colors ${
            pay.activeTab === 'due'
              ? 'bg-amber-50/40 border-amber-400 dark:bg-amber-950/20'
              : 'bg-card border-border hover:border-amber-300'
          }`}
          data-testid="kpi-card-due"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {isBn ? 'পরিশোধের অপেক্ষায় (বকেয়া)' : 'Payment Due / Pending'}
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
              ৳{' '}
              {formatLocalizedNumber(Math.round(pay.totalDueMinor / 100).toLocaleString(), locale)}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 font-semibold flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>
                {isBn
                  ? `${formatLocalizedNumber(pay.dueBookings.length, locale)}টি টিউশন ফি পরিশোধযোগ্য`
                  : `${pay.dueBookings.length} tuition(s) awaiting payment`}
              </span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Paid */}
        <div
          onClick={() => pay.setActiveTab('paid')}
          className={`cursor-pointer p-5 rounded-xl border transition-colors ${
            pay.activeTab === 'paid'
              ? 'bg-emerald-50/40 border-emerald-400 dark:bg-emerald-950/20'
              : 'bg-card border-border hover:border-emerald-300'
          }`}
          data-testid="kpi-card-paid"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {isBn ? 'মোট পরিশোধিত ফি' : 'Total Paid History'}
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
              ৳{' '}
              {formatLocalizedNumber(Math.round(pay.totalPaidMinor / 100).toLocaleString(), locale)}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 font-semibold flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-600" />
              <span>
                {isBn
                  ? `${formatLocalizedNumber(paidCount, locale)}টি সফল পেমেন্ট ও রশিদ সংরক্ষিত`
                  : `${paidCount} successful payment(s)`}
              </span>
            </p>
          </div>
        </div>

        {/* Card 3: Escrow Balance / Guarantee */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {isBn ? 'এসক্রো নিরাপত্তা স্তর' : 'Escrow Protection'}
            </span>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl sm:text-3xl font-black text-foreground">
              {isBn ? '১০০% সুরক্ষিত' : '100% Protected'}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              {isBn ? 'বাংলাদেশ ব্যাংক ও দ্বৈত লেজার জামানত' : 'Double-entry ledger verified'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Navigation / Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-muted/40 rounded-xl border border-border mb-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => pay.setActiveTab('due')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            pay.activeTab === 'due'
              ? 'bg-card text-foreground border border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          data-testid="tab-due"
        >
          <Clock className={`w-4 h-4 ${pay.dueBookings.length > 0 ? 'text-amber-600' : ''}`} />
          <span>{isBn ? 'বকেয়া ও পরিশোধযোগ্য' : 'Due & Pending Payments'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
              pay.dueBookings.length > 0
                ? 'bg-amber-100 text-amber-950 border-amber-300'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {formatLocalizedNumber(pay.dueBookings.length, locale)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => pay.setActiveTab('paid')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            pay.activeTab === 'paid'
              ? 'bg-card text-foreground border border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          data-testid="tab-paid"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{isBn ? 'পরিশোধিত তালিকা ও রশিদ' : 'Paid Tuitions & Receipts'}</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300">
            {formatLocalizedNumber(paidCount, locale)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => pay.setActiveTab('checkout')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            pay.activeTab === 'checkout'
              ? 'bg-card text-foreground border border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          data-testid="tab-checkout"
        >
          <CreditCard className="w-4 h-4 text-primary" />
          <span>{isBn ? 'পেমেন্ট চেকআউট' : 'Make Payment / Checkout'}</span>
        </button>
      </div>

      {/* 4. Tab 1: Due & Pending Payments ("kongula payment korte hbe") */}
      {pay.activeTab === 'due' && (
        <div className="flex flex-col gap-4">
          {pay.requests.isLoading ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : pay.dueBookings.length === 0 ? (
            <Card className="rounded-xl border-border bg-card p-6 sm:p-10 text-center text-foreground">
              <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-foreground">
                {isBn ? 'কোনো বকেয়া পেমেন্ট নেই!' : 'No Pending Payments Due!'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto font-medium leading-relaxed">
                {isBn
                  ? 'আপনার সমস্ত অনুমোদিত টিউশনের ফি পরিশোধ করা হয়েছে। নতুন শিক্ষকের সাথে ক্লাস শুরু করতে বুকিং অনুরোধ পাঠান।'
                  : 'All your accepted tuitions are up to date. Send new tuition requests to connect with expert tutors.'}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => pay.setActiveTab('paid')}
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold border-border text-foreground hover:bg-muted"
                >
                  <FileText className="w-4 h-4 mr-1.5 text-muted-foreground" />
                  <span>{isBn ? 'পরিশোধিত তালিকা দেখুন' : 'View Paid History'}</span>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
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
                  : Number(b.totalAmountMinor)
                    ? (Number(b.totalAmountMinor) / 100).toFixed(0)
                    : '—';

                return (
                  <div
                    key={b.id}
                    className="p-5 rounded-xl bg-card border border-border hover:border-amber-400 transition-colors flex flex-col justify-between gap-4 text-foreground"
                    data-testid={`due-booking-card-${b.id}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 mb-2">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>{isBn ? 'পরিশোধ প্রয়োজন' : 'Payment Due'}</span>
                          </span>
                          <h4 className="text-base sm:text-lg font-black text-foreground truncate">
                            {tutorName}
                          </h4>
                          <p className="text-xs font-bold text-primary mt-0.5 truncate">
                            {subjectName} {educationLevel ? `• ${educationLevel}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0 bg-muted/40 p-2.5 rounded-xl border border-border">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            {isBn ? 'ফি / ক্লাস' : 'Per Session'}
                          </span>
                          <span className="text-lg sm:text-xl font-black text-foreground tabular-nums">
                            ৳ {rate !== '—' ? formatLocalizedNumber(rate, locale) : '—'}
                          </span>
                        </div>
                      </div>

                      {b.tutorProfile?.headline && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed bg-muted/30 p-3 rounded-xl border border-border font-medium">
                          {b.tutorProfile.headline}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground font-medium">
                        <span>
                          {isBn ? 'অনুরোধ তারিখ:' : 'Requested:'}{' '}
                          <span className="font-bold text-foreground">
                            {formatDate(b.createdAt, locale)}
                          </span>
                        </span>
                        <span className="font-mono text-muted-foreground font-semibold">
                          #{b.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>{isBn ? 'এসক্রো সুরক্ষা সক্রিয়' : 'Escrow Protected'}</span>
                      </span>
                      <Button
                        type="button"
                        onClick={() => pay.selectBookingForPayment(b.id)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-10 px-4 rounded-xl flex items-center gap-1.5"
                        data-testid={`pay-now-btn-${b.id}`}
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
        <div className="flex flex-col gap-4">
          {pay.ordersQuery.isLoading || pay.requests.isLoading ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : pay.paidOrders.length === 0 && pay.paidBookings.length === 0 ? (
            <Card className="rounded-xl border-border bg-card p-6 sm:p-10 text-center text-foreground">
              <div className="w-14 h-14 rounded-xl bg-muted/50 text-muted-foreground flex items-center justify-center mx-auto mb-4 border border-border">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-foreground">
                {isBn ? 'এখনও কোনো পেমেন্ট রেকর্ড নেই' : 'No Payment History Found'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto font-medium leading-relaxed">
                {isBn
                  ? 'আপনার কোনো টিউশন ফি পরিশোধ করা হলে এখানে রসিদ এবং ট্রানজ্যাকশন হিস্টোরি প্রদর্শিত হবে।'
                  : 'When you pay tuition fees, verified receipts and transaction references will appear here.'}
              </p>
            </Card>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden text-foreground">
              {/* Header & Filter Strip */}
              <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-foreground">
                    {isBn ? 'পরিশোধিত টিউশন ও আর্থিক রেকর্ড' : 'Paid Tutoring & Escrow Ledger'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    {isBn
                      ? 'সম্পন্ন করা পেমেন্টের বিবরণ ও রসিদ কপি'
                      : 'Verified transactions and downloadable receipts'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Search box */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        isBn ? 'শিক্ষক বা রেফারেন্স খুঁজুন...' : 'Search tutor or ref...'
                      }
                      className="pl-9 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-48 sm:w-56"
                    />
                  </div>

                  {/* Gateway filter pills */}
                  <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => setGatewayFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        gatewayFilter === 'all'
                          ? 'bg-card text-foreground border border-border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {isBn ? 'সকল' : 'All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGatewayFilter('sslcommerz')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        gatewayFilter === 'sslcommerz'
                          ? 'bg-card text-primary border border-border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      SSLCOMMERZ
                    </button>
                    <button
                      type="button"
                      onClick={() => setGatewayFilter('bkash')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        gatewayFilter === 'bkash'
                          ? 'bg-card text-foreground border border-border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      bKash
                    </button>
                  </div>

                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 px-3 py-1 rounded-full">
                    {isBn
                      ? `${formatLocalizedNumber(paidCount, locale)}টি সম্পন্ন`
                      : `${paidCount} Completed`}
                  </span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="divide-y divide-border">
                {filteredPaidOrders.map((ord) => {
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
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                      data-testid={`paid-order-row-${ord.id}`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm sm:text-base font-black text-foreground truncate">
                              {tutorName}
                            </h4>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              {isBn ? 'পরিশোধিত (এসক্রো সুরক্ষিত)' : 'Paid (Escrow Safe)'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-primary mt-0.5 truncate">
                            {subjectName} • {formatDate(ord.createdAt, locale)}
                          </p>
                          <p className="text-[11px] font-mono text-muted-foreground mt-1 font-semibold">
                            Ref: <span className="text-foreground">{txnId}</span> • Gateway:{' '}
                            <span className="font-bold uppercase text-foreground">
                              {ord.provider}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
                        <div className="text-left sm:text-right">
                          <span className="text-lg sm:text-xl font-black text-foreground tabular-nums block">
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
                          data-testid={`view-receipt-btn-${ord.id}`}
                          className="rounded-xl text-xs font-bold h-9 border-border text-foreground hover:bg-muted"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5 text-primary" />
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
                      : Number(b.totalAmountMinor)
                        ? (Number(b.totalAmountMinor) / 100).toFixed(0)
                        : '—';

                    return (
                      <div
                        key={b.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm sm:text-base font-black text-foreground truncate">
                                {tutorName}
                              </h4>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                {isBn ? 'পরিশোধিত ও কনফার্মড' : 'Paid & Confirmed'}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-primary mt-0.5 truncate">
                              {subjectName} • {formatDate(b.createdAt, locale)}
                            </p>
                            <p className="text-[11px] font-mono text-muted-foreground mt-1 font-semibold">
                              Booking Ref: #{b.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
                          <div className="text-left sm:text-right">
                            <span className="text-lg sm:text-xl font-black text-foreground tabular-nums block">
                              ৳ {amount !== '—' ? formatLocalizedNumber(amount, locale) : '—'}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                              BDT
                            </span>
                          </div>
                          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
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
              <Card className="mb-6 border-border rounded-xl overflow-hidden bg-card text-foreground">
                <CardHeader className="pb-4 border-b border-border bg-muted/30">
                  <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
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
                    <div className="flex flex-col gap-1.5 md:col-span-1">
                      <Label htmlFor="pay-booking" className="text-xs font-black text-foreground">
                        {isBn ? 'টিউশন / কোর্স নির্বাচন করুন' : 'Select Tuition / Course'}
                      </Label>
                      <NativeSelect
                        id="pay-booking"
                        value={pay.bookingId}
                        onChange={(e) => pay.handleSelectBooking(e.target.value)}
                        className="h-11 bg-card text-xs font-bold border-border text-foreground"
                        data-testid="pay-booking-select"
                      >
                        {bookingOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-black text-foreground">
                        {isBn ? 'সার্ভার-যাচাইকৃত পরিমাণ' : 'Server-verified amount'}
                      </Label>
                      <div className="h-11 rounded-xl border border-border bg-surface-muted px-3.5 flex items-center justify-between text-xs font-black text-foreground">
                        <span className="tabular-nums text-sm text-primary font-extrabold">
                          ৳ {formatLocalizedNumber(Number(pay.amountBdt) || 0, locale)}
                        </span>
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {isBn
                          ? 'পরিমাণ বুকিং থেকে নির্ধারিত হয়, সম্পাদনাযোগ্য নয়।'
                          : 'Amount is taken from the booking and cannot be edited.'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="pay-provider" className="text-xs font-black text-foreground">
                        {dict.payments.selectGateway}
                      </Label>
                      <NativeSelect
                        id="pay-provider"
                        value={pay.provider}
                        onChange={(e) => pay.setProvider(e.target.value as PaymentProvider)}
                        className="h-11 bg-card text-xs font-bold border-border text-foreground"
                        data-testid="pay-provider-select"
                      >
                        <option value="sslcommerz">
                          {dict.payments.sslTitle} (Cards, bKash, Nagad)
                        </option>
                        <option value="bkash">{dict.payments.bkashTitle}</option>
                        <option value="nagad">{dict.payments.nagadTitle}</option>
                      </NativeSelect>
                    </div>

                    <div className="md:col-span-2 flex justify-end pt-2">
                      <Button
                        type="submit"
                        isLoading={pay.creating}
                        data-testid="create-order-btn"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 text-xs font-bold h-11 rounded-xl"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {isBn ? 'পেমেন্ট গেটওয়েতে যান' : 'Proceed to Checkout'}
                      </Button>
                    </div>
                  </form>
                  {pay.formError && (
                    <Alert
                      variant="destructive"
                      className="mt-4 rounded-xl border-rose-200 bg-rose-50 text-rose-900"
                    >
                      <AlertDescription role="alert" className="text-xs font-bold">
                        {pay.formError}
                      </AlertDescription>
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
                className="border-border text-foreground font-bold"
              >
                {isBn ? 'রিফান্ড অনুরোধ' : 'Request refund'}
              </Button>
            </div>
          )}
        </>
      )}

      {/* 7. Verified Payment Receipt Dialog */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-transparent border-none shadow-none">
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
            <div className="p-8 text-center bg-card rounded-xl border border-border">
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
