'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Award,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Input,
  LoadingSpinner,
  Textarea,
  Label,
  Alert,
  AlertDescription,
} from '@/components/ui';
import {
  useGetAssignmentByIdQuery,
  useGradeSubmissionMutation,
  type AssignmentRecord,
} from '@/store/services/learning-api';
import { useAppSelector } from '@/store';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { parseItem } from '@/lib/api/parse';
import { withLocale } from '@/lib/auth';

interface AssignmentSubmissionsParams {
  locale: string;
  id: string;
}

export default function AssignmentSubmissionsRoute({
  params,
}: {
  params: Promise<AssignmentSubmissionsParams>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const assignmentId = resolved.id;

  return (
    <RequireAuth locale={locale}>
      <AssignmentSubmissionsPage locale={locale} assignmentId={assignmentId} />
    </RequireAuth>
  );
}

function AssignmentSubmissionsPage({
  locale,
  assignmentId,
}: {
  locale: Locale;
  assignmentId: string;
}) {
  const currentUser = useAppSelector((s) => s.auth.user);
  const isTutor = currentUser?.roles?.includes('tutor') || currentUser?.roles?.includes('admin');

  const {
    data: assignmentData,
    isLoading,
    error,
    refetch,
  } = useGetAssignmentByIdQuery(assignmentId);

  const [gradeSubmission, { isLoading: isGrading }] = useGradeSubmissionMutation();

  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [gradeSuccess, setGradeSuccess] = useState(false);

  const assignment = React.useMemo<AssignmentRecord | null>(() => {
    if (!assignmentData) return null;
    try {
      return parseItem<AssignmentRecord>(assignmentData);
    } catch {
      return null;
    }
  }, [assignmentData]);

  const submission = assignment?.submission;

  React.useEffect(() => {
    if (submission?.score !== null && submission?.score !== undefined) {
      setScore(submission.score);
      setFeedback(submission.tutorFeedback ?? '');
    }
  }, [submission]);

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission?.id || !assignment) return;
    setGradeError(null);
    setGradeSuccess(false);

    const prevScore = submission.score;
    const isRevision = prevScore !== null && prevScore !== undefined && prevScore !== score;

    if (isRevision && !revisionReason.trim()) {
      setGradeError(
        locale === 'bn'
          ? 'স্কোর পরিবর্তনের সুনির্দিষ্ট কারণ আবশ্যক।'
          : 'A revision reason is required when modifying an existing score.',
      );
      return;
    }

    try {
      await gradeSubmission({
        submissionId: submission.id,
        score: Number(score),
        tutorFeedback: feedback.trim() || undefined,
        revisionReason: isRevision ? revisionReason.trim() : undefined,
      }).unwrap();
      setGradeSuccess(true);
      refetch();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? ((err as { data?: { message?: string } }).data?.message ?? 'Failed to grade')
          : 'Failed to record score';
      setGradeError(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive-soft-foreground">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-destructive-soft-foreground" />
          <h2 className="text-lg font-bold mb-1">
            {locale === 'bn' ? 'বাড়ির কাজ পাওয়া যায়নি' : 'Assignment Not Found'}
          </h2>
          <Link
            href={withLocale('/learning', locale)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-destructive text-white text-xs font-semibold rounded-xl mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {locale === 'bn' ? 'লার্নিং পোর্টালে ফিরুন' : 'Back to Learning'}
          </Link>
        </div>
      </div>
    );
  }

  const dateLocale = locale === 'bn' ? 'bn-BD' : 'en-US';
  const hasScore = submission?.score !== null && submission?.score !== undefined;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={withLocale(`/assignments/${assignmentId}`, locale)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-to-assignment-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          {locale === 'bn' ? 'অ্যাসাইনমেন্টের মূল পাতা' : 'Assignment Overview'}
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-3xl bg-card border border-info/40 p-8 text-foreground shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-info-soft-foreground text-xs font-bold uppercase tracking-wider">
          <BookOpen className="w-4 h-4" />
          <span>{locale === 'bn' ? 'জমা দেওয়া খাতা মূল্যায়ন' : 'Submission Evaluation'}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">{assignment.title}</h1>
        <p className="text-xs text-muted-foreground">
          {locale === 'bn' ? 'সর্বোচ্চ স্কোর:' : 'Max Score:'}{' '}
          <strong className="text-success-soft-foreground font-bold">
            {formatLocalizedNumber(assignment.maxScore, locale)}
          </strong>
        </p>
      </div>

      {!submission ? (
        <Card className="bg-card border border-border p-8 text-center text-muted-foreground rounded-3xl">
          <Clock className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm">
            {locale === 'bn'
              ? 'শিক্ষার্থী এখনো এই কাজের কোনো সমাধান জমা দেয়নি।'
              : 'The student has not submitted any work for this assignment yet.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Submission Work */}
          <Card className="bg-card border border-border text-foreground rounded-3xl p-6 shadow-sm space-y-4">
            <CardHeader className="p-0 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <FileText className="w-4 h-4 text-info-soft-foreground" />
                  <span>{locale === 'bn' ? 'শিক্ষার্থীর সমাধান' : 'Submitted Solution'}</span>
                </CardTitle>
                <Badge
                  className={
                    submission.status === 'reviewed'
                      ? 'bg-primary/20 text-success-soft-foreground border border-primary/40'
                      : submission.status === 'late'
                        ? 'bg-warning/20 text-warning-soft-foreground border border-warning/40'
                        : 'bg-interactive/20 text-info-soft-foreground border border-interactive/40'
                  }
                >
                  {submission.status.toUpperCase()}
                </Badge>
              </div>
              <CardDescription className="text-[11px] text-muted-foreground">
                {submission.submittedAt
                  ? new Date(submission.submittedAt).toLocaleString(dateLocale)
                  : 'N/A'}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <div className="p-4 bg-muted rounded-2xl border border-border text-xs text-foreground whitespace-pre-wrap leading-relaxed min-h-[160px]">
                {submission.submissionText ||
                  (locale === 'bn' ? 'কোনো লিখিত বিবরণ নেই।' : 'No written text provided.')}
              </div>
            </CardContent>
          </Card>

          {/* Grading Form */}
          <Card className="bg-card border border-border text-foreground rounded-3xl p-6 shadow-sm space-y-4">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Award className="w-4 h-4 text-success-soft-foreground" />
                <span>{locale === 'bn' ? 'নম্বর ও শিক্ষক মতামত' : 'Grade & Feedback'}</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {hasScore
                  ? locale === 'bn'
                    ? 'বর্তমানে স্কোর দেওয়া আছে, প্রয়োজনে পরিবর্তন করুন।'
                    : 'Score already recorded. Update if needed.'
                  : locale === 'bn'
                    ? 'শিক্ষার্থীর খাতা দেখে স্কোর নির্ধারণ করুন।'
                    : 'Review the solution and assign score.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              {isTutor ? (
                <form
                  onSubmit={handleGrade}
                  className="space-y-3"
                  data-testid="submissions-grading-form"
                >
                  <div className="space-y-1">
                    <Label
                      htmlFor="submission-score"
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      {locale === 'bn' ? 'প্রাপ্ত স্কোর (সর্বোচ্চ ' : 'Score (Max '}
                      {formatLocalizedNumber(assignment.maxScore, locale)}):
                    </Label>
                    <Input
                      id="submission-score"
                      type="number"
                      min={0}
                      max={assignment.maxScore}
                      value={score}
                      onChange={(e) => setScore(Number(e.target.value))}
                      data-testid="submissions-score-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="submission-feedback"
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      {locale === 'bn' ? 'পরামর্শ ও মন্তব্য:' : 'Feedback & Remarks:'}
                    </Label>
                    <Textarea
                      id="submission-feedback"
                      rows={3}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder={
                        locale === 'bn'
                           ? 'শিক্ষার্থীর উন্নতির জন্য গঠনমূলক মতামত দিন...'
                           : 'Write encouraging feedback...'
                      }
                      data-testid="submissions-feedback-input"
                    />
                  </div>

                  {hasScore && (
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="submission-revision"
                        className="text-xs font-semibold text-warning-soft-foreground"
                      >
                        {locale === 'bn'
                          ? 'স্কোর পরিবর্তনের কারণ (বাধ্যতামূলক):'
                          : 'Revision Reason (Required):'}
                      </Label>
                      <Input
                        id="submission-revision"
                        value={revisionReason}
                        onChange={(e) => setRevisionReason(e.target.value)}
                        placeholder={
                          locale === 'bn'
                            ? 'স্কোর পরিবর্তনের সুনির্দিষ্ট কারণ লিখুন...'
                            : 'Audit reason for modifying score...'
                        }
                        data-testid="submissions-revision-reason-input"
                      />
                    </div>
                  )}

                  {gradeError && (
                    <Alert variant="destructive" className="py-2.5 rounded-xl">
                      <AlertDescription className="text-xs">{gradeError}</AlertDescription>
                    </Alert>
                  )}
                  {gradeSuccess && (
                    <Alert variant="success" className="py-2.5 rounded-xl">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      <AlertDescription className="text-xs">
                        {locale === 'bn'
                          ? 'মূল্যায়ন সফলভাবে সংরক্ষিত হয়েছে!'
                          : 'Evaluation saved successfully!'}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isGrading}
                    className="w-full bg-interactive hover:bg-interactive-hover text-white text-xs font-bold rounded-xl"
                    data-testid="submit-submission-grade-btn"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    {hasScore
                      ? locale === 'bn'
                        ? 'স্কোর সংশোধন সংরক্ষণ করুন'
                        : 'Save Score Revision'
                      : locale === 'bn'
                        ? 'মূল্যায়ন নিশ্চিত করুন'
                        : 'Confirm Grade'}
                  </Button>
                </form>
              ) : (
                <div className="p-4 bg-muted rounded-xl text-center text-xs text-muted-foreground">
                  {locale === 'bn'
                    ? 'শুধুমাত্র শিক্ষক ও অ্যাডমিন খাতা মূল্যায়ন করতে পারবেন।'
                    : 'Only assigned tutor or admin can evaluate submissions.'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
