'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarClock, History, UserSearch } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Alert,
  AlertDescription,
  Textarea,
  Label,
  NativeSelect,
  Input,
} from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import {
  useGetReplacementCaseByIdQuery,
  useGetReplacementCandidatesQuery,
  useUpdateReplacementCaseMutation,
  useExtendReplacementDeadlineMutation,
  type ReplacementStatus,
} from '@/store/services/trust-api';

const STAFF_TARGETS: ReplacementStatus[] = [
  'under_review',
  'matching',
  'offered',
  'rejected',
  'refund_eligible',
  'closed',
  'cancelled',
];

export interface AdminReplacementDetailPageProps {
  locale: Locale;
  caseId: string;
}

export function AdminReplacementDetailPageView({
  locale,
  caseId,
}: AdminReplacementDetailPageProps) {
  const isBn = locale === 'bn';

  const { data, isLoading, isError, refetch } = useGetReplacementCaseByIdQuery(caseId);
  const candidatesQuery = useGetReplacementCandidatesQuery(caseId, {
    skip: !data?.data?.case,
  });
  const [updateCase, updateState] = useUpdateReplacementCaseMutation();
  const [extendDeadline, extendState] = useExtendReplacementDeadlineMutation();

  const detail = data?.data;
  const item = detail?.case;

  const [targetStatus, setTargetStatus] = React.useState<ReplacementStatus | ''>('');
  const [replacementTutorUserId, setReplacementTutorUserId] = React.useState('');
  const [userVisibleNote, setUserVisibleNote] = React.useState('');
  const [internalNote, setInternalNote] = React.useState('');
  const [refundEligibility, setRefundEligibility] = React.useState<
    'not_determined' | 'eligible' | 'not_eligible'
  >('not_determined');
  const [extensionHours, setExtensionHours] = React.useState('12');
  const [extensionReason, setExtensionReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const candidates = candidatesQuery.data?.data ?? [];
  const busy = updateState.isLoading || extendState.isLoading;

  const submitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!targetStatus) {
      setError(isBn ? 'একটি টার্গেট স্ট্যাটাস নির্বাচন করুন।' : 'Select a target status.');
      return;
    }
    try {
      await updateCase({
        id: caseId,
        body: {
          status: targetStatus,
          replacementTutorUserId: replacementTutorUserId || undefined,
          userVisibleNote: userVisibleNote || undefined,
          internalNote: internalNote || undefined,
          refundEligibility,
          expectedVersion: item?.version,
        },
      }).unwrap();
      setNotice(isBn ? 'কেস আপডেট হয়েছে।' : 'Case updated.');
      setUserVisibleNote('');
      setInternalNote('');
      setTargetStatus('');
      refetch();
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'data' in err
          ? ((err as { data?: { error?: { message?: string } } }).data?.error?.message ??
            (isBn ? 'আপডেট ব্যর্থ হয়েছে।' : 'The update failed.'))
          : isBn
            ? 'আপডেট ব্যর্থ হয়েছে।'
            : 'The update failed.';
      setError(message);
    }
  };

  const submitExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await extendDeadline({
        caseId,
        hours: Number(extensionHours),
        reason: extensionReason,
      }).unwrap();
      setNotice(isBn ? 'সময়সীমা বাড়ানো হয়েছে।' : 'Deadline extended.');
      setExtensionReason('');
      refetch();
    } catch {
      setError(isBn ? 'সময়সীমা বাড়ানো যায়নি।' : 'Could not extend the deadline.');
    }
  };

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'কেস পর্যালোচনা' : 'Review replacement case'}
      subtitle={caseId ? `#${caseId.slice(0, 8)}` : undefined}
      actions={
        <Link
          href={withLocale('/dashboard/admin/replacements', locale)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          {isBn ? 'কিউ' : 'Queue'}
        </Link>
      }
    >
      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {isBn ? 'লোড হচ্ছে...' : 'Loading case...'}
        </p>
      ) : isError || !item ? (
        <Card className="py-16 text-center rounded-2xl">
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {isBn ? 'কেসটি পাওয়া যায়নি।' : 'The case was not found.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-5">
            {error && (
              <Alert variant="destructive" className="rounded-2xl">
                <AlertDescription role="alert">{error}</AlertDescription>
              </Alert>
            )}
            {notice && (
              <Alert className="rounded-2xl">
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}

            <Card className="rounded-2xl bg-card p-5 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {item.reasonCode.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="primary" className="capitalize">
                  {item.status.replace(/_/g, ' ')}
                </Badge>
                {item.isOverdue && (
                  <Badge variant="destructive">{isBn ? 'ওভারডিউ' : 'Overdue'}</Badge>
                )}
                <span className="text-xs text-muted-foreground">v{item.version}</span>
              </div>
              <p className="text-sm text-foreground rounded-xl border border-border p-3">
                {item.explanation}
              </p>
              <div className="text-xs text-muted-foreground flex flex-col gap-1">
                <p>
                  {isBn ? 'বুকিং:' : 'Booking:'} {item.bookingId} · {item.booking?.status ?? '—'}
                </p>
                <p>
                  {isBn ? 'দায়ের:' : 'Filed:'} {formatDateTime(item.createdAt, locale)}
                </p>
                {item.deadlineAt && (
                  <p>
                    {isBn ? 'সময়সীমা:' : 'Deadline:'} {formatDateTime(item.deadlineAt, locale)}
                  </p>
                )}
                {item.outcomeNotes && (
                  <p className="text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 font-medium">
                    {isBn ? 'অভ্যন্তরীণ নোট: ' : 'Internal notes: '}
                    {item.outcomeNotes}
                  </p>
                )}
              </div>
            </Card>

            <Card className="rounded-2xl bg-card p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-primary" aria-hidden="true" />
                {isBn ? 'ইতিহাস' : 'History'}
              </h3>
              <ul className="flex flex-col gap-2" data-testid="admin-case-history">
                {(detail?.history ?? []).map((event) => (
                  <li key={event.id} className="text-xs border-l-2 border-border pl-3 flex flex-col gap-0.5">
                    <p className="text-foreground">
                      {event.eventType} {event.toStatus ? `→ ${event.toStatus}` : ''}
                    </p>
                    {event.userVisibleNote && (
                      <p className="text-muted-foreground">{event.userVisibleNote}</p>
                    )}
                    {event.internalNote && (
                      <p className="text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-1.5 font-medium">
                        {isBn ? 'অভ্যন্তরীণ: ' : 'Internal: '}
                        {event.internalNote}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {event.actorRole} · {formatDateTime(event.createdAt, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="rounded-2xl bg-card p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <UserSearch className="w-4 h-4 text-primary" aria-hidden="true" />
                {isBn ? 'বিকল্প শিক্ষক প্রার্থী' : 'Replacement candidates'}
              </h3>
              {candidatesQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">
                  {isBn ? 'লোড হচ্ছে...' : 'Loading...'}
                </p>
              ) : candidates.length === 0 ? (
                <p className="text-xs text-muted-foreground" data-testid="no-candidates">
                  {isBn
                    ? 'যোগ্য প্রার্থী পাওয়া যায়নি — কেসটি ম্যানুয়াল পর্যালোচনায় রাখুন।'
                    : 'No eligible candidate found — keep the case in manual review.'}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {candidates.map((candidate) => (
                    <li
                      key={candidate.id}
                      className="flex items-center justify-between gap-2 text-xs border border-border rounded-xl p-2"
                    >
                      <span className="font-semibold text-foreground">{candidate.displayName}</span>
                      <span className="text-muted-foreground">
                        {candidate.subjects[0]?.subjectNameEn ?? ''}
                      </span>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setTargetStatus('offered');
                          setReplacementTutorUserId(candidate.id);
                        }}
                      >
                        {isBn ? 'নির্বাচন' : 'Select'}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-5">
            <Card className="rounded-2xl bg-card p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-foreground">
                {isBn ? 'সিদ্ধান্ত ও নোট' : 'Decision & notes'}
              </h3>
              <form onSubmit={submitUpdate} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="target-status" className="text-xs font-semibold">
                    {isBn ? 'নতুন স্ট্যাটাস' : 'Target status'}
                  </Label>
                  <NativeSelect
                    id="target-status"
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as ReplacementStatus)}
                    className="text-xs"
                  >
                    <option value="">—</option>
                    {STAFF_TARGETS.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                {targetStatus === 'offered' && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="replacement-tutor" className="text-xs font-semibold">
                      {isBn ? 'বিকল্প শিক্ষক (UUID)' : 'Replacement tutor (UUID)'}
                    </Label>
                    <Input
                      id="replacement-tutor"
                      value={replacementTutorUserId}
                      onChange={(e) => setReplacementTutorUserId(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="refund-eligibility" className="text-xs font-semibold">
                    {isBn ? 'রিফান্ড যোগ্যতা (রেকর্ড)' : 'Refund eligibility (record only)'}
                  </Label>
                  <NativeSelect
                    id="refund-eligibility"
                    value={refundEligibility}
                    onChange={(e) =>
                      setRefundEligibility(
                        e.target.value as 'not_determined' | 'eligible' | 'not_eligible',
                      )
                    }
                    className="text-xs"
                  >
                    <option value="not_determined">not determined</option>
                    <option value="eligible">eligible</option>
                    <option value="not_eligible">not eligible</option>
                  </NativeSelect>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="user-visible-note" className="text-xs font-semibold">
                    {isBn ? 'ব্যবহারকারীর জন্য নোট' : 'Applicant-facing note'}
                  </Label>
                  <Textarea
                    id="user-visible-note"
                    value={userVisibleNote}
                    onChange={(e) => setUserVisibleNote(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="internal-note" className="text-xs font-semibold">
                    {isBn
                      ? 'অভ্যন্তরীণ নোট (ব্যবহারকারী দেখবে না)'
                      : 'Internal note (hidden from applicant)'}
                  </Label>
                  <Textarea
                    id="internal-note"
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={busy}
                  className="w-full"
                  data-testid="submit-case-update"
                >
                  {busy
                    ? isBn
                      ? 'সংরক্ষণ...'
                      : 'Saving...'
                    : isBn
                      ? 'সংরক্ষণ করুন'
                      : 'Save decision'}
                </Button>
              </form>
            </Card>

            <Card className="rounded-2xl bg-card p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-primary" aria-hidden="true" />
                {isBn ? 'সময়সীমা বাড়ান' : 'Extend deadline'}
              </h3>
              <form onSubmit={submitExtension} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="extension-hours" className="text-xs font-semibold">
                    {isBn ? 'ঘণ্টা (১-৭২)' : 'Hours (1-72)'}
                  </Label>
                  <Input
                    id="extension-hours"
                    type="number"
                    min={1}
                    max={72}
                    value={extensionHours}
                    onChange={(e) => setExtensionHours(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="extension-reason" className="text-xs font-semibold">
                    {isBn ? 'কারণ (আবশ্যক)' : 'Reason (required)'}
                  </Label>
                  <Textarea
                    id="extension-reason"
                    value={extensionReason}
                    onChange={(e) => setExtensionReason(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={busy || extensionReason.trim().length === 0}
                  className="w-full"
                >
                  {isBn ? 'সময়সীমা বাড়ান' : 'Extend'}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
