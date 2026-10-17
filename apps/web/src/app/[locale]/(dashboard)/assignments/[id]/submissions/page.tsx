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
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center text-rose-300">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-rose-400" />
          <h2 className="text-lg font-bold mb-1">
            {locale === 'bn' ? 'বাড়ির কাজ পাওয়া যায়নি' : 'Assignment Not Found'}
          </h2>
          <Link
            href={withLocale('/learning', locale)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl mt-4"
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          data-testid="back-to-assignment-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          {locale === 'bn' ? 'অ্যাসাইনমেন্টের মূল পাতা' : 'Assignment Overview'}
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0a1c22] to-[#041318] border border-cyan-500/20 p-8 text-white shadow-2xl space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
          <BookOpen className="w-4 h-4" />
          <span>{locale === 'bn' ? 'জমা দেওয়া খাতা মূল্যায়ন' : 'Submission Evaluation'}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">{assignment.title}</h1>
        <p className="text-xs text-slate-300">
          {locale === 'bn' ? 'সর্বোচ্চ স্কোর:' : 'Max Score:'}{' '}
          <strong className="text-emerald-400 font-bold">
            {formatLocalizedNumber(assignment.maxScore, locale)}
          </strong>
        </p>
      </div>

      {!submission ? (
        <Card className="bg-slate-900/80 border border-slate-800 p-8 text-center text-slate-400 rounded-3xl">
          <Clock className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="text-sm">
            {locale === 'bn'
              ? 'শিক্ষার্থী এখনো এই কাজের কোনো সমাধান জমা দেয়নি।'
              : 'The student has not submitted any work for this assignment yet.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Submission Work */}
          <Card className="bg-slate-900/90 border border-slate-800 text-slate-100 rounded-3xl p-6 shadow-xl space-y-4">
            <CardHeader className="p-0 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>{locale === 'bn' ? 'শিক্ষার্থীর সমাধান' : 'Submitted Solution'}</span>
                </CardTitle>
                <Badge
                  className={
                    submission.status === 'reviewed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : submission.status === 'late'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }
                >
                  {submission.status.toUpperCase()}
                </Badge>
              </div>
              <CardDescription className="text-[11px] text-slate-400">
                {submission.submittedAt
                  ? new Date(submission.submittedAt).toLocaleString(dateLocale)
                  : 'N/A'}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed min-h-[160px]">
                {submission.submissionText ||
                  (locale === 'bn' ? 'কোনো লিখিত বিবরণ নেই।' : 'No written text provided.')}
              </div>
            </CardContent>
          </Card>

          {/* Grading Form */}
          <Card className="bg-slate-900/90 border border-slate-800 text-slate-100 rounded-3xl p-6 shadow-xl space-y-4">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>{locale === 'bn' ? 'নম্বর ও শিক্ষক মতামত' : 'Grade & Feedback'}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
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
                    <label
                      htmlFor="submission-score"
                      className="text-xs font-semibold text-slate-300"
                    >
                      {locale === 'bn' ? 'প্রাপ্ত স্কোর (সর্বোচ্চ ' : 'Score (Max '}
                      {formatLocalizedNumber(assignment.maxScore, locale)}):
                    </label>
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

                  <div className="space-y-1">
                    <label
                      htmlFor="submission-feedback"
                      className="text-xs font-semibold text-slate-300"
                    >
                      {locale === 'bn' ? 'পরামর্শ ও মন্তব্য:' : 'Feedback & Remarks:'}
                    </label>
                    <textarea
                      id="submission-feedback"
                      rows={3}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder={
                        locale === 'bn'
                          ? 'শিক্ষার্থীর উন্নতির জন্য গঠনমূলক মতামত দিন...'
                          : 'Write encouraging feedback...'
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      data-testid="submissions-feedback-input"
                    />
                  </div>

                  {hasScore && (
                    <div className="space-y-1">
                      <label
                        htmlFor="submission-revision"
                        className="text-xs font-semibold text-amber-300"
                      >
                        {locale === 'bn'
                          ? 'স্কোর পরিবর্তনের কারণ (বাধ্যতামূলক):'
                          : 'Revision Reason (Required):'}
                      </label>
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
                    <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">
                      {gradeError}
                    </div>
                  )}
                  {gradeSuccess && (
                    <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {locale === 'bn'
                          ? 'মূল্যায়ন সফলভাবে সংরক্ষিত হয়েছে!'
                          : 'Evaluation saved successfully!'}
                      </span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isGrading}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl"
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
                <div className="p-4 bg-slate-800/40 rounded-xl text-center text-xs text-slate-400">
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
