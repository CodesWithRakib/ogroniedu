'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, PlusCircle, RefreshCw, ShieldCheck, UserCheck, X } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, CardContent, Button, Badge, Alert, AlertDescription } from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import {
  useGetReplacementCasesQuery,
  useAcceptReplacementOfferMutation,
  useDeclineReplacementOfferMutation,
  useCancelReplacementCaseMutation,
  type ReplacementCaseView,
} from '@/store/services/trust-api';

const STATUS_LABELS: Record<string, { en: string; bn: string }> = {
  requested: { en: 'Requested', bn: 'অনুরোধ গৃহীত' },
  under_review: { en: 'Under review', bn: 'পর্যালোচনায়' },
  matching: { en: 'Matching', bn: 'শিক্ষক খোঁজা হচ্ছে' },
  offered: { en: 'Tutor offered', bn: 'শিক্ষক প্রস্তাবিত' },
  accepted: { en: 'Replacement accepted', bn: 'শিক্ষক গ্রহণ করা হয়েছে' },
  rejected: { en: 'Rejected', bn: 'প্রত্যাখ্যাত' },
  closed: { en: 'Closed', bn: 'সমাপ্ত' },
  refund_eligible: { en: 'Eligible for refund review', bn: 'রিফান্ড পর্যালোচনার যোগ্য' },
  cancelled: { en: 'Cancelled', bn: 'বাতিল' },
};

export function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  const label = STATUS_LABELS[status];
  const variant =
    status === 'accepted'
      ? 'success'
      : status === 'requested' || status === 'matching' || status === 'under_review'
        ? 'warning'
        : status === 'refund_eligible'
          ? 'info'
          : 'outline';
  return (
    <Badge variant={variant as never}>
      {label ? (locale === 'bn' ? label.bn : label.en) : status}
    </Badge>
  );
}

