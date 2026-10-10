'use client';

import React, { useState, useTransition } from 'react';
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  FileText,
  ShieldCheck,
  Plus,
  Send,
  Edit3,
  TrendingUp,
  X,
  History,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Input,
} from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';

export type AttendanceItemStatus = 'present' | 'late' | 'absent' | 'excused';
export type SubmissionItemStatus = 'submitted' | 'late' | 'reviewed' | 'returned';

export interface AttendanceRecordItem {
  id: string;
  sessionId: string;
  participantUserId: string;
  attendanceStatus: AttendanceItemStatus;
  recordedAt: string;
  notes?: string | null;
  subjectName?: string;
  sessionDate?: string;
}

export interface AssignmentItem {
  id: string;
  bookingId: string;
  title: string;
  instructions?: string | null;
  dueAt?: string | null;
  maxScore: number;
  status: 'draft' | 'published' | 'archived';
  submission?: {
    id: string;
    studentUserId: string;
    submissionText?: string | null;
    status: SubmissionItemStatus;
    score?: number | null;
    maxScore?: number | null;
    tutorFeedback?: string | null;
    reviewedAt?: string | null;
  } | null;
}

export interface ProgressReportItem {
  id: string;
  bookingId: string;
  periodStart: string;
  periodEnd: string;
  attendanceRate: number;
  assignmentsCompleted: number;
  averageScore?: number | null;
  observableProgress: string;
  areasForGrowth?: string | null;
  tutorRemarks?: string | null;
  generatedAt: string;
}

export interface LearningManagementViewProps {
  locale: Locale;
  userRole?: 'student' | 'tutor' | 'guardian' | 'admin';
  initialAttendance?: AttendanceRecordItem[];
  initialAssignments?: AssignmentItem[];
  initialReports?: ProgressReportItem[];
  onMarkAttendance?: (data: {
    sessionId: string;
    participantUserId: string;
    attendanceStatus: AttendanceItemStatus;
    notes?: string;
  }) => Promise<void>;
  onSubmitAssignment?: (assignmentId: string, data: { submissionText: string }) => Promise<void>;
  onGradeSubmission?: (
    submissionId: string,
    data: { score: number; tutorFeedback?: string; revisionReason?: string },
  ) => Promise<void>;
  onGenerateReport?: (data: {
    bookingId: string;
    periodStart: string;
    periodEnd: string;
    observableProgress: string;
    areasForGrowth?: string;
    tutorRemarks?: string;
  }) => Promise<void>;
}

