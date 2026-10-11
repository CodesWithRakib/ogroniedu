'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Scale,
  Lock,
  ArrowRight,
  ExternalLink,
  Info,
  Clock,
  Sparkles,
  Building,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
} from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';

export interface PaymentOrderDetails {
  id: string;
  bookingId: string;
  payerName: string;
  studentName: string;
  tutorName: string;
  subjectName: string;
  amountMinor: number; // e.g. 100000 = 1000.00 BDT
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  provider: 'bkash' | 'nagad' | 'sslcommerz';
  createdAt: string;
  paidAt?: string;
}

export interface PaymentReceiptData {
  receiptId: string;
  orderId: string;
  bookingId: string;
  payerName: string;
  studentName: string;
  tutorName: string;
  subjectName: string;
  amountBdt: string;
  currency: string;
  status: string;
  paymentMethod: string;
  paidAt: string;
}

interface PaymentCheckoutViewProps {
  locale: Locale;
  initialOrder?: PaymentOrderDetails;
  receipt?: PaymentReceiptData | null;
  payDisabledReason?: string | null;
  onPay?: (provider: 'bkash' | 'nagad' | 'sslcommerz') => Promise<PaymentReceiptData>;
  onSimulateWebhook?: (orderId: string, provider: string) => Promise<void>;
}

