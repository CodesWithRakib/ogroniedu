'use client';

import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Button, Card, CardContent, Input, LoadingSpinner, EmptyState } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { normalizeUnknownError } from '@/lib/api-error';
import { useAppSelector } from '@/store';
import { LearningManagementView } from '../components/learningManagementView';
import { useLearningRecords } from '../hooks/use-learning-records';
import type { LearningRole } from '../types/learning.types';

/** Learning management container: booking picker + tutor create form + records view. */
export function LearningPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const user = useAppSelector((s) => s.auth.user);
  const role: LearningRole = user?.roles?.includes('tutor')
    ? 'tutor'
    : user?.roles?.includes('guardian')
      ? 'guardian'
      : 'student';

  const records = useLearningRecords(locale);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [assignmentTitle, setAssignmentTitle] = React.useState('');
  const [assignmentMax, setAssignmentMax] = React.useState('100');

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!records.activeBookingId || !assignmentTitle.trim()) return;
    setFormError(null);
    try {
      await records.createAssignment({
        title: assignmentTitle.trim(),
        maxScore: Number(assignmentMax) || 100,
      });
      setAssignmentTitle('');
    } catch (err) {
      setFormError(normalizeUnknownError(err, locale).message);
    }
  }

  return (
    <DashboardShell locale={locale} title={dict.learning.title} subtitle={dict.learning.subtitle}>
      {records.bookingOptions.length > 0 && (
        <div
          className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
          data-testid="learning-booking-picker"
        >
          <div className="flex items-center gap-2">
            <label
              htmlFor="learning-booking-select"
              className="text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              {locale === 'bn' ? 'সক্রিয় কোর্স / বুকিং নির্বাচন:' : 'Select Tuition / Course:'}
            </label>
            <select
              id="learning-booking-select"
              value={records.activeBookingId}
              onChange={(e) => records.setActiveBookingId(e.target.value)}
              className="h-9 min-w-[260px] rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              data-testid="learning-booking-select"
            >
              {records.bookingOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-slate-500">
            {locale === 'bn'
              ? 'ক্লাসের উপস্থিতি, হোমওয়ার্ক ও মাসিক মূল্যায়ন'
              : 'Attendance, homework submissions and progress review'}
          </div>
        </div>
      )}

      {formError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          {formError}
        </div>
      )}

      {role === 'tutor' && records.activeBookingId && (
        <Card className="mb-4">
          <CardContent className="py-4">
            <form
              onSubmit={handleCreateAssignment}
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              data-testid="create-assignment-form"
            >
              <div className="flex-1 space-y-1">
                <label htmlFor="assignment-title" className="text-xs font-medium">
                  {dict.learning.createAssignment}
                </label>
                <Input
                  id="assignment-title"
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  data-testid="assignment-title-input"
                />
              </div>
              <div className="w-28 space-y-1">
                <label htmlFor="assignment-max" className="text-xs font-medium">
                  {dict.learning.maxScoreLabel}
                </label>
                <Input
                  id="assignment-max"
                  type="number"
                  min={1}
                  value={assignmentMax}
                  onChange={(e) => setAssignmentMax(e.target.value)}
                  data-testid="assignment-max-input"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                isLoading={records.creating}
                data-testid="create-assignment-btn"
              >
                {dict.learning.createAssignment}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {records.isLoading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : records.queryError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-rose-600">
            {records.queryError}
          </CardContent>
        </Card>
      ) : records.bookingOptions.length === 0 ? (
        <EmptyState
          title={
            locale === 'bn'
              ? 'কোনো সক্রিয় কোর্স বা টিউটরিং বুকিং নেই'
              : 'No Active Tuition Bookings'
          }
          description={
            locale === 'bn'
              ? 'শিক্ষকের সাথে ক্লাস শুরু হলে এখানে ক্লাসের উপস্থিতি, বাড়ির কাজ ও প্রগ্রেস রিপোর্ট দেখতে পাবেন।'
              : 'Once you book a tutor and start sessions, your attendance, homework and progress reports will appear here.'
          }
          actionLabel={
            role === 'tutor' ? undefined : locale === 'bn' ? 'টিউটর খুঁজুন' : 'Find a Tutor'
          }
          actionHref={role === 'tutor' ? undefined : withLocale('/tutors', locale)}
        />
      ) : (
        <LearningManagementView
          locale={locale}
          userRole={role}
          initialAttendance={records.attendance}
          initialAssignments={records.assignments}
          initialReports={records.reports}
          onMarkAttendance={(data) =>
            records.markAttendance(
              data.sessionId,
              data.participantUserId,
              data.attendanceStatus,
              data.notes,
            )
          }
          onSubmitAssignment={records.submitAssignment}
          onGradeSubmission={records.gradeSubmission}
          onGenerateReport={records.generateReport}
        />
      )}
      {records.generating && <LoadingSpinner />}
    </DashboardShell>
  );
}
