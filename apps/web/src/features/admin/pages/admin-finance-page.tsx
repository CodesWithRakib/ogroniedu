'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  Play,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  LoadingSpinner,
} from '@/components/ui';
import { formatBDTMinor, formatDateTime } from '@/lib/format';
import type { Locale } from '@/lib/i18n';
import {
  useApprovePayoutMutation,
  useConfirmManualRefundMutation,
  useCreateCommissionPolicyMutation,
  useDecideRefundMutation,
  useGetFinancePayoutsQuery,
  useGetFinanceRefundsQuery,
  useGetLedgerReconciliationQuery,
  useListCommissionPoliciesQuery,
  useMarkPayoutFailedMutation,
  useMarkPayoutPaidMutation,
  useProcessRefundMutation,
  useRejectPayoutMutation,
  useRunFinanceReconciliationMutation,
  type PaymentRefund,
  type Payout,
  type ReconciliationReport,
} from '@/store/services/payments-api';

type Section = 'refunds' | 'payouts' | 'reconciliation' | 'policy';

function refundVariant(status: PaymentRefund['status']) {
  if (status === 'succeeded') return 'success' as const;
  if (status === 'rejected' || status === 'failed') return 'destructive' as const;
  if (status === 'approved' || status === 'processing') return 'info' as const;
  return 'warning' as const;
}

function payoutVariant(status: Payout['status']) {
  if (status === 'paid') return 'success' as const;
  if (status === 'rejected' || status === 'failed') return 'destructive' as const;
  if (status === 'approved' || status === 'processing') return 'info' as const;
  return 'warning' as const;
}

function parseBdtToMinor(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const whole = Number(match[1]);
  if (!Number.isSafeInteger(whole)) return null;
  return whole * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

function errorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'data' in err) {
    const data = (err as { data?: { error?: { message?: string } } }).data;
    if (data?.error?.message) return data.error.message;
  }
  return fallback;
}