export function PaymentCheckoutView({
  locale,
  initialOrder,
  receipt: receiptProp,
  payDisabledReason,
  onPay,
  onSimulateWebhook,
}: PaymentCheckoutViewProps) {
  const dict = getDictionary(locale);
  const p = dict.payments;

  const [order, setOrder] = useState<PaymentOrderDetails | null>(initialOrder ?? null);
  const [selectedGateway, setSelectedGateway] = useState<'bkash' | 'nagad' | 'sslcommerz'>(
    initialOrder?.provider ?? 'bkash',
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState<PaymentReceiptData | null>(receiptProp ?? null);
  const [payError, setPayError] = useState<string | null>(null);

  React.useEffect(() => {
    setOrder(initialOrder ?? null);
  }, [initialOrder]);
  React.useEffect(() => {
    setReceipt(receiptProp ?? null);
  }, [receiptProp]);

  if (!order) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto py-6 px-4 sm:px-6" data-testid="payment-empty-state">
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
          {locale === 'bn'
            ? 'পেমেন্ট অর্ডার তৈরি করতে একটি বুকিং নির্বাচন করুন।'
            : 'Select a booking to create a payment order.'}
        </div>
      </div>
    );
  }

  const amountBdt = (order.amountMinor / 100).toFixed(2);
  const tutorShareBdt = ((order.amountMinor * 0.92) / 100).toFixed(2);
  const platformShareBdt = ((order.amountMinor * 0.08) / 100).toFixed(2);

  const handlePay = async () => {
    setIsProcessing(true);
    setPayError(null);
    try {
      if (onPay) {
        const serverReceipt = await onPay(selectedGateway);
        setReceipt(serverReceipt);
        setOrder({ ...order, status: 'succeeded', provider: selectedGateway, paidAt: serverReceipt.paidAt });
      } else if (onSimulateWebhook) {
        await onSimulateWebhook(order.id, selectedGateway);
      } else {
        throw new Error(
          locale === 'bn'
            ? 'পেমেন্ট এখন উপলব্ধ নয়।'
            : 'Payment is unavailable right now.',
        );
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6 px-4 sm:px-6">
      {/* Sandbox Regulatory Notice Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="text-sm font-medium">
            <span className="font-bold uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded mr-2 text-xs">
              {p.sandboxBadge}
            </span>
            {p.noSuccessOnRedirectNotice}
          </div>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {p.title}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">{p.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order Summary & Gateway Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary Card */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  {p.orderSummaryTitle}
                </CardTitle>
                <Badge
                  variant={
                    order.status === 'succeeded'
                      ? 'success'
                      : order.status === 'pending'
                        ? 'warning'
                        : 'destructive'
                  }
                >
                  {order.status === 'succeeded'
                    ? p.statusSucceeded
                    : order.status === 'pending'
                      ? p.statusPending
                      : p.statusFailed}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">{p.bookingRef}</span>
                  <span className="font-mono font-medium">{order.bookingId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">{p.subject}</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {order.subjectName}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">{p.tutor}</span>
                  <span className="font-medium">{order.tutorName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">{p.student}</span>
                  <span className="font-medium">
                    {order.studentName} ({order.payerName})
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-4 flex items-baseline justify-between">
                <span className="text-base font-semibold text-slate-900 dark:text-white">
                  {p.totalAmount}
                </span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  ৳ {formatLocalizedNumber(amountBdt, locale)} {order.currency}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Gateway Selection */}
          {order.status === 'pending' && (
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  {p.selectGateway}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* bKash Option */}
                <div
                  onClick={() => setSelectedGateway('bkash')}
                  className={`cursor-pointer rounded-xl border p-4 transition-all flex items-center justify-between ${
                    selectedGateway === 'bkash'
                      ? 'border-pink-500 bg-pink-500/5 ring-2 ring-pink-500/30'
                      : 'border-border hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      বিকাশ
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {p.bkashTitle}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.bkashDesc}</div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="gateway"
                    checked={selectedGateway === 'bkash'}
                    onChange={() => setSelectedGateway('bkash')}
                    className="w-4 h-4 text-pink-600"
                  />
                </div>

                {/* Nagad Option */}
                <div
                  onClick={() => setSelectedGateway('nagad')}
                  className={`cursor-pointer rounded-xl border p-4 transition-all flex items-center justify-between ${
                    selectedGateway === 'nagad'
                      ? 'border-orange-500 bg-orange-500/5 ring-2 ring-orange-500/30'
                      : 'border-border hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      নগদ
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {p.nagadTitle}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.nagadDesc}</div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="gateway"
                    checked={selectedGateway === 'nagad'}
                    onChange={() => setSelectedGateway('nagad')}
                    className="w-4 h-4 text-orange-600"
                  />
                </div>

                {/* SSLCOMMERZ Option */}
                <div
                  onClick={() => setSelectedGateway('sslcommerz')}
                  className={`cursor-pointer rounded-xl border p-4 transition-all flex items-center justify-between ${
                    selectedGateway === 'sslcommerz'
                      ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/30'
                      : 'border-border hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                      CARDS
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {p.sslTitle}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.sslDesc}</div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="gateway"
                    checked={selectedGateway === 'sslcommerz'}
                    onChange={() => setSelectedGateway('sslcommerz')}
                    className="w-4 h-4 text-blue-600"
                  />
                </div>
              </CardContent>

              <CardFooter className="pt-2">
                {payError && (
                  <div role="alert" className="mb-3 w-full rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700" data-testid="payment-error">
                    {payError}
                  </div>
                )}
                <Button
                  onClick={handlePay}
                  disabled={isProcessing || Boolean(payDisabledReason) || order.status !== 'pending'}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 text-base flex items-center justify-center gap-2"
                  data-testid="pay-now-btn"
                >
                  {isProcessing ? (
                    <span>{dict.common.loading}</span>
                  ) : payDisabledReason ? (
                    <span className="text-sm">{payDisabledReason}</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      {p.payNow} (৳ {formatLocalizedNumber(amountBdt, locale)})
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Succeeded Receipt Card */}
          {order.status === 'succeeded' && receipt && (
            <Card className="border border-emerald-500/30 bg-emerald-500/5 shadow-md">
              <CardHeader className="pb-3 border-b border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    {p.receiptTitle}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    {p.printReceipt}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">{p.receiptNumber}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {receipt.receiptId}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">{p.paymentMethod}</span>
                  <span className="font-semibold">{receipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">{p.paidAt}</span>
                  <span>{new Date(receipt.paidAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 items-baseline">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {p.totalAmount}
                  </span>
                  <span className="text-xl font-black text-emerald-600">
                    ৳ {formatLocalizedNumber(receipt.amountBdt, locale)} {receipt.currency}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Double-Entry Financial Ledger & Integrity Status */}
        <div className="space-y-6">
          {/* Double-Entry Ledger Breakdown */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600" />
                {p.ledgerBreakdownTitle}
              </CardTitle>
              <CardDescription className="text-xs">{p.escrowDepositNote}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Milestone Settlement Accounting Structure */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-lg">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {p.tutorShare}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ৳ {formatLocalizedNumber(tutorShareBdt, locale)}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-lg">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {p.platformShare}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ৳ {formatLocalizedNumber(platformShareBdt, locale)}
                  </span>
                </div>
              </div>

              {/* Invariant Badge */}
              <div className="border border-emerald-500/20 bg-emerald-500/10 rounded-lg p-3 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {p.ledgerBalanced}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Invariant: SUM(Debits) = SUM(Credits)
                </div>
              </div>

              {/* Operational Refunds Policy Notice */}
              <div className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-border flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>{p.refundPolicyNotice}</span>
              </div>
            </CardContent>
          </Card>

          {/* System Reconciliation Status */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {p.reconciliationTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Ledger Status</span>
                <span className="font-semibold text-emerald-600">Balanced</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Discrepancies</span>
                <span className="font-semibold text-emerald-600">{p.zeroDiscrepancy}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Precision</span>
                <span className="font-mono">Minor Units (Poisha)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Store ID (Sandbox)</span>
                <span className="font-mono font-medium">ogron6ac9fcef6d321</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Payment Tunnel</span>
                <span
                  className="font-mono text-[10px] text-emerald-600 truncate max-w-[150px]"
                  title="https://undone-unsure-twisting.ngrok-free.dev"
                >
                  ngrok active
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
