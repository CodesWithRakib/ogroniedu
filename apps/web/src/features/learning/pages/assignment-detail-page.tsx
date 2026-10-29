'use client';

import React, { useState } from 'react';
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
  useSubmitAssignmentMutation,
  useGradeSubmissionMutation,
  type AssignmentRecord,
} from '@/store/services/learning-api';
import { useAppSelector } from '@/store';
import { primaryRole } from '@/store/slices/auth-slice';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { parseItem } from '@/lib/api/parse';
import { withLocale } from '@/lib/auth';

export interface AssignmentDetailPageProps {
  assignmentId: string;
  locale: Locale;
}

export function AssignmentDetailPage({ locale, assignmentId }: AssignmentDetailPageProps) {
  const currentUser = useAppSelector((s) => s.auth.user);
  const isTutor = currentUser?.roles?.includes('tutor');
  const isStudent = currentUser?.roles?.includes('student');
  const userRole = primaryRole(currentUser?.roles);
  const backToLearningHref =
    userRole === 'guardian'
      ? withLocale('/dashboard/guardian/learning', locale)
      : userRole === 'tutor'
        ? withLocale('/dashboard/tutor/learning', locale)
        : withLocale('/dashboard/student/learning', locale);

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
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive-soft-foreground">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-destructive-soft-foreground" />
          <h2 className="text-lg font-bold mb-1">
            {locale === 'bn' ? 'বাড়ির কাজ পাওয়া যায়নি' : 'Assignment Not Found'}
          </h2>
          <p className="text-xs text-destructive-soft-foreground mb-4">
            {locale === 'bn'
              ? 'বাড়ির কাজের আইডি সঠিক নয় অথবা আপনি এটি দেখার অনুমোদিত নন।'
              : 'The requested assignment could not be found or you do not have permission to view it.'}
          </p>
          <Link
            href={backToLearningHref}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold rounded-xl"
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
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={backToLearningHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-to-learning-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          {locale === 'bn' ? 'লার্নিং ম্যানেজমেন্টে ফিরুন' : 'Back to Learning Portal'}
        </Link>
        {isTutor && (
          <Link
            href={withLocale(`/assignments/${assignmentId}/submissions`, locale)}
            className="text-xs text-success-soft-foreground hover:text-success-soft-foreground underline font-medium"
          >
            {locale === 'bn' ? 'জমা দেওয়া খাতা পর্যালোচনা' : 'Review Submissions'}
          </Link>
        )}
      </div>

      {/* Main Assignment Banner */}
      <div className="rounded-xl bg-card border border-primary/40 p-8 text-foreground flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/20 border border-primary/40 rounded-full text-xs font-medium text-primary-soft-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'বাড়ির কাজ / হোমওয়ার্ক' : 'Homework Assignment'}</span>
            </span>
            {submission && (
              <Badge
                className={
                  submission.status === 'reviewed'
                    ? 'bg-success-soft text-success-soft-foreground border border-success/30'
                    : submission.status === 'late'
                      ? 'bg-warning/20 text-warning-soft-foreground border border-warning/40'
                      : 'bg-interactive/20 text-info-soft-foreground border border-interactive/40'
                }
              >
                {submission.status.toUpperCase()}
              </Badge>
            )}
          </div>

          <div className="text-right">
            <div className="text-xs text-primary-soft-foreground uppercase font-semibold">
              {locale === 'bn' ? 'সর্বোচ্চ স্কোর' : 'Max Score'}
            </div>
            <div className="text-2xl font-black text-success-soft-foreground">
              {formatLocalizedNumber(assignment.maxScore, locale)}
            </div>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
          {assignment.title}
        </h1>

        {assignment.dueAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-warning-soft-foreground" />
            <span>
              {locale === 'bn' ? 'জমার শেষ তারিখ:' : 'Due Date:'}{' '}
              <strong className="text-foreground">
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
        <Card className="bg-card border border-border text-foreground rounded-xl p-6">
          <CardHeader className="p-0 pb-3 flex flex-row items-center gap-2 text-muted-foreground font-semibold text-sm">
            <FileText className="w-4 h-4 text-primary-soft-foreground" />
            <span>{locale === 'bn' ? 'নির্দেশাবলী ও প্রশ্নসমূহ' : 'Instructions & Details'}</span>
          </CardHeader>
          <CardContent className="p-0 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {assignment.instructions}
          </CardContent>
        </Card>
      )}

      {/* Submission & Grading Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student Submission Card */}
        <Card className="bg-card border border-border text-foreground rounded-xl p-6 flex flex-col gap-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Send className="w-4 h-4 text-success-soft-foreground" />
              <span>{locale === 'bn' ? 'শিক্ষার্থীর সমাধান / খাতা' : 'Student Submission'}</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {submission
                ? locale === 'bn'
                  ? 'শিক্ষার্থী কাজ সম্পন্ন করে জমা দিয়েছে।'
                  : 'Solution has been submitted by student.'
                : locale === 'bn'
                  ? 'এখনো কোনো সমাধান জমা দেওয়া হয়নি।'
                  : 'No solution submitted yet.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 flex flex-col gap-3">
            {submission ? (
              <div className="p-4 bg-muted rounded-xl border border-border flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{locale === 'bn' ? 'জমার সময়:' : 'Submitted on:'}</span>
                  <span className="font-medium text-foreground">
                    {submission.submittedAt
                      ? new Date(submission.submittedAt).toLocaleString(dateLocale)
                      : 'N/A'}
                  </span>
                </div>
                {submission.submissionText && (
                  <div className="p-3 bg-card rounded-xl border border-border text-xs text-foreground whitespace-pre-wrap font-sans">
                    {submission.submissionText}
                  </div>
                )}
              </div>
            ) : isStudent ? (
              <form
                onSubmit={handleSubmitSolution}
                className="flex flex-col gap-3"
                data-testid="student-solution-form"
              >
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="solution-text"
                    className="text-xs font-semibold text-muted-foreground block"
                  >
                    {locale === 'bn'
                      ? 'আপনার উত্তর বা সমাধান লিখুন:'
                      : 'Write your solution or notes:'}
                  </Label>
                  <Textarea
                    id="solution-text"
                    rows={4}
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder={
                      locale === 'bn'
                        ? 'অংক বা সমাধান বিস্তারিতভাবে লিখুন...'
                        : 'Type your answer or solution details...'
                    }
                    data-testid="solution-textarea"
                  />
                </div>
                {submitError && (
                  <Alert variant="destructive" className="py-2.5 rounded-xl">
                    <AlertDescription className="text-xs">{submitError}</AlertDescription>
                  </Alert>
                )}
                {submitSuccess && (
                  <Alert variant="success" className="py-2.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    <AlertDescription className="text-xs">
                      {locale === 'bn'
                        ? 'সমাধান সফলভাবে জমা দেওয়া হয়েছে!'
                        : 'Homework submitted successfully!'}
                    </AlertDescription>
                  </Alert>
                )}
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-blue-500/25"
                  data-testid="submit-solution-btn"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {locale === 'bn' ? 'সমাধান জমা দিন' : 'Submit Homework Solution'}
                </Button>
              </form>
            ) : (
              <div className="p-4 bg-muted rounded-xl border border-border text-center text-xs text-muted-foreground">
                {locale === 'bn'
                  ? 'শিক্ষার্থী এখনো কাজ জমা দেননি।'
                  : 'Student has not submitted yet.'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evaluation / Feedback Card */}
        <Card className="bg-card border border-border text-foreground rounded-xl p-6 flex flex-col gap-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Award className="w-4 h-4 text-warning-soft-foreground" />
              <span>{locale === 'bn' ? 'মূল্যায়ন ও প্রাপ্ত স্কোর' : 'Grade & Feedback'}</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {hasScore
                ? locale === 'bn'
                  ? 'শিক্ষক খাতা মূল্যায়ন সম্পন্ন করেছেন।'
                  : 'Tutor has evaluated this submission.'
                : locale === 'bn'
                  ? 'মূল্যায়ন প্রক্রিয়াধীন।'
                  : 'Pending evaluation.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 flex flex-col gap-3">
            {hasScore && !isEditingGrade && (
              <div className="p-4 bg-primary-soft border border-primary/40 rounded-xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-success-soft-foreground font-semibold">
                    {locale === 'bn' ? 'প্রাপ্ত স্কোর:' : 'Awarded Score:'}
                  </span>
                  <span className="text-2xl font-black text-success-soft-foreground">
                    {formatLocalizedNumber(submission!.score!, locale)} /{' '}
                    {formatLocalizedNumber(assignment.maxScore, locale)}
                  </span>
                </div>

                {submission!.tutorFeedback && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">
                      {locale === 'bn' ? 'শিক্ষকের মন্তব্য:' : 'Tutor Remarks:'}
                    </span>
                    <p className="p-2.5 bg-card rounded-xl border border-primary/40 text-xs text-foreground italic">
                      "{submission!.tutorFeedback}"
                    </p>
                  </div>
                )}

                {isTutor && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingGrade(true)}
                    className="w-full border-primary/40 text-primary-soft-foreground hover:bg-primary-soft text-xs rounded-xl mt-2"
                    data-testid="open-revise-grade-btn"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    {locale === 'bn' ? 'স্কোর সংশোধন করুন' : 'Revise Score & Feedback'}
                  </Button>
                )}
              </div>
            )}

            {isTutor && submission && (!hasScore || isEditingGrade) && (
              <form
                onSubmit={handleGrade}
                className="flex flex-col gap-3"
                data-testid="tutor-grading-form"
              >
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="score-input"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    {locale === 'bn' ? 'স্কোর (সর্বোচ্চ ' : 'Score (Max '}
                    {formatLocalizedNumber(assignment.maxScore, locale)}):
                  </Label>
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

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="feedback-input"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    {locale === 'bn' ? 'শিক্ষকের পরামর্শ / ফিডব্যাক:' : 'Feedback / Remarks:'}
                  </Label>
                  <Textarea
                    id="feedback-input"
                    rows={2}
                    value={gradingFeedback}
                    onChange={(e) => setGradingFeedback(e.target.value)}
                    placeholder={
                      locale === 'bn'
                        ? 'ভুলত্রুটি বা উন্নতির জায়গা উল্লেখ করুন...'
                        : 'Provide positive feedback or guidance...'
                    }
                    data-testid="grading-feedback-input"
                  />
                </div>

                {hasScore && isEditingGrade && (
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="revision-reason"
                      className="text-xs font-semibold text-warning-soft-foreground"
                    >
                      {locale === 'bn'
                        ? 'সংশোধনের কারণ (বাধ্যতামূলক):'
                        : 'Revision Reason (Required):'}
                    </Label>
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
                  <Alert variant="destructive" className="py-2.5 rounded-xl">
                    <AlertDescription className="text-xs">{gradeError}</AlertDescription>
                  </Alert>
                )}
                {gradeSuccess && (
                  <Alert variant="success" className="py-2.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    <AlertDescription className="text-xs">
                      {locale === 'bn' ? 'মূল্যায়ন সম্পন্ন হয়েছে!' : 'Grading saved successfully!'}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isGrading}
                    className="flex-1 bg-interactive hover:bg-interactive-hover text-white text-xs font-bold rounded-xl"
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
                      className="border-border text-muted-foreground text-xs rounded-xl"
                    >
                      {locale === 'bn' ? 'বাতিল' : 'Cancel'}
                    </Button>
                  )}
                </div>
              </form>
            )}

            {!hasScore && !isTutor && (
              <div className="p-4 bg-muted rounded-xl border border-border text-center text-xs text-muted-foreground">
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