export function AdminFinancePage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const [section, setSection] = useState<Section>('refunds');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const refundsQuery = useGetFinanceRefundsQuery({});
  const payoutsQuery = useGetFinancePayoutsQuery({});
  const policiesQuery = useListCommissionPoliciesQuery();
  const ledgerQuery = useGetLedgerReconciliationQuery();
  const [decideRefund, decideState] = useDecideRefundMutation();
  const [processRefund, processState] = useProcessRefundMutation();
  const [confirmManual, confirmState] = useConfirmManualRefundMutation();
  const [approvePayout, approveState] = useApprovePayoutMutation();
  const [rejectPayout, rejectState] = useRejectPayoutMutation();
  const [markPaid, markPaidState] = useMarkPayoutPaidMutation();
  const [markFailed, markFailedState] = useMarkPayoutFailedMutation();
  const [runReconciliation, reconciliationState] = useRunFinanceReconciliationMutation();
  const [createPolicy, policyState] = useCreateCommissionPolicyMutation();

  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [manualRefund, setManualRefund] = useState<PaymentRefund | null>(null);
  const [manualReference, setManualReference] = useState('');
  const [payPayout, setPayPayout] = useState<Payout | null>(null);
  const [transferReference, setTransferReference] = useState('');
  const [failPayout, setFailPayout] = useState<Payout | null>(null);
  const [failReason, setFailReason] = useState('');
  const [policyOpen, setPolicyOpen] = useState(false);
  const [feePercent, setFeePercent] = useState('8');
  const [minPayout, setMinPayout] = useState('500');
  const [policyNotes, setPolicyNotes] = useState('');

  const activePolicy = useMemo(
    () => policiesQuery.data?.data?.find((policy) => policy.isActive) ?? null,
    [policiesQuery.data],
  );

  const busy =
    decideState.isLoading ||
    processState.isLoading ||
    confirmState.isLoading ||
    approveState.isLoading ||
    rejectState.isLoading ||
    markPaidState.isLoading ||
    markFailedState.isLoading;

  function reportResult(message: string) {
    setActionError(null);
    setActionSuccess(message);
  }

  function reportError(err: unknown, fallback: string) {
    setActionSuccess(null);
    setActionError(errorMessage(err, fallback));
  }

  async function handleDecide(refund: PaymentRefund, decision: 'approve' | 'reject') {
    try {
      const note =
        decision === 'reject'
          ? isBn
            ? 'অর্থ বিভাগের পর্যালোচনায় প্রত্যাখ্যাত'
            : 'Declined by finance review'
          : undefined;
      await decideRefund({ refundId: refund.id, decision, note }).unwrap();
      reportResult(
        decision === 'approve'
          ? isBn
            ? 'রিফান্ড অনুমোদিত হয়েছে।'
            : 'Refund approved.'
          : isBn
            ? 'রিফান্ড প্রত্যাখ্যান করা হয়েছে।'
            : 'Refund rejected.',
      );
    } catch (err) {
      reportError(
        err,
        isBn ? 'সিদ্ধান্ত সংরক্ষণ করা যায়নি।' : 'Could not save the refund decision.',
      );
    }
  }

  async function handleProcess(refund: PaymentRefund) {
    try {
      const result = await processRefund(refund.id).unwrap();
      if (result.data.manualConfirmationRequired) {
        setManualReference('');
        setManualRefund(result.data.refund);
        reportResult(
          isBn
            ? 'স্বয়ংক্রিয় রিফান্ড উপলব্ধ নয়। প্রকৃত স্থানান্তর সম্পন্ন করে রেফারেন্স নিশ্চিত করুন।'
            : 'Automated refunds are unavailable. Complete the transfer externally and confirm its reference.',
        );
      } else {
        reportResult(
          isBn
            ? `রিফান্ড ${result.data.refund.status} অবস্থায় আছে।`
            : `Refund is now ${result.data.refund.status}.`,
        );
      }
    } catch (err) {
      reportError(err, isBn ? 'রিফান্ড প্রক্রিয়া করা যায়নি।' : 'Could not process the refund.');
    }
  }

  async function handleConfirmManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualRefund) return;
    try {
      await confirmManual({
        refundId: manualRefund.id,
        externalReference: manualReference.trim(),
      }).unwrap();
      setManualRefund(null);
      setManualReference('');
      reportResult(
        isBn
          ? 'রিফান্ড নিশ্চিত ও লেজারে রিভার্সাল পোস্ট হয়েছে।'
          : 'Refund confirmed and reversal posted.',
      );
    } catch (err) {
      reportError(
        err,
        isBn ? 'রিফান্ড নিশ্চিত করা যায়নি।' : 'Could not confirm the manual refund.',
      );
    }
  }

  async function handleApprovePayout(payout: Payout) {
    try {
      await approvePayout(payout.id).unwrap();
      reportResult(isBn ? 'পে-আউট অনুমোদিত হয়েছে।' : 'Payout approved.');
    } catch (err) {
      reportError(err, isBn ? 'পে-আউট অনুমোদন করা যায়নি।' : 'Could not approve the payout.');
    }
  }

  async function handleRejectPayout(payout: Payout) {
    try {
      await rejectPayout({
        payoutId: payout.id,
        reason: isBn ? 'অর্থ বিভাগের পর্যালোচনায় প্রত্যাখ্যাত' : 'Declined by finance review',
      }).unwrap();
      reportResult(isBn ? 'পে-আউট প্রত্যাখ্যান করা হয়েছে।' : 'Payout rejected.');
    } catch (err) {
      reportError(err, isBn ? 'পে-আউট প্রত্যাখ্যান করা যায়নি।' : 'Could not reject the payout.');
    }
  }

  async function handleMarkPaid(e: React.FormEvent) {
    e.preventDefault();
    if (!payPayout) return;
    try {
      await markPaid({
        payoutId: payPayout.id,
        externalReference: transferReference.trim(),
      }).unwrap();
      setPayPayout(null);
      setTransferReference('');
      reportResult(isBn ? 'পে-আউট পরিশোধিত হিসেবে নিশ্চিত হয়েছে।' : 'Payout marked as paid.');
    } catch (err) {
      reportError(err, isBn ? 'পে-আউট নিশ্চিত করা যায়নি।' : 'Could not confirm the payout.');
    }
  }

  async function handleMarkFailed(e: React.FormEvent) {
    e.preventDefault();
    if (!failPayout) return;
    try {
      await markFailed({ payoutId: failPayout.id, reason: failReason.trim() }).unwrap();
      setFailPayout(null);
      setFailReason('');
      reportResult(isBn ? 'পে-আউট ব্যর্থ হিসেবে চিহ্নিত হয়েছে।' : 'Payout marked as failed.');
    } catch (err) {
      reportError(err, isBn ? 'পে-আউট আপডেট করা যায়নি।' : 'Could not update the payout.');
    }
  }

  async function handleRunReconciliation() {
    try {
      const result = await runReconciliation().unwrap();
      setReport(result.data);
      await ledgerQuery.refetch();
      reportResult(
        result.data.isLedgerBalanced
          ? isBn
            ? 'রিকনসিলিয়েশন সম্পন্ন: লেজার সমন্বিত।'
            : 'Reconciliation complete: ledger is balanced.'
          : isBn
            ? 'রিকনসিলিয়েশন সম্পন্ন: অসঙ্গতি পাওয়া গেছে।'
            : 'Reconciliation complete: discrepancies found.',
      );
    } catch (err) {
      reportError(err, isBn ? 'রিকনসিলিয়েশন চালানো যায়নি।' : 'Could not run reconciliation.');
    }
  }

  async function handleCreatePolicy(e: React.FormEvent) {
    e.preventDefault();
    const fee = Number(feePercent);
    const minMinor = parseBdtToMinor(minPayout);
    if (!Number.isFinite(fee) || fee < 0 || fee > 30 || minMinor === null) {
      setActionSuccess(null);
      setActionError(
        isBn
          ? 'কমিশন ০–৩০% এবং ন্যূনতম পে-আউট সঠিক টাকার অঙ্কে দিন।'
          : 'Enter a commission between 0–30% and a valid minimum payout amount.',
      );
      return;
    }
    try {
      const created = await createPolicy({
        platformFeeBps: Math.round(fee * 100),
        minPayoutMinor: minMinor,
        notes: policyNotes.trim() || undefined,
      }).unwrap();
      setPolicyOpen(false);
      setPolicyNotes('');
      reportResult(
        isBn
          ? `নতুন কমিশন পলিসি সংস্করণ ${created.data.version} সক্রিয় হয়েছে।`
          : `Commission policy version ${created.data.version} is now active.`,
      );
    } catch (err) {
      reportError(err, isBn ? 'পলিসি সংরক্ষণ করা যায়নি।' : 'Could not save the policy.');
    }
  }

  const tabs: Array<{ id: Section; en: string; bn: string; icon: React.ElementType }> = [
    { id: 'refunds', en: 'Refunds', bn: 'রিফান্ড', icon: RefreshCw },
    { id: 'payouts', en: 'Tutor Payouts', bn: 'শিক্ষক পে-আউট', icon: CreditCard },
    { id: 'reconciliation', en: 'Reconciliation', bn: 'রিকনসিলিয়েশন', icon: ShieldCheck },
    { id: 'policy', en: 'Commission Policy', bn: 'কমিশন পলিসি', icon: FileText },
  ];

  const refunds = refundsQuery.data?.data ?? [];
  const payouts = payoutsQuery.data?.data ?? [];
  const ledger = ledgerQuery.data?.data;

  return (
    <AdminLayout locale={locale}>
      <div className="flex flex-col gap-6 py-6" data-testid="admin-finance-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {isBn ? 'আর্থিক অপারেশন' : 'Finance Operations'}
              </h1>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-success-soft text-success-soft-foreground border border-success/30">
                {isBn ? 'অডিটেড' : 'AUDITED'}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1.5">
              {isBn
                ? 'রিফান্ড, শিক্ষক পে-আউট, কমিশন পলিসি এবং লেজার রিকনসিলিয়েশন। সব পরিবর্তন অডিট লগে সংরক্ষিত হয়।'
                : 'Refunds, tutor payouts, commission policy and ledger reconciliation. Every mutation is audited.'}
            </p>
          </div>
        </div>

        {actionSuccess && (
          <Alert className="bg-success-soft border-success/30 text-success-soft-foreground">
            <CheckCircle2 className="w-4 h-4" />
            <AlertDescription>{actionSuccess}</AlertDescription>
          </Alert>
        )}
        {actionError && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2 bg-surface/80 p-1 rounded-2xl border border-border w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSection(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {isBn ? tab.bn : tab.en}
              </button>
            );
          })}
        </div>

        {section === 'refunds' && (
          <Card>
            <CardHeader>
              <CardTitle>{isBn ? 'রিফান্ড কিউ' : 'Refund Queue'}</CardTitle>
              <CardDescription>
                {isBn
                  ? 'অনুরোধ → অনুমোদন → প্রক্রিয়া → নিশ্চিতকরণ। স্বয়ংক্রিয় প্রকল্প না থাকলে প্রকৃত রেফারেন্স দিয়ে ম্যানুয়াল নিশ্চিতকরণ প্রয়োজন।'
                  : 'Request → approval → processing → confirmation. Without a provisioned provider contract, a real external reference is required.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {refundsQuery.isLoading ? (
                <div className="py-10 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : refundsQuery.isError ? (
                <p className="text-xs text-destructive">
                  {isBn ? 'রিফান্ড তালিকা লোড করা যায়নি।' : 'Could not load refunds.'}
                </p>
              ) : refunds.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  {isBn ? 'কোনো রিফান্ড অনুরোধ নেই।' : 'No refund requests.'}
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  {refunds.map((refund) => (
                    <div
                      key={refund.id}
                      className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">
                            {refund.refundNumber ?? refund.id.slice(0, 8)}
                          </span>
                          <Badge variant={refundVariant(refund.status)}>{refund.status}</Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            {formatBDTMinor(refund.amountMinor, locale)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {refund.reason ?? '—'} · {formatDateTime(refund.createdAt, locale)}
                        </p>
                        {refund.failureReason && (
                          <p className="text-[11px] text-destructive">{refund.failureReason}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {refund.status === 'requested' && (
                          <>
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => handleDecide(refund, 'approve')}
                            >
                              {isBn ? 'অনুমোদন' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => handleDecide(refund, 'reject')}
                            >
                              {isBn ? 'প্রত্যাখ্যান' : 'Reject'}
                            </Button>
                          </>
                        )}
                        {refund.status === 'approved' && (
                          <>
                            <Button size="sm" disabled={busy} onClick={() => handleProcess(refund)}>
                              {isBn ? 'প্রক্রিয়া করুন' : 'Process'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => {
                                setManualReference('');
                                setManualRefund(refund);
                              }}
                            >
                              {isBn ? 'ম্যানুয়াল নিশ্চিতকরণ' : 'Confirm manual'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {section === 'payouts' && (
          <Card>
            <CardHeader>
              <CardTitle>{isBn ? 'শিক্ষক পে-আউট কিউ' : 'Tutor Payout Queue'}</CardTitle>
              <CardDescription>
                {isBn
                  ? 'অনুমোদনের পর প্রকৃত ব্যাংক/ওয়ালেট রেফারেন্সসহ পরিশোধ নিশ্চিত করুন। কোনো স্বয়ংক্রিয় অর্থ স্থানান্তর হয় না।'
                  : 'After approval, confirm payment with a real bank/wallet reference. No automated money movement occurs.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payoutsQuery.isLoading ? (
                <div className="py-10 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : payoutsQuery.isError ? (
                <p className="text-xs text-destructive">
                  {isBn ? 'পে-আউট তালিকা লোড করা যায়নি।' : 'Could not load payouts.'}
                </p>
              ) : payouts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  {isBn ? 'কোনো পে-আউট অনুরোধ নেই।' : 'No payout requests.'}
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  {payouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{payout.payoutNumber}</span>
                          <Badge variant={payoutVariant(payout.status)}>{payout.status}</Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            {formatBDTMinor(payout.amountMinor, locale)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {payout.method.toUpperCase()} · {payout.accountReferenceMasked} ·{' '}
                          {formatDateTime(payout.createdAt, locale)}
                        </p>
                        {payout.externalReference && (
                          <p className="text-[11px] text-muted-foreground">
                            Ref: {payout.externalReference}
                          </p>
                        )}
                        {payout.failureReason && (
                          <p className="text-[11px] text-destructive">{payout.failureReason}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {payout.status === 'requested' && (
                          <>
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => handleApprovePayout(payout)}
                            >
                              {isBn ? 'অনুমোদন' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => handleRejectPayout(payout)}
                            >
                              {isBn ? 'প্রত্যাখ্যান' : 'Reject'}
                            </Button>
                          </>
                        )}
                        {(payout.status === 'approved' || payout.status === 'processing') && (
                          <>
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => {
                                setTransferReference('');
                                setPayPayout(payout);
                              }}
                            >
                              {isBn ? 'পরিশোধিত চিহ্নিত করুন' : 'Mark paid'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => {
                                setFailReason('');
                                setFailPayout(payout);
                              }}
                            >
                              {isBn ? 'ব্যর্থ চিহ্নিত করুন' : 'Mark failed'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {section === 'reconciliation' && (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>{isBn ? 'লেজার রিকনসিলিয়েশন' : 'Ledger Reconciliation'}</CardTitle>
                  <CardDescription>
                    {isBn
                      ? 'ডেবিট = ক্রেডিট যাচাই, অর্ডার/রিফান্ড/পে-আউট ক্রস-চেক এবং চলমান ব্যালেন্স।'
                      : 'Debit = credit verification, order/refund/payout cross-checks and current balances.'}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  disabled={reconciliationState.isLoading}
                  onClick={handleRunReconciliation}
                >
                  <Play className="w-3.5 h-3.5 mr-1" />
                  {isBn ? 'রিকনসিলিয়েশন চালান' : 'Run reconciliation'}
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {ledger ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-surface border border-border">
                        <p className="text-[11px] text-muted-foreground">
                          {isBn ? 'মোট ডেবিট' : 'Total debits'}
                        </p>
                        <p className="font-mono font-bold text-sm">
                          {formatBDTMinor(ledger.totalDebits, locale)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-surface border border-border">
                        <p className="text-[11px] text-muted-foreground">
                          {isBn ? 'মোট ক্রেডিট' : 'Total credits'}
                        </p>
                        <p className="font-mono font-bold text-sm">
                          {formatBDTMinor(ledger.totalCredits, locale)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-surface border border-border">
                        <p className="text-[11px] text-muted-foreground">
                          {isBn ? 'সমন্বয় অবস্থা' : 'Balance state'}
                        </p>
                        <p
                          className={`font-bold text-sm ${
                            ledger.isBalanced ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {ledger.isBalanced
                            ? isBn
                              ? 'সমন্বিত'
                              : 'Balanced'
                            : isBn
                              ? 'অসঙ্গতি'
                              : 'Discrepancy'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ledger.accounts.map((account) => (
                        <div
                          key={account.code}
                          className="p-3 rounded-xl bg-surface/75 border border-border flex items-center justify-between"
                        >
                          <div>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {account.code}
                            </span>
                            <p className="text-xs font-semibold">{account.name}</p>
                          </div>
                          <span className="font-mono text-xs font-bold">
                            {formatBDTMinor(account.balance, locale)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {isBn ? 'লেজার ব্যালেন্স লোড হচ্ছে…' : 'Loading ledger balances…'}
                  </p>
                )}
              </CardContent>
            </Card>

            {report && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {isBn ? 'সর্বশেষ রিকনসিলিয়েশন রান' : 'Latest Reconciliation Run'}
                  </CardTitle>
                  <CardDescription>{formatDateTime(report.reconciledAt, locale)}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">{isBn ? 'অর্ডার' : 'Orders'}</p>
                      <p className="font-bold">{report.totalOrders}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{isBn ? 'সফল' : 'Succeeded'}</p>
                      <p className="font-bold">{report.succeededOrders}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{isBn ? 'রিফান্ড' : 'Refunds'}</p>
                      <p className="font-bold">{report.totalRefunds}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{isBn ? 'পে-আউট' : 'Payouts'}</p>
                      <p className="font-bold">{report.totalPayouts}</p>
                    </div>
                  </div>
                  {report.unreconciledDiscrepancies.length === 0 ? (
                    <Alert className="bg-success-soft border-success/30 text-success-soft-foreground">
                      <CheckCircle2 className="w-4 h-4" />
                      <AlertDescription>
                        {isBn ? 'কোনো অসঙ্গতি পাওয়া যায়নি।' : 'No discrepancies found.'}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {report.unreconciledDiscrepancies.map((row) => (
                        <Alert key={`${row.reference}-${row.reason}`} variant="destructive">
                          <XCircle className="w-4 h-4" />
                          <AlertDescription>
                            <strong>{row.reference}</strong>: {row.reason}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {section === 'policy' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>{isBn ? 'কমিশন পলিসি সংস্করণ' : 'Commission Policy Versions'}</CardTitle>
                <CardDescription>
                  {isBn
                    ? 'নতুন সংস্করণ পুরনোটি নিষ্ক্রিয় করে; ইতিমধ্যে তৈরি অর্ডার নিজের স্ন্যাপশটেড হার ধরে রাখে।'
                    : 'A new version deactivates the previous one; existing orders keep their snapshotted rate.'}
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setPolicyOpen(true)}>
                {isBn ? 'নতুন সংস্করণ' : 'New version'}
              </Button>
            </CardHeader>
            <CardContent>
              {policiesQuery.isLoading ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {(policiesQuery.data?.data ?? []).map((policy) => (
                    <div
                      key={policy.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold">
                          v{policy.version}{' '}
                          {policy.isActive && (
                            <Badge variant="success" className="ml-2">
                              {isBn ? 'সক্রিয়' : 'Active'}
                            </Badge>
                          )}
                        </p>
                        <p className="text-muted-foreground">
                          {formatDateTime(policy.effectiveFrom, locale)}
                          {policy.notes ? ` · ${policy.notes}` : ''}
                        </p>
                      </div>
                      <div className="text-right font-mono">
                        <p>{(policy.platformFeeBps / 100).toFixed(2)}%</p>
                        <p className="text-muted-foreground">
                          min {formatBDTMinor(policy.minPayoutMinor, locale)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Manual refund confirmation */}
      <Dialog open={!!manualRefund} onOpenChange={(open) => !open && setManualRefund(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isBn ? 'ম্যানুয়াল রিফান্ড নিশ্চিতকরণ' : 'Confirm Manual Refund'}
            </DialogTitle>
            <DialogDescription>
              {isBn
                ? 'প্রকৃত ব্যাংক/প্রদানকারী স্থানান্তর সম্পন্ন করার পর তার রেফারেন্স দিন। সার্ভার নিজে কোনো রেফারেন্স তৈরি করে না।'
                : 'Complete the real bank/provider transfer first, then record its reference. The server never invents a reference.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmManual} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="refund-ref">
                {isBn ? 'বাহ্যিক রেফারেন্স' : 'External reference'}
              </Label>
              <Input
                id="refund-ref"
                value={manualReference}
                onChange={(e) => setManualReference(e.target.value)}
                required
                minLength={4}
              />
            </div>
            <Button type="submit" disabled={confirmState.isLoading} className="w-full">
              {confirmState.isLoading ? (
                <LoadingSpinner />
              ) : isBn ? (
                'নিশ্চিত করুন'
              ) : (
                'Confirm refund'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mark payout paid */}
      <Dialog open={!!payPayout} onOpenChange={(open) => !open && setPayPayout(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isBn ? 'পে-আউট পরিশোধ নিশ্চিতকরণ' : 'Confirm Payout Transfer'}
            </DialogTitle>
            <DialogDescription>
              {isBn
                ? 'প্রকৃত স্থানান্তরের রেফারেন্স দিন। এটি ছাড়া পে-আউট পরিশোধিত হিসেবে গণ্য হবে না।'
                : 'Provide the real transfer reference. Without it the payout is never marked paid.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMarkPaid} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="payout-ref">
                {isBn ? 'ব্যাংক/ওয়ালেট রেফারেন্স' : 'Bank/wallet reference'}
              </Label>
              <Input
                id="payout-ref"
                value={transferReference}
                onChange={(e) => setTransferReference(e.target.value)}
                required
                minLength={4}
              />
            </div>
            <Button type="submit" disabled={markPaidState.isLoading} className="w-full">
              {markPaidState.isLoading ? (
                <LoadingSpinner />
              ) : isBn ? (
                'পরিশোধিত নিশ্চিত করুন'
              ) : (
                'Confirm paid'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mark payout failed */}
      <Dialog open={!!failPayout} onOpenChange={(open) => !open && setFailPayout(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isBn ? 'পে-আউট ব্যর্থ চিহ্নিতকরণ' : 'Mark Payout Failed'}</DialogTitle>
            <DialogDescription>
              {isBn
                ? 'সংরক্ষিত অর্থ শিক্ষকের উত্তোলনযোগ্য ব্যালেন্সে ফিরে যাবে।'
                : 'The reserved amount returns to the tutor’s withdrawable balance.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMarkFailed} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="payout-fail-reason">{isBn ? 'কারণ' : 'Reason'}</Label>
              <Input
                id="payout-fail-reason"
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                required
                minLength={3}
              />
            </div>
            <Button
              type="submit"
              variant="destructive"
              disabled={markFailedState.isLoading}
              className="w-full"
            >
              {markFailedState.isLoading ? (
                <LoadingSpinner />
              ) : isBn ? (
                'ব্যর্থ চিহ্নিত করুন'
              ) : (
                'Mark failed'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New commission policy version */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isBn ? 'নতুন কমিশন পলিসি' : 'New Commission Policy'}</DialogTitle>
            <DialogDescription>
              {isBn
                ? 'নতুন হার শুধু ভবিষ্যৎ পেমেন্ট অর্ডারে প্রযোজ্য হবে।'
                : 'New rates apply only to future payment orders.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePolicy} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="policy-fee">
                {isBn ? 'প্ল্যাটফর্ম কমিশন (%)' : 'Platform commission (%)'}
              </Label>
              <Input
                id="policy-fee"
                type="number"
                min={0}
                max={30}
                step={0.01}
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="policy-min">
                {isBn ? 'ন্যূনতম পে-আউট (BDT)' : 'Minimum payout (BDT)'}
              </Label>
              <Input
                id="policy-min"
                type="text"
                inputMode="decimal"
                value={minPayout}
                onChange={(e) => setMinPayout(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="policy-notes">{isBn ? 'নোট (ঐচ্ছিক)' : 'Notes (optional)'}</Label>
              <Input
                id="policy-notes"
                value={policyNotes}
                onChange={(e) => setPolicyNotes(e.target.value)}
                maxLength={500}
              />
            </div>
            <Button type="submit" disabled={policyState.isLoading} className="w-full">
              {policyState.isLoading ? (
                <LoadingSpinner />
              ) : isBn ? (
                'সংস্করণ সক্রিয় করুন'
              ) : (
                'Activate version'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {activePolicy && (
        <p className="text-[11px] text-muted-foreground">
          {isBn ? 'সক্রিয় পলিসি:' : 'Active policy:'} v{activePolicy.version} ·{' '}
          {(activePolicy.platformFeeBps / 100).toFixed(2)}%
        </p>
      )}
    </AdminLayout>
  );
}
