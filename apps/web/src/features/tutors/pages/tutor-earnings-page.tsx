'use client';

import React, { useMemo, useState } from 'react';
import {
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Smartphone,
  Calendar,
  TrendingUp,
  Receipt,
  FileText,
  AlertCircle,
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
import { formatBDTMinor, formatDateTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import {
  useGetTutorFinanceSummaryQuery,
  useRequestPayoutMutation,
  type Payout,
  type PayoutMethod,
} from '@/store/services/payments-api';

function statusVariant(status: Payout['status']): 'success' | 'warning' | 'destructive' | 'info' {
  switch (status) {
    case 'paid':
      return 'success';
    case 'rejected':
    case 'failed':
      return 'destructive';
    case 'requested':
    case 'approved':
    case 'processing':
    default:
      return 'warning';
  }
}

function payoutStatusLabel(status: Payout['status'], isBn: boolean): string {
  const labels: Record<Payout['status'], [string, string]> = {
    requested: ['পর্যালোচনাধীন', 'Awaiting review'],
    approved: ['অনুমোদিত', 'Approved'],
    processing: ['প্রক্রিয়াধীন', 'Processing'],
    paid: ['পরিশোধিত', 'Paid'],
    rejected: ['প্রত্যাখ্যাত', 'Rejected'],
    failed: ['ব্যর্থ', 'Failed'],
  };
  return isBn ? labels[status][0] : labels[status][1];
}

/** Parse a BDT decimal string into integer poisha without float arithmetic. */
function parseBdtToMinor(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(whole)) return null;
  return whole * 100 + fraction;
}

export function TutorEarningsPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const summaryQuery = useGetTutorFinanceSummaryQuery();
  const [requestPayout, requestState] = useRequestPayoutMutation();

  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PayoutMethod>('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const summary = summaryQuery.data?.data;
  const availableMinor = BigInt(summary?.availableMinor ?? '0');
  const minimumMinor = BigInt(summary?.minimumPayoutMinor ?? '0');
  const payouts = summary?.payouts ?? [];
  const settlements = summary?.settlements ?? [];

  const lifetimeMinor = BigInt(summary?.lifetimeNetMinor ?? '0');
  const escrowMinor = BigInt(summary?.escrowPendingMinor ?? '0');
  const paidOutMinor = BigInt(summary?.paidOutMinor ?? '0');
  const reservedMinor = BigInt(summary?.reservedMinor ?? '0');

  const hasAvailable = availableMinor >= minimumMinor && availableMinor > 0n;

  const defaultAmount = useMemo(() => {
    if (availableMinor <= 0n) return '';
    return (Number(availableMinor) / 100).toFixed(2);
  }, [availableMinor]);

  function openWithdrawModal() {
    setPayoutError(null);
    setPayoutSuccess(null);
    setWithdrawAmount(defaultAmount);
    setWithdrawModalOpen(true);
  }

  async function handleRequestPayout(e: React.FormEvent) {
    e.preventDefault();
    setPayoutError(null);
    setPayoutSuccess(null);

    const amountMinor = parseBdtToMinor(withdrawAmount);
    if (amountMinor === null || amountMinor <= 0) {
      setPayoutError(isBn ? 'সঠিক উত্তোলনের পরিমাণ দিন।' : 'Enter a valid withdrawal amount.');
      return;
    }
    if (BigInt(amountMinor) < minimumMinor) {
      setPayoutError(
        isBn
          ? `সর্বনিম্ন উত্তোলন ${formatBDTMinor(minimumMinor.toString(), locale)}।`
          : `Minimum payout is ${formatBDTMinor(minimumMinor.toString(), locale)}.`,
      );
      return;
    }
    if (BigInt(amountMinor) > availableMinor) {
      setPayoutError(
        isBn
          ? `আপনার উত্তোলনযোগ্য ব্যালেন্স ${formatBDTMinor(availableMinor.toString(), locale)}।`
          : `Max withdrawable amount is ${formatBDTMinor(availableMinor.toString(), locale)}.`,
      );
      return;
    }
    if (accountNumber.trim().length < 4) {
      setPayoutError(
        isBn
          ? 'মোবাইল ব্যাংকিং অথবা ব্যাংক অ্যাকাউন্ট নম্বর দিন।'
          : 'Enter your payout account number.',
      );
      return;
    }

    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `payout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const result = await requestPayout({
        amountMinor,
        method: selectedMethod,
        accountReference: accountNumber.trim(),
        idempotencyKey,
      }).unwrap();
      const created = result.data;
      setPayoutSuccess(
        isBn
          ? `${created.payoutNumber} নম্বরের উত্তোলন অনুরোধ জমা হয়েছে। অর্থ বিভাগ অনুমোদনের পর প্রকৃত স্থানান্তর সম্পন্ন হবে।`
          : `Payout request ${created.payoutNumber} submitted. Finance will review it before any transfer is made.`,
      );
      setWithdrawModalOpen(false);
      setAccountNumber('');
    } catch (err) {
      const message =
        typeof err === 'object' && err !== null && 'data' in err
          ? ((err as { data?: { error?: { message?: string } } }).data?.error?.message ?? null)
          : null;
      setPayoutError(
        message ??
          (isBn ? 'উত্তোলনের অনুরোধ জমা দেওয়া যায়নি।' : 'Could not submit the payout request.'),
      );
    }
  }

  if (summaryQuery.isLoading) {
    return (
      <TutorLayout locale={locale} title={isBn ? 'আয় ও পে-আউট' : 'Earnings & Payouts'}>
        <div className="py-16 flex justify-center" data-testid="tutor-earnings-loading">
          <LoadingSpinner />
        </div>
      </TutorLayout>
    );
  }

  if (summaryQuery.isError || !summary) {
    return (
      <TutorLayout locale={locale} title={isBn ? 'আয় ও পে-আউট' : 'Earnings & Payouts'}>
        <Alert variant="destructive" data-testid="tutor-earnings-error">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            {isBn
              ? 'আর্থিক তথ্য লোড করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।'
              : 'Finance data could not be loaded. Please try again.'}
          </AlertDescription>
        </Alert>
      </TutorLayout>
    );
  }

  return (
    <TutorLayout
      locale={locale}
      title={isBn ? 'আয় ও পে-আউট ড্যাশবোর্ড' : 'Earnings & Payouts'}
      subtitle={
        isBn
          ? 'আপনার যাচাইকৃত আয়, এসক্রো ব্যালেন্স এবং পে-আউট অনুরোধের প্রকৃত অবস্থা দেখুন।'
          : 'Track verified earnings, escrowed balances and the real status of your payout requests.'
      }
      actions={
        <Button
          size="sm"
          onClick={openWithdrawModal}
          disabled={!hasAvailable}
          className="bg-primary hover:bg-primary-hover text-white font-bold text-xs gap-1.5"
          data-testid="open-withdraw-modal-btn"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>{isBn ? 'টাকা উত্তোলন করুন' : 'Withdraw Earnings'}</span>
        </Button>
      }
    >
      {payoutSuccess && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-success/20 bg-success-soft p-4 text-xs text-success-soft-foreground flex items-start gap-2"
          data-testid="payout-success-alert"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{payoutSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <HeroKpiCard
          variant="hero"
          icon={TrendingUp}
          title={isBn ? 'সর্বমোট নেট আয়' : 'Lifetime Net Earnings'}
          value={formatBDTMinor(lifetimeMinor.toString(), locale)}
          changeText={isBn ? 'শুধুমাত্র নিষ্পত্তিকৃত সেশন' : 'Settled sessions only'}
          href={withLocale('/dashboard/tutor/payments', locale)}
          testId="tutor-total-earnings-card"
        />

        <HeroKpiCard
          variant="secondary"
          icon={DollarSign}
          title={isBn ? 'উত্তোলনযোগ্য ব্যালেন্স' : 'Available for Payout'}
          value={formatBDTMinor(availableMinor.toString(), locale)}
          changeText={
            reservedMinor > 0n
              ? isBn
                ? `${formatBDTMinor(reservedMinor.toString(), locale)} অনুরোধে সংরক্ষিত`
                : `${formatBDTMinor(reservedMinor.toString(), locale)} reserved in requests`
              : isBn
                ? 'কোনো অর্থ সংরক্ষিত নেই'
                : 'Nothing reserved'
          }
          href={withLocale('/dashboard/tutor/payments', locale)}
          testId="tutor-withdrawable-card"
        />

        <HeroKpiCard
          variant="secondary"
          icon={ShieldCheck}
          title={isBn ? 'এসক্রোতে সংরক্ষিত' : 'Escrow Pending'}
          value={formatBDTMinor(escrowMinor.toString(), locale)}
          changeText={isBn ? 'সেশন সম্পন্ন হলে রিলিজ হবে' : 'Releases as sessions complete'}
          href={withLocale('/dashboard/tutor/sessions', locale)}
          testId="tutor-escrow-card"
        />

        <HeroKpiCard
          variant="secondary"
          icon={CheckCircle2}
          title={isBn ? 'পরিশোধিত পে-আউট' : 'Paid Out'}
          value={formatBDTMinor(paidOutMinor.toString(), locale)}
          changeText={isBn ? 'প্রকৃত স্থানান্তর সম্পন্ন' : 'Confirmed transfers'}
          href={withLocale('/dashboard/tutor/payments', locale)}
          testId="tutor-paid-out-card"
        />
      </div>

      <div className="rounded-2xl p-6 bg-card border border-brand/25 text-foreground flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft text-primary-soft-foreground text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isBn ? 'এসক্রো সুরক্ষা সক্রিয়' : 'Escrow protection active'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {isBn
              ? 'সেশন সম্পন্ন ও নিশ্চিত হওয়ার পরেই আয় মুক্ত হয়'
              : 'Earnings release only after a session is completed and settled'}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {isBn
              ? 'শিক্ষার্থীর অগ্রিম অর্থ এসক্রোতে সংরক্ষিত থাকে। সেশন সম্পন্ন হওয়ার পর প্ল্যাটফর্ম কমিশন বাদ দিয়ে আপনার নেট আয় উত্তোলনযোগ্য হয়। ন্যূনতম উত্তোলনসীমা: '
              : 'Student prepayments are held in escrow. When a session is settled, your net share after the snapshotted platform commission becomes withdrawable. Minimum payout: '}
            <strong>{formatBDTMinor(minimumMinor.toString(), locale)}</strong>.
          </p>
        </div>

        <div className="shrink-0">
          <Button
            size="sm"
            onClick={openWithdrawModal}
            disabled={!hasAvailable}
            className="bg-brand text-brand-foreground hover:bg-brand-accent font-bold text-xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
            {isBn ? 'পে-আউট অনুরোধ' : 'Request Payout'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                <span>{isBn ? 'পে-আউট অনুরোধ' : 'Payout Requests'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {payouts.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {isBn ? 'কোনো পে-আউট অনুরোধ নেই' : 'No payout requests yet'}
                </div>
              ) : (
                payouts.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-2xl bg-card/80 border border-border flex items-center justify-between gap-3 text-xs"
                    data-testid={`payout-record-${rec.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <span>{formatBDTMinor(rec.amountMinor, locale)}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          ({rec.method.toUpperCase()})
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {rec.payoutNumber} · {rec.accountReferenceMasked}
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <Badge variant={statusVariant(rec.status)} className="text-[10px] py-0.5">
                        {payoutStatusLabel(rec.status, isBn)}
                      </Badge>
                      <span className="block text-[10px] text-muted-foreground">
                        {formatDateTime(rec.createdAt, locale)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <span>{isBn ? 'পে-আউট নীতি' : 'Payout Policy'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-xs text-muted-foreground">
              <p>
                {isBn
                  ? 'প্রতিটি অনুরোধ অর্থ বিভাগ পর্যালোচনা করে। অনুমোদনের পর প্রকৃত ব্যাংক/মোবাইল ব্যাংকিং রেফারেন্সসহ স্থানান্তর নিশ্চিত করা হয়।'
                  : 'Every request is reviewed by finance. A transfer is only marked paid after a real bank or mobile-wallet reference is recorded.'}
              </p>
              <p className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {isBn ? 'সাধারণত ২ কর্মদিবসের মধ্যে পর্যালোচনা' : 'Usually reviewed within 2 business days'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span>{isBn ? 'সেশন নিষ্পত্তির বিবরণ' : 'Session Settlement Ledger'}</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {isBn
                  ? 'প্রতিটি নিষ্পত্তিকৃত সেশনের গ্রস, কমিশন ও নেট আয়'
                  : 'Gross, commission and net amount for each settled session'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {settlements.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="text-xs">
                    {isBn ? 'এখনও কোনো সেশন নিষ্পত্তি হয়নি।' : 'No settled sessions yet.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {settlements.map((settlement) => (
                    <div
                      key={settlement.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-xl"
                      data-testid={`settlement-row-${settlement.id}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            #{settlement.sessionId.slice(0, 8)}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {(settlement.commissionRateBps / 100).toFixed(2)}% fee
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(settlement.settledAt, locale)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          <span className="block text-[10px] text-muted-foreground">
                            {isBn ? 'গ্রস' : 'Gross'}
                          </span>
                          <span className="text-xs font-semibold">
                            {formatBDTMinor(settlement.grossAmountMinor, locale)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-muted-foreground">
                            {isBn ? 'কমিশন' : 'Fee'}
                          </span>
                          <span className="text-xs font-semibold">
                            {formatBDTMinor(settlement.platformFeeMinor, locale)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-muted-foreground">
                            {isBn ? 'নেট' : 'Net'}
                          </span>
                          <span className="text-sm font-bold text-success-soft-foreground">
                            {formatBDTMinor(settlement.tutorNetMinor, locale)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
        <DialogContent className="max-w-md" data-testid="payout-modal">
          <DialogHeader className="border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
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
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                {isBn ? 'উত্তোলনের মাধ্যম নির্বাচন করুন:' : 'Select Payout Channel:'}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(['bkash', 'nagad', 'bank'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSelectedMethod(method)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring ${
                      selectedMethod === method
                        ? 'border-primary bg-primary-soft text-primary-soft-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {method === 'bank' ? 'Bank' : method === 'bkash' ? 'bKash' : 'Nagad'}
                  </button>
                ))}
              </div>
            </div>

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
                autoComplete="off"
                className="rounded-xl"
                data-testid="payout-account-input"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <Label htmlFor="payout-amount" className="font-medium text-foreground">
                  {isBn ? 'উত্তোলনের পরিমাণ (টাকা)' : 'Withdrawal Amount (BDT)'}
                </Label>
                <span className="text-muted-foreground text-[11px]">
                  {isBn ? 'উপলব্ধ:' : 'Available:'}{' '}
                  {formatBDTMinor(availableMinor.toString(), locale)}
                </span>
              </div>
              <Input
                id="payout-amount"
                type="text"
                inputMode="decimal"
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
                disabled={requestState.isLoading}
                className="bg-primary hover:bg-primary-hover text-white font-bold text-xs"
                data-testid="confirm-withdraw-btn"
              >
                {requestState.isLoading ? (
                  <LoadingSpinner />
                ) : isBn ? (
                  'উত্তোলন অনুরোধ করুন'
                ) : (
                  'Submit Payout Request'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </TutorLayout>
  );
}
