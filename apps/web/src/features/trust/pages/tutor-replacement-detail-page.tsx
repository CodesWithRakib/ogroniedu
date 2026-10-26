'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, History, RefreshCw, UserCheck, X } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, CardContent, Button, Badge, Alert, AlertDescription } from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import {
  useGetReplacementCaseByIdQuery,
  useAcceptReplacementOfferMutation,
  useDeclineReplacementOfferMutation,
  useCancelReplacementCaseMutation,
} from '@/store/services/trust-api';

export interface ReplacementCaseDetailPageProps {
  locale: Locale;
  caseId: string;
}

export function ReplacementCaseDetailPageView({ locale, caseId }: ReplacementCaseDetailPageProps) {
  const isBn = locale === 'bn';

  const { data, isLoading, isError, refetch } = useGetReplacementCaseByIdQuery(caseId);
  const [acceptOffer, acceptState] = useAcceptReplacementOfferMutation();
  const [declineOffer, declineState] = useDeclineReplacementOfferMutation();
  const [cancelCase, cancelState] = useCancelReplacementCaseMutation();
  const [actionError, setActionError] = React.useState<string | null>(null);

  const detail = data?.data;
  const item = detail?.case;
  const isMutating = acceptState.isLoading || declineState.isLoading || cancelState.isLoading;

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
      refetch();
    } catch {
      setActionError(isBn ? 'কাজটি ব্যর্থ হয়েছে।' : 'The action failed.');
    }
  };

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'রিপ্লেসমেন্ট কেস' : 'Replacement case'}
      subtitle={caseId ? `#${caseId.slice(0, 8)}` : undefined}
      actions={
        <Link
          href={withLocale('/tutor-replacements', locale)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          {isBn ? 'কেস তালিকা' : 'Case list'}
        </Link>
      }
    >
      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {isBn ? 'লোড হচ্ছে...' : 'Loading case...'}
        </p>
      ) : isError || !item ? (
        <Card className="py-16 text-center rounded-2xl">
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {isBn
                ? 'কেসটি পাওয়া যায়নি বা আপনি এর অনুমোদিত ব্যবহারকারী নন।'
                : 'The case was not found, or you are not authorized to view it.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5 max-w-3xl">
          {actionError && (
            <Alert variant="destructive" className="rounded-2xl">
              <AlertDescription role="alert">{actionError}</AlertDescription>
            </Alert>
          )}

          <Card className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize border-slate-300 text-slate-800 bg-slate-50 font-semibold">
                  {item.reasonCode.replace(/_/g, ' ')}
                </Badge>
                {item.isOverdue && (
                  <Badge variant="destructive">{isBn ? 'সময়সীমা অতিক্রান্ত' : 'Overdue'}</Badge>
                )}
              </div>
              <Badge variant="primary" className="capitalize font-bold">
                {item.status.replace(/_/g, ' ')}
              </Badge>
            </div>

            <p className="text-sm text-slate-900 rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-medium">
              {item.explanation}
            </p>

            {item.deadlineAt && (
              <p className="text-xs text-purple-900 font-semibold bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5 w-fit flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-700" aria-hidden="true" />
                <span>
                  {isBn ? 'ম্যাচিং সময়সীমা:' : 'Matching deadline:'}{' '}
                  <strong className="text-slate-900">{formatDateTime(item.deadlineAt, locale)}</strong>
                </span>
              </p>
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
              <Alert className="rounded-xl border-emerald-300 bg-emerald-50 text-emerald-950 font-semibold">
                <AlertDescription className="text-xs">
                  {isBn
                    ? 'রিফান্ড পর্যালোচনার জন্য যোগ্য। ১০০% মানিব্যাক গ্যারান্টি অনুসারে এসক্রো রিফান্ড প্রক্রিয়াধীন।'
                    : 'Eligible for refund review. Escrow refund processing under the 100% money-back guarantee.'}
                </AlertDescription>
              </Alert>
            )}
          </Card>

          {item.status === 'offered' && item.replacementTutor && (
            <Card className="rounded-2xl bg-blue-50 border border-blue-300 p-5 space-y-3 shadow-xs" data-testid="case-offer">
              <p className="text-sm font-black text-slate-900">
                {isBn ? 'প্রস্তাবিত বিকল্প শিক্ষক:' : 'Offered replacement tutor:'}{' '}
                <span className="text-blue-700 underline font-bold">{item.replacementTutor.displayName}</span>
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  disabled={isMutating}
                  onClick={() => void run(() => acceptOffer(caseId).unwrap())}
                  className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  {isBn ? 'গ্রহণ করুন' : 'Accept'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isMutating}
                  onClick={() => void run(() => declineOffer(caseId).unwrap())}
                  className="gap-1.5 text-xs font-bold border-slate-300 bg-white hover:bg-slate-100 text-slate-800"
                >
                  <X className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
                  {isBn ? 'প্রত্যাখ্যান' : 'Decline'}
                </Button>
              </div>
            </Card>
          )}

          <Card className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-700" aria-hidden="true" />
              {isBn ? 'কেস ইতিহাস' : 'Case history'}
            </h3>
            {(detail?.history ?? []).length === 0 ? (
              <p className="text-xs text-slate-500 font-medium">
                {isBn ? 'কোনো ইতিহাস নেই।' : 'No history yet.'}
              </p>
            ) : (
              <ul className="space-y-2.5" data-testid="case-history">
                {detail!.history.map((event) => (
                  <li key={event.id} className="text-xs border-l-2 border-slate-300 pl-3 space-y-0.5">
                    <p className="text-slate-900 font-bold">
                      {event.userVisibleNote ??
                        event.eventType.replace(/_/g, ' ').replace(/\./g, ' ')}
                    </p>
                    <p className="text-slate-600 font-medium">
                      {event.toStatus ? `${event.toStatus.replace(/_/g, ' ')} · ` : ''}
                      {formatDateTime(event.createdAt, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {['requested', 'under_review'].includes(item.status) && (
            <Button
              variant="outline"
              size="sm"
              disabled={isMutating}
              onClick={() => void run(() => cancelCase(caseId).unwrap())}
              className="gap-1 text-xs text-muted-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              {isBn ? 'অনুরোধ প্রত্যাহার' : 'Withdraw request'}
            </Button>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