export function CaseCard({
  item,
  locale,
  onAccept,
  onDecline,
  onCancel,
  isMutating,
}: {
  item: ReplacementCaseView;
  locale: Locale;
  onAccept: (caseId: string) => void;
  onDecline: (caseId: string) => void;
  onCancel: (caseId: string) => void;
  isMutating: boolean;
}) {
  const isBn = locale === 'bn';
  return (
    <Card
      className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs"
      data-testid={`replacement-case-${item.id}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black text-slate-900">
              #{item.id.slice(0, 8)}
            </span>
            <Badge
              variant="outline"
              className="text-xs capitalize font-semibold border-slate-300 text-slate-800 bg-slate-50"
            >
              {item.reasonCode.replace(/_/g, ' ')}
            </Badge>
            {item.isOverdue && (
              <Badge variant="destructive" data-testid={`case-overdue-${item.id}`}>
                {isBn ? 'সময়সীমা অতিক্রান্ত' : 'Overdue'}
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-slate-600 font-medium">
            {isBn ? 'দায়ের:' : 'Filed:'} {formatDateTime(item.createdAt, locale)}
          </span>
        </div>
        <StatusBadge status={item.status} locale={locale} />
      </div>

      <p className="text-xs rounded-xl bg-slate-50 border border-slate-200 p-3 text-slate-900 font-medium">
        {item.explanation}
      </p>

      {item.deadlineAt &&
        !['accepted', 'rejected', 'closed', 'refund_eligible', 'cancelled'].includes(
          item.status,
        ) && (
          <div className="flex items-center gap-2 text-xs text-purple-900 font-semibold bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5 w-fit">
            <Clock className="w-4 h-4 text-purple-700" aria-hidden="true" />
            <span>
              {isBn ? 'ম্যাচিং সময়সীমা:' : 'Matching Deadline:'}{' '}
              {formatDateTime(item.deadlineAt, locale)}
            </span>
          </div>
        )}

      {item.userVisibleNote && (
        <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium">
          <span className="font-bold text-slate-900">
            {isBn ? 'সর্বশেষ আপডেট: ' : 'Latest update: '}
          </span>
          {item.userVisibleNote}
        </p>
      )}

      {item.refundEligibility === 'eligible' && (
        <Alert
          className="rounded-xl border-emerald-300 bg-emerald-50 text-emerald-950"
          data-testid={`refund-eligible-${item.id}`}
        >
          <AlertDescription className="text-xs font-semibold">
            {isBn
              ? 'এই কেসটি রিফান্ড পর্যালোচনার জন্য যোগ্য হিসেবে চিহ্নিত। ১০০% মানিব্যাক গ্যারান্টি অনুসারে এসক্রো রিফান্ড প্রক্রিয়াধীন।'
              : 'This case is marked eligible for refund review under the 100% money-back guarantee.'}
          </AlertDescription>
        </Alert>
      )}

      {item.status === 'offered' && item.replacementTutor && (
        <div
          className="p-4 rounded-2xl bg-blue-50 border border-blue-300 space-y-3"
          data-testid={`offer-${item.id}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-slate-900">
              {isBn ? 'বিকল্প শিক্ষক প্রস্তাব:' : 'Proposed replacement tutor:'}{' '}
              <span className="text-blue-700 font-bold">{item.replacementTutor.displayName}</span>
            </p>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white">
              {isBn ? 'যাচাইকৃত' : 'Verified'}
            </span>
          </div>
          <p className="text-xs text-slate-700 font-medium">
            {isBn
              ? 'শিক্ষকের প্রোফাইল ও পড়ানোর সময় যাচাই করে গ্রহণ বা প্রত্যাখ্যান করুন।'
              : 'Review tutor profile and schedule to accept or decline.'}
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              disabled={isMutating}
              onClick={() => onAccept(item.id)}
              className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid={`accept-offer-${item.id}`}
            >
              <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
              {isBn ? 'গ্রহণ করুন' : 'Accept'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isMutating}
              onClick={() => onDecline(item.id)}
              className="gap-1.5 text-xs font-bold border-slate-300 bg-white hover:bg-slate-100 text-slate-800"
              data-testid={`decline-offer-${item.id}`}
            >
              <X className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
              {isBn ? 'প্রত্যাখ্যান' : 'Decline'}
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
        <Link
          href={withLocale(`/tutor-replacements/${item.id}`, locale)}
          className="font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
        >
          {isBn ? 'বিস্তারিত ও ইতিহাস দেখুন' : 'View details & history'}
        </Link>
        {['requested', 'under_review'].includes(item.status) && (
          <Button
            size="sm"
            variant="ghost"
            disabled={isMutating}
            onClick={() => onCancel(item.id)}
            className="text-xs text-slate-600 hover:text-rose-700"
          >
            {isBn ? 'অনুরোধ প্রত্যাহার' : 'Withdraw request'}
          </Button>
        )}
      </div>
    </Card>
  );
}

export interface TutorReplacementsListPageProps {
  locale: Locale;
}

export function TutorReplacementsListPage({ locale }: TutorReplacementsListPageProps) {
  const isBn = locale === 'bn';

  const { data, isLoading, isError, refetch } = useGetReplacementCasesQuery();
  const [acceptOffer, acceptState] = useAcceptReplacementOfferMutation();
  const [declineOffer, declineState] = useDeclineReplacementOfferMutation();
  const [cancelCase, cancelState] = useCancelReplacementCaseMutation();
  const [actionError, setActionError] = React.useState<string | null>(null);

  const cases = data?.data ?? [];
  const isMutating = acceptState.isLoading || declineState.isLoading || cancelState.isLoading;

  const runAction = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
      refetch();
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'data' in err
          ? ((err as { data?: { error?: { message?: string } } }).data?.error?.message ??
            (isBn ? 'কাজটি ব্যর্থ হয়েছে।' : 'The action failed.'))
          : isBn
            ? 'কাজটি ব্যর্থ হয়েছে।'
            : 'The action failed.';
      setActionError(message);
    }
  };

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'শিক্ষক রিপ্লেসমেন্ট গ্যারান্টি' : 'Tutor Replacement Guarantee'}
      subtitle={
        isBn
          ? 'আপনার বুকিংয়ের রিপ্লেসমেন্ট কেস, সময়সীমা ও ফলাফল'
          : 'Your replacement cases, deadlines and outcomes'
      }
      actions={
        <Link
          href={withLocale('/tutor-replacements/new', locale)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold"
          data-testid="start-replacement-request"
        >
          <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isBn ? 'নতুন অনুরোধ' : 'New request'}</span>
        </Link>
      }
    >
      <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/70 flex items-start gap-4 shadow-xs">
        <RefreshCw className="w-6 h-6 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <h4 className="text-sm font-black text-slate-900">
            {isBn
              ? '১০০% অভিভাবক সুরক্ষা ও ৪৮ ঘণ্টার শিক্ষক রিপ্লেসমেন্ট গ্যারান্টি'
              : '100% Trust & 48-Hour Tutor Replacement Guarantee'}
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {isBn
              ? 'যোগ্য বুকিংয়ের জন্য আপনি বিকল্প যাচাইকৃত শিক্ষক চাইতে পারেন। অপারেশনস টিম নির্ধারিত ৪৮ ঘণ্টার মধ্যে উপযুক্ত শিক্ষক খুঁজে দেয়; বিকল্প না মিললে সম্পূর্ণ এসক্রো ফি রিফান্ডের আওতায় আসবে।'
              : 'For an eligible booking you can request a verified replacement tutor. Operations matches within the 48-hour policy window; if no replacement is accepted, the case can proceed to a full escrow refund review.'}
          </p>
        </div>
      </div>

      {actionError && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription role="alert">{actionError}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {isBn ? 'লোড হচ্ছে...' : 'Loading replacement cases...'}
        </div>
      ) : isError ? (
        <Card className="py-12 text-center rounded-2xl">
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {isBn ? 'কেস লোড করা যায়নি।' : 'Failed to load replacement cases.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      ) : cases.length === 0 ? (
        <Card className="py-16 text-center rounded-2xl">
          <CardContent className="space-y-3">
            <ShieldCheck className="w-14 h-14 text-success mx-auto" aria-hidden="true" />
            <h4 className="text-base font-bold text-foreground">
              {isBn ? 'কোনো রিপ্লেসমেন্ট কেস নেই' : 'No replacement cases'}
            </h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {isBn
                ? 'যোগ্য বুকিং থেকে প্রয়োজনে নতুন অনুরোধ করতে পারেন।'
                : 'You can start a request from an eligible booking when needed.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4" data-testid="replacement-cases-list">
          {cases.map((item) => (
            <CaseCard
              key={item.id}
              item={item}
              locale={locale}
              isMutating={isMutating}
              onAccept={(caseId) => void runAction(() => acceptOffer(caseId).unwrap())}
              onDecline={(caseId) => void runAction(() => declineOffer(caseId).unwrap())}
              onCancel={(caseId) => void runAction(() => cancelCase(caseId).unwrap())}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
