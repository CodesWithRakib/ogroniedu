'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Clock,
  ArrowLeft,
  Send,
  Award,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FileText,
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
  useSubmitAssignmentMutation,
  useGradeSubmissionMutation,
  type AssignmentRecord,
} from '@/store/services/learning-api';
import { useAppSelector } from '@/store';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { parseItem } from '@/lib/api/parse';
import { withLocale } from '@/lib/auth';

interface AssignmentDetailParams {
  locale: string;
  id: string;
}

export default function AssignmentDetailRoute({
  params,
}: {
  params: Promise<AssignmentDetailParams>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const assignmentId = resolved.id;

  return (
    <RequireAuth locale={locale}>
      <AssignmentDetailPage locale={locale} assignmentId={assignmentId} />
    </RequireAuth>
  );
}

function AssignmentDetailPage({ locale, assignmentId }: { locale: Locale; assignmentId: string }) {
  const currentUser = useAppSelector((s) => s.auth.user);
  const isTutor = currentUser?.roles?.includes('tutor');
  const isStudent = currentUser?.roles?.includes('student');

  const {
    data: assignmentData,
    isLoading,
    error,
    refetch,
  } = useGetAssignmentByIdQuery(assignmentId);

  const [submitAssignment, { isLoading: isSubmitting }] = useSubmitAssignmentMutation();
  const [gradeSubmission, { isLoading: isGrading }] = useGradeSubmissionMutation();

  const [submissionText, setSubmissionText] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Tutor grading state
  const [gradingScore, setGradingScore] = useState<number>(0);
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [isEditingGrade, setIsEditingGrade] = useState(false);
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

  // Sync grading state when assignment loads
  React.useEffect(() => {
    if (assignment?.submission?.score !== null && assignment?.submission?.score !== undefined) {
      setGradingScore(assignment.submission.score);
      setGradingFeedback(assignment.submission.tutorFeedback ?? '');
    }
  }, [assignment]);

  const handleSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionText.trim()) return;
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      await submitAssignment({
        assignmentId,
        submissionText: submissionText.trim(),
      }).unwrap();
      setSubmitSuccess(true);
      setSubmissionText('');
      refetch();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? ((err as { data?: { message?: string } }).data?.message ?? 'Failed to submit')
          : 'Failed to submit assignment solution';
      setSubmitError(msg);
    }
  };

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const submissionId = assignment?.submission?.id;
    if (!submissionId) return;

    setGradeError(null);
    setGradeSuccess(false);

    const prevScore = assignment.submission?.score;
    const isRevision = prevScore !== null && prevScore !== undefined && prevScore !== gradingScore;

    if (isRevision && !revisionReason.trim()) {
      setGradeError(
        locale === 'bn'
          ? 'স্কোর সংশোধনের জন্য কারণ উল্লেখ করা বাধ্যতামূলক।'
          : 'A revision reason is strictly required when updating an already graded score.',
      );
      return;
    }

    try {
      await gradeSubmission({
        submissionId,
        score: Number(gradingScore),
        tutorFeedback: gradingFeedback.trim() || undefined,
        revisionReason: isRevision ? revisionReason.trim() : undefined,
      }).unwrap();
      setGradeSuccess(true);
      setIsEditingGrade(false);
      refetch();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? ((err as { data?: { message?: string } }).data?.message ?? 'Failed to grade')
          : 'Failed to record grade evaluation';
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
          <p className="text-xs text-rose-200/80 mb-4">
            {locale === 'bn'
              ? 'বাড়ির কাজের আইডি সঠিক নয় অথবা আপনি এটি দেখার অনুমোদিত নন।'
              : 'The requested assignment could not be found or you do not have permission to view it.'}
          </p>
          <Link
            href={withLocale('/learning', locale)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            {locale === 'bn' ? 'লার্নিং সেন্টারে ফিরুন' : 'Back to Learning'}
          </Link>
        </div>
      </div>
    );
  }

  const submission = assignment.submission;
  const hasScore = submission?.score !== null && submission?.score !== undefined;
  const dateLocale = locale === 'bn' ? 'bn-BD' : 'en-US';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={withLocale('/learning', locale)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          data-testid="back-to-learning-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          {locale === 'bn' ? 'লার্নিং ম্যানেজমেন্টে ফিরুন' : 'Back to Learning Portal'}
        </Link>
        {isTutor && (
          <Link
            href={withLocale(`/assignments/${assignmentId}/submissions`, locale)}
            className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium"
          >
            {locale === 'bn' ? 'জমা দেওয়া খাতা পর্যালোচনা' : 'Review Submissions'}
          </Link>
        )}
      </div>

      {/* Main Assignment Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#071d24] to-[#041318] border border-teal-500/20 p-8 text-white shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-500/20 border border-teal-400/30 rounded-full text-xs font-medium text-teal-300">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'বাড়ির কাজ / হোমওয়ার্ক' : 'Homework Assignment'}</span>
            </span>
            {submission && (
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
            )}
          </div>

          <div className="text-right">
            <div className="text-xs text-teal-300/80 uppercase font-semibold">
              {locale === 'bn' ? 'সর্বোচ্চ স্কোর' : 'Max Score'}
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {formatLocalizedNumber(assignment.maxScore, locale)}
            </div>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          {assignment.title}
        </h1>

        {assignment.dueAt && (
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {locale === 'bn' ? 'জমার শেষ তারিখ:' : 'Due Date:'}{' '}
              <strong className="text-white">
                {new Date(assignment.dueAt).toLocaleDateString(dateLocale, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Instructions Card */}
      {assignment.instructions && (
        <Card className="bg-slate-900/80 border border-slate-800 text-slate-200 rounded-2xl p-6 shadow-md">
          <CardHeader className="p-0 pb-3 flex flex-row items-center gap-2 text-slate-300 font-semibold text-sm">
            <FileText className="w-4 h-4 text-teal-400" />
            <span>{locale === 'bn' ? 'নির্দেশাবলী ও প্রশ্নসমূহ' : 'Instructions & Details'}</span>
          </CardHeader>
          <CardContent className="p-0 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
            {assignment.instructions}
          </CardContent>
        </Card>
      )}

      {/* Submission & Grading Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student Submission Card */}
        <Card className="bg-slate-900/90 border border-slate-800 text-slate-100 rounded-3xl p-6 shadow-xl space-y-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>{locale === 'bn' ? 'শিক্ষার্থীর সমাধান / খাতা' : 'Student Submission'}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {submission
                ? locale === 'bn'
                  ? 'শিক্ষার্থী কাজ সম্পন্ন করে জমা দিয়েছে।'
                  : 'Solution has been submitted by student.'
                : locale === 'bn'
                  ? 'এখনো কোনো সমাধান জমা দেওয়া হয়নি।'
                  : 'No solution submitted yet.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 space-y-3">
            {submission ? (
              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{locale === 'bn' ? 'জমার সময়:' : 'Submitted on:'}</span>
                  <span className="font-medium text-slate-200">
                    {submission.submittedAt
                      ? new Date(submission.submittedAt).toLocaleString(dateLocale)
                      : 'N/A'}
                  </span>
                </div>
                {submission.submissionText && (
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 text-xs text-slate-200 whitespace-pre-wrap font-sans">
                    {submission.submissionText}
                  </div>
                )}
              </div>
            ) : isStudent ? (
              <form
                onSubmit={handleSubmitSolution}
                className="space-y-3"
                data-testid="student-solution-form"
              >
                <label
                  htmlFor="solution-text"
                  className="text-xs font-semibold text-slate-300 block"
                >
                  {locale === 'bn'
                    ? 'আপনার উত্তর বা সমাধান লিখুন:'
                    : 'Write your solution or notes:'}
                </label>
                <textarea
                  id="solution-text"
                  rows={4}
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder={
                    locale === 'bn'
                      ? 'অংক বা সমাধান বিস্তারিতভাবে লিখুন...'
                      : 'Type your answer or solution details...'
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  data-testid="solution-textarea"
                />
                {submitError && (
                  <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">
                    {submitError}
                  </div>
                )}
                {submitSuccess && (
                  <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {locale === 'bn'
                        ? 'সমাধান সফলভাবে জমা দেওয়া হয়েছে!'
                        : 'Homework submitted successfully!'}
                    </span>
                  </div>
                )}
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                  data-testid="submit-solution-btn"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {locale === 'bn' ? 'সমাধান জমা দিন' : 'Submit Homework Solution'}
                </Button>
              </form>
            ) : (
              <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                {locale === 'bn'
                  ? 'শিক্ষার্থী এখনো কাজ জমা দেননি।'
                  : 'Student has not submitted yet.'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evaluation / Feedback Card */}
        <Card className="bg-slate-900/90 border border-slate-800 text-slate-100 rounded-3xl p-6 shadow-xl space-y-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
              <Award className="w-4 h-4 text-amber-400" />
              <span>{locale === 'bn' ? 'মূল্যায়ন ও প্রাপ্ত স্কোর' : 'Grade & Feedback'}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {hasScore
                ? locale === 'bn'
                  ? 'শিক্ষক খাতা মূল্যায়ন সম্পন্ন করেছেন।'
                  : 'Tutor has evaluated this submission.'
                : locale === 'bn'
                  ? 'মূল্যায়ন প্রক্রিয়াধীন।'
                  : 'Pending evaluation.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 space-y-3">
            {hasScore && !isEditingGrade && (
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-300 font-semibold">
                    {locale === 'bn' ? 'প্রাপ্ত স্কোর:' : 'Awarded Score:'}
                  </span>
                  <span className="text-2xl font-black text-emerald-400">
                    {formatLocalizedNumber(submission!.score!, locale)} /{' '}
                    {formatLocalizedNumber(assignment.maxScore, locale)}
                  </span>
                </div>

                {submission!.tutorFeedback && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">
                      {locale === 'bn' ? 'শিক্ষকের মন্তব্য:' : 'Tutor Remarks:'}
                    </span>
                    <p className="p-2.5 bg-slate-900/80 rounded-xl border border-emerald-500/20 text-xs text-slate-200 italic">
                      "{submission!.tutorFeedback}"
                    </p>
                  </div>
                )}

                {isTutor && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingGrade(true)}
                    className="w-full border-teal-500/40 text-teal-300 hover:bg-teal-950/40 text-xs rounded-xl mt-2"
                    data-testid="open-revise-grade-btn"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    {locale === 'bn' ? 'স্কোর সংশোধন করুন' : 'Revise Score & Feedback'}
                  </Button>
                )}
              </div>
            )}

            {isTutor && submission && (!hasScore || isEditingGrade) && (
              <form onSubmit={handleGrade} className="space-y-3" data-testid="tutor-grading-form">
                <div className="space-y-1">
                  <label htmlFor="score-input" className="text-xs font-semibold text-slate-300">
                    {locale === 'bn' ? 'স্কোর (সর্বোচ্চ ' : 'Score (Max '}
                    {formatLocalizedNumber(assignment.maxScore, locale)}):
                  </label>
                  <Input
                    id="score-input"
                    type="number"
                    min={0}
                    max={assignment.maxScore}
                    value={gradingScore}
                    onChange={(e) => setGradingScore(Number(e.target.value))}
                    data-testid="grading-score-input"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="feedback-input" className="text-xs font-semibold text-slate-300">
                    {locale === 'bn' ? 'শিক্ষকের পরামর্শ / ফিডব্যাক:' : 'Feedback / Remarks:'}
                  </label>
                  <textarea
                    id="feedback-input"
                    rows={2}
                    value={gradingFeedback}
                    onChange={(e) => setGradingFeedback(e.target.value)}
                    placeholder={
                      locale === 'bn'
                        ? 'ভুলত্রুটি বা উন্নতির জায়গা উল্লেখ করুন...'
                        : 'Provide positive feedback or guidance...'
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    data-testid="grading-feedback-input"
                  />
                </div>

                {hasScore && isEditingGrade && (
                  <div className="space-y-1">
                    <label
                      htmlFor="revision-reason"
                      className="text-xs font-semibold text-amber-300"
                    >
                      {locale === 'bn'
                        ? 'সংশোধনের কারণ (বাধ্যতামূলক):'
                        : 'Revision Reason (Required):'}
                    </label>
                    <Input
                      id="revision-reason"
                      value={revisionReason}
                      onChange={(e) => setRevisionReason(e.target.value)}
                      placeholder={
                        locale === 'bn'
                          ? 'স্কোর পরিবর্তনের সুনির্দিষ্ট কারণ লিখুন...'
                          : 'Audit reason for modifying score...'
                      }
                      data-testid="grading-revision-reason-input"
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
                      {locale === 'bn' ? 'মূল্যায়ন সম্পন্ন হয়েছে!' : 'Grading saved successfully!'}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isGrading}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl"
                    data-testid="submit-grade-btn"
                  >
                    {hasScore
                      ? locale === 'bn'
                        ? 'সংশোধন নিশ্চিত করুন'
                        : 'Confirm Score Revision'
                      : locale === 'bn'
                        ? 'গ্রেড নিশ্চিত করুন'
                        : 'Submit Grade'}
                  </Button>
                  {isEditingGrade && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingGrade(false)}
                      className="border-slate-700 text-slate-300 text-xs rounded-xl"
                    >
                      {locale === 'bn' ? 'বাতিল' : 'Cancel'}
                    </Button>
                  )}
                </div>
              </form>
            )}

            {!hasScore && !isTutor && (
              <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                {locale === 'bn'
                  ? 'শিক্ষক খাতা দেখার পর এখানে স্কোর ও পরামর্শ দেখতে পাবেন।'
                  : 'Score and tutor remarks will be visible once reviewed.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
