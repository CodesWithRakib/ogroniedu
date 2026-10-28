'use client';

import React from 'react';
import { AlertCircle, Target, TrendingUp } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  LoadingSpinner,
  NativeSelect,
  Progress,
} from '@/components/ui';
import { formatLocalizedNumber, getDictionary, type Locale } from '@/lib/i18n';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
import {
  type LearningGoalStatus,
  useCreateLearningGoalMutation,
  useGetStudentProgressQuery,
  useListLearningGoalsQuery,
  useUpdateLearningGoalMutation,
} from '@/store/services/learning-api';

const GOAL_STATUSES: LearningGoalStatus[] = [
  'open',
  'in_progress',
  'achieved',
  'not_achieved',
  'cancelled',
];

type LearningCopy = ReturnType<typeof getDictionary>['learning'];

function goalStatusLabel(t: LearningCopy, status: LearningGoalStatus): string {
  const labels: Record<LearningGoalStatus, string> = {
    open: t.goalStatusOpen,
    in_progress: t.goalStatusInProgress,
    achieved: t.goalStatusAchieved,
    not_achieved: t.goalStatusNotAchieved,
    cancelled: t.goalStatusCancelled,
  };
  return labels[status];
}

/** Evidence-based progress. Null metrics render as "not enough data", never 0%/100%. */
export function StudentProgressPanel({
  locale,
  studentId,
  bookingId,
  canManageGoals = false,
}: {
  locale: Locale;
  studentId: string;
  bookingId?: string;
  canManageGoals?: boolean;
}) {
  const t = getDictionary(locale).learning;
  const progress = useGetStudentProgressQuery({ studentId, bookingId });
  const goals = useListLearningGoalsQuery({ studentId });
  const [createGoal, { isLoading: creating }] = useCreateLearningGoalMutation();
  const [updateGoal, { isLoading: updating }] = useUpdateLearningGoalMutation();

  const [goalTitle, setGoalTitle] = React.useState('');
  const [goalTarget, setGoalTarget] = React.useState('');
  const [evidenceDraft, setEvidenceDraft] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);

  const data = progress.data?.data;
  const summary = goals.data?.data ?? [];

  const handleCreateGoal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bookingId || goalTitle.trim().length < 3) return;
    setError(null);
    try {
      await createGoal({
        bookingId,
        title: goalTitle.trim(),
        targetDate: goalTarget || undefined,
      }).unwrap();
      setGoalTitle('');
      setGoalTarget('');
    } catch (err) {
      setError(normalizeUnknownError(err, locale).message);
    }
  };

  const handleGoalUpdate = async (goalId: string, status: LearningGoalStatus) => {
    setError(null);
    try {
      await updateGoal({ id: goalId, status, evidence: evidenceDraft[goalId] }).unwrap();
    } catch (err) {
      setError(normalizeUnknownError(err, locale).message);
    }
  };

  if (progress.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner />
      </div>
    );
  }

  if (progress.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{normalizeApiError(progress.error, locale).message}</AlertDescription>
      </Alert>
    );
  }

  const attendanceRate = data?.attendance.attendanceRate ?? null;

  return (
    <div className="flex flex-col gap-4" data-testid="student-progress-panel">
      {error && (
        <Alert variant="destructive">
          <AlertDescription role="alert">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-4 flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              {t.attendanceRate}
            </p>
            <p className="text-2xl font-black text-foreground">
              {attendanceRate === null ? '—' : `${formatLocalizedNumber(attendanceRate, locale)}%`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {attendanceRate === null
                ? t.attendanceNotEnoughData
                : `${formatLocalizedNumber(data?.attendance.recorded ?? 0, locale)} / ${formatLocalizedNumber(data?.attendance.sessionsInPeriod ?? 0, locale)}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              {t.sessionsCompleted}
            </p>
            <p className="text-2xl font-black text-foreground">
              {formatLocalizedNumber(data?.sessions.completed ?? 0, locale)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t.sessionsUpcoming}: {formatLocalizedNumber(data?.sessions.upcoming ?? 0, locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              {t.assignmentCompletion}
            </p>
            <p className="text-2xl font-black text-foreground">
              {data?.assignments.completionRate === null ||
              data?.assignments.completionRate === undefined
                ? '—'
                : `${formatLocalizedNumber(data.assignments.completionRate, locale)}%`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatLocalizedNumber(data?.assignments.submitted ?? 0, locale)} /{' '}
              {formatLocalizedNumber(data?.assignments.published ?? 0, locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              {t.averageScore}
            </p>
            <p className="text-2xl font-black text-foreground">
              {data?.assignments.averageScore === null ||
              data?.assignments.averageScore === undefined
                ? '—'
                : `${formatLocalizedNumber(data.assignments.averageScore, locale)}%`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatLocalizedNumber(data?.assignments.reviewed ?? 0, locale)} {t.statusReviewed}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t.progressTrend}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(data?.attendanceTrend ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">{t.attendanceNotEnoughData}</p>
            ) : (
              data!.attendanceTrend.map((month) => (
                <div key={month.month} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-foreground">{month.month}</span>
                    <span className="text-muted-foreground">
                      {month.attendanceRate === null
                        ? '—'
                        : `${formatLocalizedNumber(month.attendanceRate, locale)}%`}
                    </span>
                  </div>
                  <Progress value={month.attendanceRate ?? 0} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              {t.recentFeedback}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(data?.recentFeedback ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">{t.noFeedback}</p>
            ) : (
              data!.recentFeedback.map((feedback) => (
                <div key={feedback.submissionId} className="text-xs flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      {feedback.assignmentTitle}
                    </span>
                    <Badge variant="outline">
                      {feedback.score === null
                        ? '—'
                        : `${formatLocalizedNumber(feedback.score, locale)}/${formatLocalizedNumber(feedback.maxScore ?? 0, locale)}`}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-line">{feedback.feedback}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            {t.learningGoals}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {summary.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t.goalsEmpty}</p>
          ) : (
            summary.map((goal) => (
              <div
                key={goal.id}
                className="rounded-xl border border-border p-3 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{goal.title}</p>
                    {goal.targetDate && (
                      <p className="text-[11px] text-muted-foreground">{goal.targetDate}</p>
                    )}
                  </div>
                  {canManageGoals ? (
                    <NativeSelect
                      aria-label={t.goalStatusLabel}
                      value={goal.status}
                      onChange={(event) =>
                        void handleGoalUpdate(goal.id, event.target.value as LearningGoalStatus)
                      }
                      className="h-8 w-auto text-xs"
                      wrapperClassName="w-auto"
                      disabled={updating}
                    >
                      {GOAL_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {goalStatusLabel(t, status)}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    <Badge variant="outline">{goalStatusLabel(t, goal.status)}</Badge>
                  )}
                </div>
                {goal.evidence && (
                  <p className="text-[11px] text-muted-foreground whitespace-pre-line">
                    {goal.evidence}
                  </p>
                )}
                {canManageGoals && (
                  <Input
                    value={evidenceDraft[goal.id] ?? ''}
                    onChange={(event) =>
                      setEvidenceDraft((prev) => ({ ...prev, [goal.id]: event.target.value }))
                    }
                    placeholder={t.goalEvidence}
                    className="h-8 text-xs"
                  />
                )}
              </div>
            ))
          )}

          {canManageGoals && bookingId && (
            <form
              onSubmit={handleCreateGoal}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2"
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor="goal-title" className="text-[11px]">
                  {t.goalTitleLabel}
                </Label>
                <Input
                  id="goal-title"
                  value={goalTitle}
                  onChange={(event) => setGoalTitle(event.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="goal-target" className="text-[11px]">
                  {t.goalTargetDate}
                </Label>
                <Input
                  id="goal-target"
                  type="date"
                  value={goalTarget}
                  onChange={(event) => setGoalTarget(event.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  size="sm"
                  isLoading={creating}
                  disabled={goalTitle.trim().length < 3}
                >
                  {t.createGoal}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
