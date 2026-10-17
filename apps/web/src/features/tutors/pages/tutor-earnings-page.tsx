'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Smartphone,
  Calendar,
  Sparkles,
  TrendingUp,
  Receipt,
  FileText,
} from 'lucide-react';
import { TutorLayout } from '@/layouts/tutor/TutorLayout';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  LoadingSpinner,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Label,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { HeroKpiCard } from '@/components/dashboard/HeroKpiCard';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatBDTMinor, formatDateTime } from '@/lib/format';
import { useGetSessionsQuery } from '@/store/services/sessions-api';
import { useGetMyTutorAnalyticsQuery } from '@/store/services/analytics-api';
import { withLocale } from '@/lib/auth';

type PayoutMethod = 'bkash' | 'nagad' | 'rocket' | 'bank';

interface PayoutRecord {
  id: string;
  amountBdt: number;
  method: string;
  accountNumber: string;
  status: 'completed' | 'processing' | 'pending';
  requestedAt: string;
}

export function TutorEarningsPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const sessions = useGetSessionsQuery();
  const analytics = useGetMyTutorAnalyticsQuery();

  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PayoutMethod>('bkash');
  const [accountNumber, setAccountNumber] = useState('01711-234567');
  const [withdrawAmount, setWithdrawAmount] = useState('1200');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const [payoutHistory, setPayoutHistory] = useState<PayoutRecord[]>([
    {
      id: 'PAY-8921',
      amountBdt: 2400,
      method: 'bKash',
      accountNumber: '01711-234567',
      status: 'completed',
      requestedAt: '2026-10-14T10:30:00Z',
    },
    {
      id: 'PAY-8920',
      amountBdt: 1200,
      method: 'Nagad',
      accountNumber: '01819-876543',
      status: 'completed',
      requestedAt: '2026-10-10T16:15:00Z',
    },
  ]);

  const aData = analytics.data?.data;
  const totalEarnedBdt =
    typeof aData?.earnings === 'number'
      ? aData.earnings
      : typeof aData?.earnings === 'object' &&
          aData?.earnings !== null &&
          'totalEarningsBdt' in aData.earnings
        ? (aData.earnings.totalEarningsBdt ?? 0)
        : 3600;

  const withdrawableBalanceBdt = 1200;
  const inEscrowBalanceBdt = 1200;
  const completedSessionsCount = aData?.sessions?.completedSessions ?? 3;

  async function handleRequestPayout(e: React.FormEvent) {
    e.preventDefault();
    setPayoutError(null);
    setPayoutSuccess(null);

    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setPayoutError(isBn ? 'সঠিক উত্তোলনের পরিমাণ দিন।' : 'Enter a valid withdrawal amount.');
      return;
    }
    if (amount > withdrawableBalanceBdt) {
      setPayoutError(
        isBn
          ? `আপনার উত্তোলনযোগ্য ব্যালেন্স সর্বোচ্চ ৳${formatLocalizedNumber(withdrawableBalanceBdt, locale)}।`
          : `Max withdrawable amount is ৳${withdrawableBalanceBdt}.`,
      );
      return;
    }
    if (!accountNumber.trim()) {
      setPayoutError(
        isBn
          ? 'মোবাইল ব্যাংকিং অথবা ব্যাংক অ্যাকাউন্ট নম্বর দিন।'
          : 'Enter your payout account number.',
      );
      return;
    }

    setIsSubmitting(true);
    // Simulate real backend payout submission
    setTimeout(() => {
      setIsSubmitting(false);
      setPayoutSuccess(
        isBn
          ? `৳${formatLocalizedNumber(amount, locale)} উত্তোলনের অনুরোধ গৃহীত হয়েছে। আগামী ২ ঘণ্টার মধ্যে আপনার ${selectedMethod.toUpperCase()} নম্বরে টাকা পৌঁছে যাবে।`
          : `Withdrawal request for ৳${amount} accepted! Funds will arrive via ${selectedMethod.toUpperCase()} within 2 hours.`,
      );
      setPayoutHistory((prev) => [
        {
          id: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
          amountBdt: amount,
          method: selectedMethod.toUpperCase(),
          accountNumber,
          status: 'processing',
          requestedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setWithdrawModalOpen(false);
    }, 700);
  }

  const sessionItems = sessions.data?.data ?? [];

  return (
    <TutorLayout
      locale={locale}
      title={isBn ? 'আয় ও পে-আউট ড্যাশবোর্ড' : 'Earnings & Payouts'}
      subtitle={
        isBn
          ? 'আপনার টিচিং আয়, এসক্রো ব্যালেন্স পর্যবেক্ষণ করুন এবং সরাসরি বিকাশ, নগদ বা ব্যাংকে টাকা উত্তোলন করুন।'
          : 'Monitor teaching earnings, escrow balances, and withdraw funds directly to bKash, Nagad, or Bank.'
      }
      actions={
        <Button
          size="sm"
          onClick={() => {
            setPayoutError(null);
            setPayoutSuccess(null);
            setWithdrawModalOpen(true);
          }}
          className="bg-primary hover:bg-primary-hover text-white font-bold text-xs gap-1.5 shadow-sm"
          data-testid="open-withdraw-modal-btn"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>{isBn ? 'টাকা উত্তোলন করুন' : 'Withdraw Earnings'}</span>
        </Button>
      }
    >
      {/* Notifications */}
      {payoutSuccess && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-primary/20 bg-primary-soft p-4 text-xs text-success-soft-foreground    flex items-start gap-2"
          data-testid="payout-success-alert"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{payoutSuccess}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. FINANCIAL KPI GRID                                    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <HeroKpiCard
          variant="hero"
          icon={TrendingUp}
          title={isBn ? 'সর্বমোট আয়' : 'Total Earnings'}
          value={`৳${formatLocalizedNumber(totalEarnedBdt, locale)}`}
          changeText={isBn ? '১০০% নিশ্চিত আর্নিং' : '100% verified earnings'}
          href={withLocale('/dashboard/tutor/payments', locale)}
          testId="tutor-total-earnings-card"
        />

        <HeroKpiCard
          variant="secondary"
          icon={DollarSign}
          title={isBn ? 'উত্তোলনযোগ্য ব্যালেন্স' : 'Available for Payout'}
          value={`৳${formatLocalizedNumber(withdrawableBalanceBdt, locale)}`}
          changeText={isBn ? 'তাৎক্ষণিক উত্তোলনের জন্য প্রস্তুত' : 'Ready for instant cash out'}
          href={withLocale('/dashboard/tutor/payments', locale)}
          testId="tutor-withdrawable-card"
        />

        <HeroKpiCard
          variant="secondary"
          icon={ShieldCheck}
          title={isBn ? 'এসক্রোতে সংরক্ষিত' : 'Escrow Pending'}
          value={`৳${formatLocalizedNumber(inEscrowBalanceBdt, locale)}`}
          changeText={isBn ? 'ক্লাস সমাপ্তির পর রিলিজ হবে' : 'Releases upon session completion'}
          href={withLocale('/dashboard/tutor/sessions', locale)}
          testId="tutor-escrow-card"
        />

        <HeroKpiCard
          variant="secondary"
          icon={CheckCircle2}
          title={isBn ? 'সম্পন্ন ক্লাস' : 'Completed Classes'}
          value={formatLocalizedNumber(completedSessionsCount, locale)}
          changeText={isBn ? 'সফলভাবে সমাপ্ত সেশন' : 'Delivered live sessions'}
          href={withLocale('/dashboard/tutor/sessions', locale)}
          testId="tutor-completed-classes-card"
        />
      </div>

      {/* ======================================================== */}
      {/* 2. ESCROW ASSURANCE & 0% PLATFORM FEE PROMOTION          */}
      {/* ======================================================== */}
      <div className="rounded-3xl p-6 bg-card border border-brand/25 text-foreground shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-success-soft-foreground text-xs font-bold border border-primary/40">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isBn ? '০% প্ল্যাটফর্ম ফি অফার চলছে' : '0% Platform Fee Promotion'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {isBn
              ? 'অগ্রণী এডুর ১০০% এসক্রো সুরক্ষা — বকেয়ার কোনো ভয় নেই'
              : 'OgroniEdu 100% Escrow Protection — Zero Payment Risk'}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {isBn
              ? 'ক্লাস শুরু হওয়ার পূর্বেই শিক্ষার্থী বা অভিভাবকের টাকা অগ্রণী এডুর বাংলাদেশ ব্যাংক অনুমোদিত এসক্রো অ্যাকাউন্টে জমা হয়। ক্লাস সম্পন্ন হওয়ার সাথে সাথে সম্পূর্ণ টাকা আপনার ওয়ালেটে ক্রেডিট করা হয়।'
              : 'Students prepay full session fees into our regulated escrow vault before classes begin. As soon as you deliver the session, 100% of the funds are unlocked into your withdrawable balance.'}
          </p>
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            onClick={() => setWithdrawModalOpen(true)}
            className="bg-primary hover:bg-brand text-foreground font-extrabold text-xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
            {isBn ? 'টাকা তুলুন' : 'Request Cashout'}
          </Button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. PAYOUT HISTORY & EARNINGS BREAKDOWN LEDGER            */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Payout Requests (1 Col) */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="rounded-3xl border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                <span>{isBn ? 'সাম্প্রতিক উত্তোলনের ইতিহাস' : 'Recent Payout Requests'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {payoutHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {isBn ? 'কোনো উত্তোলন রেকর্ড নেই' : 'No payout history'}
                </div>
              ) : (
                payoutHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-2xl bg-card/80 border border-primary/40 flex items-center justify-between gap-3 text-xs"
                    data-testid={`payout-record-${rec.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <span>৳{formatLocalizedNumber(rec.amountBdt, locale)}</span>
                        <span className="text-[10px] text-primary-soft-foreground font-normal">
                          ({rec.method})
                        </span>
                      </div>
                      <p className="text-[11px] text-primary-soft-foreground">{rec.accountNumber}</p>
                    </div>

                    <div className="text-right space-y-1">
                      {rec.status === 'completed' ? (
                        <Badge variant="success" className="text-[10px] py-0.5">
                          {isBn ? 'সম্পন্ন' : 'Paid'}
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px] py-0.5 animate-pulse">
                          {isBn ? 'প্রক্রিয়াধীন' : 'Processing'}
                        </Badge>
                      )}
                      <span className="block text-[10px] text-primary-soft-foreground">
                        {formatDateTime(rec.requestedAt, locale)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Connected Payout Method Card */}
          <Card className="rounded-3xl border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-success-soft-foreground" />
                <span>{isBn ? 'ডিফল্ট পে-আউট অ্যাকাউন্ট' : 'Default Payout Account'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-primary-soft  border border-primary/20 ">
                <div className="space-y-0.5">
                  <span className="font-bold text-primary-soft-foreground ">
                    bKash Personal
                  </span>
                  <span className="block font-mono text-success-soft-foreground ">
                    01711-234567
                  </span>
                </div>
                <Badge variant="success" className="text-[10px]">
                  {isBn ? 'সক্রিয়' : 'Active'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isBn
                  ? 'উত্তোলনের অনুরোধ করার পর স্বয়ংক্রিয়ভাবে এই নম্বরে অর্থ প্রেরণ করা হবে।'
                  : 'Payouts will automatically be dispatched to this default wallet.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Class & Session Earnings Ledger (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-3xl border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>
                      {isBn ? 'ক্লাস ও সেশনভিত্তিক আয় বিবরণী' : 'Session Earnings Ledger'}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {isBn
                      ? 'প্রতিটি লাইভ ক্লাসের ফি এবং এসক্রো রিলিজ স্ট্যাটাস'
                      : 'Fee breakdown and escrow release state per session'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {sessions.isLoading ? (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : sessionItems.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="text-xs">
                    {isBn ? 'এখনও কোনো সেশন সম্পন্ন হয়নি।' : 'No session records found yet.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {sessionItems.map((sess) => {
                    const isCompleted = sess.status === 'completed';
                    const feeMinor = 120000; // ৳1,200 standard

                    return (
                      <div
                        key={sess.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/50  p-2 rounded-xl transition-colors"
                        data-testid={`session-earnings-row-${sess.id}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">
                              {sess.subjectName ||
                                (isBn ? 'পদার্থবিজ্ঞান ১ম পত্র' : 'Physics Paper 1')}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              #{sess.id.slice(0, 8)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDateTime(sess.startsAt, locale)}</span>
                            <span>•</span>
                            <span>60 {isBn ? 'মিনিট' : 'mins'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-sm font-bold text-success-soft-foreground block">
                              {formatBDTMinor(feeMinor, locale)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {isBn ? 'ফি: ০%' : '0% fee'}
                            </span>
                          </div>

                          {isCompleted ? (
                            <Badge variant="success" className="gap-1 py-0.5 text-[10px]">
                              <CheckCircle2 className="w-3 h-3" />
                              {isBn ? 'রিলিজ হয়েছে' : 'Released'}
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="gap-1 py-0.5 text-[10px]">
                              <Clock className="w-3 h-3" />
                              {isBn ? 'এসক্রোতে আছে' : 'In Escrow'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. WITHDRAW MODAL DIALOG                                 */}
      {/* ======================================================== */}
      <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
        <DialogContent className="max-w-md" data-testid="payout-modal">
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-success-soft-foreground" />
              <DialogTitle className="text-base font-bold text-foreground">
                {isBn ? 'টাকা উত্তোলন অনুরোধ' : 'Request Payout'}
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              {isBn ? 'উত্তোলনের বিবরণ দিন' : 'Enter payout withdrawal details'}
            </DialogDescription>
          </DialogHeader>

          {payoutError && (
            <Alert variant="destructive">
              <AlertDescription role="alert">{payoutError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleRequestPayout} className="space-y-4" data-testid="payout-form">
            {/* Payout Method Choice */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                {isBn ? 'উত্তোলনের মাধ্যম নির্বাচন করুন:' : 'Select Payout Channel:'}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('bkash')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    selectedMethod === 'bkash'
                      ? 'border-pink-500 bg-pink-500/10 text-pink-600'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  bKash
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethod('nagad')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    selectedMethod === 'nagad'
                      ? 'border-warning/40 bg-warning/10 text-orange-700'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  Nagad
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethod('bank')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    selectedMethod === 'bank'
                      ? 'border-info/40 bg-interactive/10 text-info-soft-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  Bank
                </button>
              </div>
            </div>

            {/* Account Number */}
            <div className="space-y-1">
              <Label htmlFor="payout-acc" className="text-xs font-medium text-foreground">
                {selectedMethod === 'bank'
                  ? isBn
                    ? 'ব্যাংক হিসাব নম্বর'
                    : 'Bank Account Number'
                  : isBn
                    ? `${selectedMethod.toUpperCase()} মোবাইল নম্বর`
                    : `${selectedMethod.toUpperCase()} Mobile Number`}
              </Label>
              <Input
                id="payout-acc"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="017XXXXXXXX"
                className="rounded-xl"
                data-testid="payout-account-input"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <Label htmlFor="payout-amount" className="font-medium text-foreground">
                  {isBn ? 'উত্তোলনের পরিমাণ (টাকা)' : 'Withdrawal Amount (BDT)'}
                </Label>
                <span className="text-muted-foreground text-[11px]">
                  {isBn ? 'সর্বোচ্চ:' : 'Available:'} ৳
                  {formatLocalizedNumber(withdrawableBalanceBdt, locale)}
                </span>
              </div>
              <Input
                id="payout-amount"
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="rounded-xl"
                data-testid="payout-amount-input"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWithdrawModalOpen(false)}
                className="text-xs"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary-hover text-white font-bold text-xs"
                data-testid="confirm-withdraw-btn"
              >
                {isSubmitting ? (
                  <LoadingSpinner />
                ) : isBn ? (
                  'উত্তোলন নিশ্চিত করুন'
                ) : (
                  'Confirm Payout'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </TutorLayout>
  );
}
