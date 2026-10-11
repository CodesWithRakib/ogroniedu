'use client';

import React, { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { LearningManagementView } from '@/components/learning/LearningManagementView';
import { Button, Card, CardContent, Input, LoadingSpinner } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import { useAppSelector } from '@/store';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';
import {
  useGetBookingLearningRecordsQuery,
  useCreateAssignmentMutation,
  useSubmitAssignmentMutation,
  useGradeSubmissionMutation,
  useGenerateProgressReportMutation,
} from '@/store/services/learning-api';

function LearningContent({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const user = useAppSelector((s) => s.auth.user);
  const role = user?.roles?.includes('tutor') ? 'tutor' : user?.roles?.includes('guardian') ? 'guardian' : 'student';
  const requests = useGetBookingRequestsQuery();
  const bookingIds = (requests.data?.data ?? []).map((r) => r.id);
  const [activeBookingId, setActiveBookingId] = React.useState<string>('');
  React.useEffect(() => {
    if (!activeBookingId && bookingIds[0]) setActiveBookingId(bookingIds[0]);
  }, [bookingIds, activeBookingId]);
  const records = useGetBookingLearningRecordsQuery(activeBookingId, { skip: !activeBookingId });
  const [createAssignment, { isLoading: creating }] = useCreateAssignmentMutation();
  const [submitAssignment] = useSubmitAssignmentMutation();
  const [gradeSubmission] = useGradeSubmissionMutation();
  const [generateReport, { isLoading: generating }] = useGenerateProgressReportMutation();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [assignmentTitle, setAssignmentTitle] = React.useState('');
  const [assignmentMax, setAssignmentMax] = React.useState('100');

  const attendance = (records.data?.data?.attendance ?? []) as never[];
  const assignments = (records.data?.data?.assignments ?? []) as never[];
  const reports = (records.data?.data?.reports ?? []) as never[];

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBookingId || !assignmentTitle.trim()) return;
    setFormError(null);
    try {
      await createAssignment({
        bookingId: activeBookingId,
        title: assignmentTitle.trim(),
        maxScore: Number(assignmentMax) || 100,
      }).unwrap();
      setAssignmentTitle('');
      records.refetch();
    } catch (err) {
      setFormError(normalizeApiError(err as never, locale).message);
    }
  }

  return (
    <DashboardShell locale={locale} title={dict.learning.title} subtitle={dict.learning.subtitle}>
      <div className="mb-4 flex flex-wrap items-center gap-2" data-testid="learning-booking-picker">
        <label htmlFor="learning-booking-select" className="text-sm font-medium">
          {locale === 'bn' ? 'বুকিং' : 'Booking'}
        </label>
        <select
          id="learning-booking-select"
          value={activeBookingId}
          onChange={(e) => setActiveBookingId(e.target.value)}
          className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          data-testid="learning-booking-select"
        >
          {bookingIds.map((id) => (
            <option key={id} value={id}>{id.slice(0, 8)}…</option>
          ))}
        </select>
      </div>

      {formError && (
        <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</div>
      )}

      {(role === 'tutor') && activeBookingId && (
        <Card className="mb-4">
          <CardContent className="py-4">
            <form onSubmit={handleCreateAssignment} className="flex flex-col gap-2 sm:flex-row sm:items-end" data-testid="create-assignment-form">
              <div className="flex-1 space-y-1">
                <label htmlFor="assignment-title" className="text-xs font-medium">{dict.learning.createAssignment}</label>
                <Input id="assignment-title" value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} data-testid="assignment-title-input" />
              </div>
              <div className="w-28 space-y-1">
                <label htmlFor="assignment-max" className="text-xs font-medium">{dict.learning.maxScoreLabel}</label>
                <Input id="assignment-max" type="number" min={1} value={assignmentMax} onChange={(e) => setAssignmentMax(e.target.value)} data-testid="assignment-max-input" />
              </div>
              <Button type="submit" size="sm" isLoading={creating} data-testid="create-assignment-btn">{dict.learning.createAssignment}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {records.isLoading || requests.isLoading ? (
        <LoadingSpinner />
      ) : records.isError ? (
        <Card><CardContent className="py-8 text-center text-sm text-rose-600">
          {normalizeApiError(records.error, locale).message}
        </CardContent></Card>
      ) : (
        <LearningManagementView
          locale={locale}
          userRole={role}
          initialAttendance={attendance as never}
          initialAssignments={assignments as never}
          initialReports={reports as never}
          onSubmitAssignment={async (assignmentId, data) => {
            try {
              await submitAssignment({ assignmentId, submissionText: data.submissionText }).unwrap();
              records.refetch();
            } catch (err) {
              throw new Error(normalizeApiError(err as never, locale).message);
            }
          }}
          onGradeSubmission={async (submissionId, data) => {
            try {
              await gradeSubmission({ submissionId, ...data }).unwrap();
              records.refetch();
            } catch (err) {
              throw new Error(normalizeApiError(err as never, locale).message);
            }
          }}
          onGenerateReport={async (data) => {
            try {
              await generateReport(data).unwrap();
              records.refetch();
            } catch (err) {
              throw new Error(normalizeApiError(err as never, locale).message);
            }
          }}
        />
      )}
      {generating && <LoadingSpinner />}
    </DashboardShell>
  );
}

export default function LearningPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <RequireAuth locale={locale}>
      <div className="py-6">
        <LearningContent locale={locale} />
      </div>
    </RequireAuth>
  );
}
