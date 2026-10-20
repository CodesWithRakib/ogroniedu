'use client';

import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Alert,
  AlertDescription,
  LoadingSpinner,
  EmptyState,
  NativeSelect,
  Textarea,
} from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { normalizeUnknownError } from '@/lib/api-error';
import { useAppSelector } from '@/store';
import { LearningManagementView } from '../components/learningManagementView';
import { StudentProgressPanel } from '../components/studentProgressPanel';
import { ChildScopeSelect } from '@/features/guardian/components/ChildScopeSelect';
import { useChildScope } from '@/features/guardian/hooks/use-child-scope';
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

  const scope = useChildScope();
  const records = useLearningRecords(locale, scope.selectedStudentId);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [assignmentTitle, setAssignmentTitle] = React.useState('');
  const [assignmentMax, setAssignmentMax] = React.useState('100');
  const [assignmentDue, setAssignmentDue] = React.useState('');
  const [assignmentInstructions, setAssignmentInstructions] = React.useState('');
  const [publishNow, setPublishNow] = React.useState('true');

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!records.activeBookingId || !assignmentTitle.trim()) return;
    setFormError(null);
    try {
      await records.createAssignment({
        title: assignmentTitle.trim(),
        instructions: assignmentInstructions.trim() || undefined,
        dueAt: assignmentDue ? new Date(assignmentDue).toISOString() : undefined,
        maxScore: Number(assignmentMax) || 100,
        publishNow: publishNow === 'true',
      });
      setAssignmentTitle('');
      setAssignmentInstructions('');
      setAssignmentDue('');
    } catch (err) {
      setFormError(normalizeUnknownError(err, locale).message);
    }
  }

  return (
    <DashboardShell locale={locale}>
      {scope.isGuardian && (
        <div className="mb-4">
          <ChildScopeSelect locale={locale} scope={scope} />
        </div>
      )}
      {records.bookingOptions.length > 0 && (
        <div
          className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border"
          data-testid="learning-booking-picker"
        >
          <div className="flex items-center gap-2">
            <Label htmlFor="learning-booking-select" className="text-xs font-bold text-foreground">
              {locale === 'bn' ? 'সক্রিয় কোর্স / বুকিং নির্বাচন:' : 'Select Tuition / Course:'}
            </Label>
            <NativeSelect
              id="learning-booking-select"
              value={records.activeBookingId}
              onChange={(e) => records.setActiveBookingId(e.target.value)}
              wrapperClassName="w-auto"
              className="h-9 min-w-[260px] text-xs font-medium"
              data-testid="learning-booking-select"
            >
              {records.bookingOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="text-xs text-muted-foreground">
            {locale === 'bn'
              ? 'ক্লাসের উপস্থিতি, হোমওয়ার্ক ও মাসিক মূল্যায়ন'
              : 'Attendance, homework submissions and progress review'}
          </div>
        </div>
      )}

      {formError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription role="alert">{formError}</AlertDescription>
        </Alert>
      )}

      {role === 'tutor' && records.activeBookingId && (
        <Card className="mb-4">
          <CardContent className="py-4">
            <form onSubmit={handleCreateAssignment} className="space-y-3" data-testid="create-assignment-form">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="assignment-title" className="text-xs font-medium">
                    {dict.learning.newHomework}
                  </Label>
                  <Input
                    id="assignment-title"
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    data-testid="assignment-title-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="assignment-due" className="text-xs font-medium">
                    {dict.learning.dueAtLabel}
                  </Label>
                  <Input
                    id="assignment-due"
                    type="datetime-local"
                    value={assignmentDue}
                    onChange={(e) => setAssignmentDue(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="assignment-max" className="text-xs font-medium">
                    {dict.learning.maxScoreLabel}
                  </Label>
                  <Input
                    id="assignment-max"
                    type="number"
                    min={1}
                    value={assignmentMax}
                    onChange={(e) => setAssignmentMax(e.target.value)}
                    data-testid="assignment-max-input"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="assignment-instructions" className="text-xs font-medium">
                  {dict.learning.instructionsLabel}
                </Label>
                <Textarea
                  id="assignment-instructions"
                  rows={3}
                  value={assignmentInstructions}
                  onChange={(e) => setAssignmentInstructions(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-44 space-y-1">
                  <Label htmlFor="assignment-publication" className="text-xs font-medium">
                    {dict.learning.statusPublished} / {dict.learning.statusDraft}
                  </Label>
                  <NativeSelect
                    id="assignment-publication"
                    value={publishNow}
                    onChange={(e) => setPublishNow(e.target.value)}
                    className="h-9 text-xs"
                  >
                    <option value="true">{dict.learning.publishAction}</option>
                    <option value="false">{dict.learning.saveAsDraft}</option>
                  </NativeSelect>
                </div>
                <Button type="submit" size="sm" isLoading={records.creating} data-testid="create-assignment-btn">
                  {dict.learning.createAssignment}
                </Button>
              </div>
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
          <CardContent className="py-8 text-center text-sm text-destructive">
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
        <div className="space-y-4">
          {records.activeBookingStudentId && (
            <StudentProgressPanel
              locale={locale}
              studentId={records.activeBookingStudentId}
              bookingId={records.activeBookingId}
              canManageGoals={role === 'tutor'}
            />
          )}
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
        </div>
      )}
      {records.generating && <LoadingSpinner />}
    </DashboardShell>
  );
}