export function LearningManagementView({
  locale,
  userRole = 'tutor',
  initialAttendance = [],
  initialAssignments = [],
  initialReports = [],
  onMarkAttendance,
  onSubmitAssignment,
  onGradeSubmission,
  onGenerateReport,
}: LearningManagementViewProps) {
  const dict = getDictionary(locale);
  const t = dict.learning;

  const [activeTab, setActiveTab] = useState<'attendance' | 'assignments' | 'progress'>(
    'attendance',
  );
  const [attendanceList, setAttendanceList] = useState<AttendanceRecordItem[]>(initialAttendance);
  const [assignmentList, setAssignmentList] = useState<AssignmentItem[]>(initialAssignments);
  const [reportList, setReportList] = useState<ProgressReportItem[]>(initialReports);

  // Modals state
  const [submitModalAssignment, setSubmitModalAssignment] = useState<AssignmentItem | null>(null);
  const [submissionText, setSubmissionText] = useState('');

  const [gradingModalAssignment, setGradingModalAssignment] = useState<AssignmentItem | null>(null);
  const [gradingScore, setGradingScore] = useState<number>(0);
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [gradingRevisionReason, setGradingRevisionReason] = useState('');
  const [gradingError, setGradingError] = useState('');

  const [isPending, startTransition] = useTransition();

  // Observable metrics calculation
  const totalAttended = attendanceList.filter(
    (a) => a.attendanceStatus === 'present' || a.attendanceStatus === 'late',
  ).length;
  const attendanceRate =
    attendanceList.length > 0 ? Math.round((totalAttended / attendanceList.length) * 100) : 100;

  const completedAssignmentsCount = assignmentList.filter(
    (a) => a.submission && a.submission.status !== 'returned',
  ).length;

  const scoredSubmissions = assignmentList
    .map((a) => a.submission)
    .filter((s) => s && s.score !== null && s.score !== undefined && s.maxScore);

  const averageScorePct =
    scoredSubmissions.length > 0
      ? Math.round(
          scoredSubmissions.reduce(
            (acc, s) => acc + (Number(s!.score) / Number(s!.maxScore)) * 100,
            0,
          ) / scoredSubmissions.length,
        )
      : null;

  const handleOpenGrading = (asgn: AssignmentItem) => {
    setGradingModalAssignment(asgn);
    setGradingScore(asgn.submission?.score ?? 0);
    setGradingFeedback(asgn.submission?.tutorFeedback ?? '');
    setGradingRevisionReason('');
    setGradingError('');
  };

  const handleSubmitGrading = async () => {
    if (!gradingModalAssignment?.submission) return;
    const isRevision =
      gradingModalAssignment.submission.score !== null &&
      gradingModalAssignment.submission.score !== undefined &&
      gradingModalAssignment.submission.score !== gradingScore;

    if (isRevision && !gradingRevisionReason.trim()) {
      setGradingError(t.revisionReasonRequired);
      return;
    }

    startTransition(async () => {
      try {
        if (onGradeSubmission) {
          await onGradeSubmission(gradingModalAssignment.submission!.id, {
            score: gradingScore,
            tutorFeedback: gradingFeedback,
            revisionReason: isRevision ? gradingRevisionReason : undefined,
          });
        }
        setAssignmentList((prev) =>
          prev.map((a) =>
            a.id === gradingModalAssignment.id
              ? {
                  ...a,
                  submission: {
                    ...a.submission!,
                    score: gradingScore,
                    tutorFeedback: gradingFeedback,
                    status: 'reviewed',
                    reviewedAt: new Date().toISOString(),
                  },
                }
              : a,
          ),
        );
        setGradingModalAssignment(null);
      } catch (err) {
        setGradingError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  const handleStudentSubmit = async () => {
    if (!submitModalAssignment) return;
    startTransition(async () => {
      try {
        if (onSubmitAssignment) {
          await onSubmitAssignment(submitModalAssignment.id, {
            submissionText,
          });
        }
        setAssignmentList((prev) =>
          prev.map((a) =>
            a.id === submitModalAssignment.id
              ? {
                  ...a,
                  submission: {
                    id: 'sub-local-' + Date.now(),
                    studentUserId: 'student-id',
                    submissionText,
                    status: 'submitted',
                    maxScore: a.maxScore,
                  },
                }
              : a,
          ),
        );
        setSubmitModalAssignment(null);
        setSubmissionText('');
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-emerald-950 p-6 rounded-2xl border border-emerald-700/40 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t.auditedNotice}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{t.title}</h1>
            <p className="text-emerald-200/80 text-sm mt-1 max-w-2xl">{t.subtitle}</p>
          </div>

          <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{t.guardianOversightNotice}</span>
          </div>
        </div>
      </div>

      {/* Observable Verifiable Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t.attendanceRate}
              </p>
              <h3 className="text-3xl font-extrabold text-foreground mt-1">
                {formatLocalizedNumber(attendanceRate, locale)}%
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {formatLocalizedNumber(totalAttended, locale)} /{' '}
                {formatLocalizedNumber(attendanceList.length, locale)} {t.present.toLowerCase()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t.completedAssignments}
              </p>
              <h3 className="text-3xl font-extrabold text-foreground mt-1">
                {formatLocalizedNumber(completedAssignmentsCount, locale)} /{' '}
                {formatLocalizedNumber(assignmentList.length, locale)}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{t.tabsAssignments}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t.averageScore}
              </p>
              <h3 className="text-3xl font-extrabold text-foreground mt-1">
                {averageScorePct !== null
                  ? `${formatLocalizedNumber(averageScorePct, locale)}%`
                  : 'N/A'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {formatLocalizedNumber(scoredSubmissions.length, locale)}{' '}
                {t.statusReviewed.toLowerCase()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/60 space-x-2">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 -mb-px ${
            activeTab === 'attendance'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          {t.tabsAttendance}
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
            {formatLocalizedNumber(attendanceList.length, locale)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 -mb-px ${
            activeTab === 'assignments'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          {t.tabsAssignments}
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
            {formatLocalizedNumber(assignmentList.length, locale)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 -mb-px ${
            activeTab === 'progress'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          {t.tabsProgress}
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
            {formatLocalizedNumber(reportList.length, locale)}
          </span>
        </button>
      </div>

      {/* Tab 1: Attendance */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {attendanceList.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-muted-foreground/60" />
              <p>{t.noAttendance}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attendanceList.map((rec) => (
                <Card key={rec.id} className="border-border/60 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {rec.subjectName || 'Tutoring Class'}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(rec.recordedAt).toLocaleDateString(
                          locale === 'bn' ? 'bn-BD' : 'en-US',
                          {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          },
                        )}
                      </CardDescription>
                    </div>

                    <Badge
                      className={
                        rec.attendanceStatus === 'present'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : rec.attendanceStatus === 'late'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : rec.attendanceStatus === 'excused'
                              ? 'bg-sky-500/10 text-sky-600 border-sky-500/20'
                              : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      }
                    >
                      {rec.attendanceStatus === 'present' && t.present}
                      {rec.attendanceStatus === 'late' && t.late}
                      {rec.attendanceStatus === 'excused' && t.excused}
                      {rec.attendanceStatus === 'absent' && t.absent}
                    </Badge>
                  </CardHeader>
                  {rec.notes && (
                    <CardContent className="text-sm text-muted-foreground pt-0">
                      <p className="bg-muted/50 p-2 rounded-lg text-xs italic">"{rec.notes}"</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Homework & Assignments */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {assignmentList.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-2 text-muted-foreground/60" />
              <p>{t.noAssignments}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {assignmentList.map((asgn) => {
                const sub = asgn.submission;
                return (
                  <Card
                    key={asgn.id}
                    className="border-border/60 hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg font-bold">{asgn.title}</CardTitle>
                          {sub && (
                            <Badge
                              variant="outline"
                              className={
                                sub.status === 'reviewed'
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                  : sub.status === 'late'
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                    : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                              }
                            >
                              {sub.status === 'reviewed' && t.statusReviewed}
                              {sub.status === 'submitted' && t.statusSubmitted}
                              {sub.status === 'late' && t.statusLate}
                              {sub.status === 'returned' && t.statusReturned}
                            </Badge>
                          )}
                        </div>
                        {asgn.dueAt && (
                          <CardDescription className="text-xs flex items-center gap-1.5 mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(asgn.dueAt).toLocaleDateString(
                              locale === 'bn' ? 'bn-BD' : 'en-US',
                            )}
                          </CardDescription>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {sub?.score !== null && sub?.score !== undefined ? (
                          <div className="text-right">
                            <div className="text-lg font-extrabold text-emerald-600">
                              {formatLocalizedNumber(sub.score, locale)} /{' '}
                              {formatLocalizedNumber(asgn.maxScore, locale)}
                            </div>
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                              {t.scoreLabel}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t.maxScoreLabel}: {formatLocalizedNumber(asgn.maxScore, locale)}
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      {asgn.instructions && (
                        <p className="text-sm text-foreground/80 bg-muted/30 p-3 rounded-lg border border-border/40">
                          {asgn.instructions}
                        </p>
                      )}

                      {sub?.submissionText && (
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-border/40 text-xs">
                          <span className="font-semibold text-muted-foreground block mb-1">
                            {t.submissionTextLabel}:
                          </span>
                          <p className="text-foreground">{sub.submissionText}</p>
                        </div>
                      )}

                      {sub?.tutorFeedback && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-500/30 text-xs">
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400 block mb-1 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" /> {t.feedbackLabel}:
                          </span>
                          <p className="text-emerald-950 dark:text-emerald-200">
                            {sub.tutorFeedback}
                          </p>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-0 flex justify-end gap-2">
                      {userRole === 'student' && !sub && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSubmitModalAssignment(asgn);
                            setSubmissionText('');
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          {t.submitHomework}
                        </Button>
                      )}

                      {(userRole === 'tutor' || userRole === 'admin') && sub && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenGrading(asgn)}
                          className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                          {sub.score !== null && sub.score !== undefined
                            ? t.reviseScore
                            : t.gradeAction}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Progress Reports */}
      {activeTab === 'progress' && (
        <div className="space-y-4">
          {reportList.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <TrendingUp className="w-10 h-10 mx-auto mb-2 text-muted-foreground/60" />
              <p>{t.noReports}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {reportList.map((rep) => (
                <Card key={rep.id} className="border-border/60 hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Award className="w-4 h-4 text-emerald-600" />
                          {rep.periodStart} – {rep.periodEnd}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(rep.generatedAt).toLocaleDateString(
                            locale === 'bn' ? 'bn-BD' : 'en-US',
                          )}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-center bg-muted/60 px-3 py-1.5 rounded-lg border border-border/40">
                          <span className="text-[10px] uppercase text-muted-foreground font-semibold block">
                            {t.attendanceRate}
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {formatLocalizedNumber(rep.attendanceRate, locale)}%
                          </span>
                        </div>
                        <div className="text-center bg-muted/60 px-3 py-1.5 rounded-lg border border-border/40">
                          <span className="text-[10px] uppercase text-muted-foreground font-semibold block">
                            {t.completedAssignments}
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {formatLocalizedNumber(rep.assignmentsCompleted, locale)}
                          </span>
                        </div>
                        {rep.averageScore !== null && rep.averageScore !== undefined && (
                          <div className="text-center bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                            <span className="text-[10px] uppercase text-emerald-600 font-semibold block">
                              {t.averageScore}
                            </span>
                            <span className="text-sm font-bold text-emerald-600">
                              {formatLocalizedNumber(rep.averageScore, locale)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-border/40 text-sm">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">
                        {t.observableProgressLabel}
                      </span>
                      <p className="text-foreground">{rep.observableProgress}</p>
                    </div>

                    {rep.areasForGrowth && (
                      <div className="bg-amber-500/5 p-3 rounded-lg border border-amber-500/20 text-sm">
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-wide block mb-1">
                          {t.areasForGrowthLabel}
                        </span>
                        <p className="text-amber-950 dark:text-amber-200">{rep.areasForGrowth}</p>
                      </div>
                    )}

                    {rep.tutorRemarks && (
                      <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20 text-sm">
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide block mb-1">
                          {t.tutorRemarksLabel}
                        </span>
                        <p className="text-emerald-950 dark:text-emerald-200">{rep.tutorRemarks}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Student Homework Submission */}
      {submitModalAssignment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl max-w-lg w-full p-6 border border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                {t.submitHomework}: {submitModalAssignment.title}
              </h3>
              <button
                onClick={() => setSubmitModalAssignment(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                {t.submissionTextLabel}
              </label>
              <textarea
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-border p-3 text-sm bg-background text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Type your homework answer or paste notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSubmitModalAssignment(null)}>
                {dict.common.cancel}
              </Button>
              <Button
                size="sm"
                disabled={isPending || !submissionText.trim()}
                onClick={handleStudentSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {t.submitHomework}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tutor Grading & Score Revision with Audit */}
      {gradingModalAssignment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl max-w-lg w-full p-6 border border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                {gradingModalAssignment.submission?.score !== null &&
                gradingModalAssignment.submission?.score !== undefined
                  ? t.reviseScore
                  : t.gradeAction}
              </h3>
              <button
                onClick={() => setGradingModalAssignment(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {gradingError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{gradingError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  {t.scoreLabel} (Max: {gradingModalAssignment.maxScore})
                </label>
                <Input
                  type="number"
                  min={0}
                  max={gradingModalAssignment.maxScore}
                  value={gradingScore}
                  onChange={(e) => setGradingScore(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  {t.feedbackLabel}
                </label>
                <textarea
                  value={gradingFeedback}
                  onChange={(e) => setGradingFeedback(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border p-3 text-sm bg-background text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Constructive feedback for learner..."
                />
              </div>

              {/* Revision Reason requirement when updating already graded score */}
              {gradingModalAssignment.submission?.score !== null &&
                gradingModalAssignment.submission?.score !== undefined &&
                gradingModalAssignment.submission.score !== gradingScore && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                    <label className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      {t.revisionReason} *
                    </label>
                    <p className="text-[11px] text-muted-foreground">{t.revisionReasonRequired}</p>
                    <Input
                      placeholder="e.g. Recalculated exercise 2 solution"
                      value={gradingRevisionReason}
                      onChange={(e) => setGradingRevisionReason(e.target.value)}
                    />
                  </div>
                )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setGradingModalAssignment(null)}>
                {dict.common.cancel}
              </Button>
              <Button
                size="sm"
                disabled={isPending}
                onClick={handleSubmitGrading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {dict.common.save}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
