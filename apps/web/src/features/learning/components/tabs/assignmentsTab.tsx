'use client';

import Link from 'next/link';
import { Award, BookOpen, Clock, Edit3, Send, ExternalLink } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import type {
  AssignmentItem,
  LearningRole,
  SubmissionItemStatus,
} from '../../types/learning.types';

function submissionBadgeClass(status: SubmissionItemStatus): string {
  if (status === 'reviewed') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
  if (status === 'late') return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
  return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
}

export function AssignmentsTab({
  locale,
  userRole,
  assignments,
  onSubmit,
  onGrade,
}: {
  locale: Locale;
  userRole: LearningRole;
  assignments: AssignmentItem[];
  onSubmit: (assignment: AssignmentItem) => void;
  onGrade: (assignment: AssignmentItem) => void;
}) {
  const t = getDictionary(locale).learning;
  const dateLocale = locale === 'bn' ? 'bn-BD' : 'en-US';

  if (assignments.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <BookOpen className="w-10 h-10 mx-auto mb-2 text-muted-foreground/60" />
        <p>{t.noAssignments}</p>
      </Card>
    );
  }

  const statusLabel: Record<SubmissionItemStatus, string> = {
    reviewed: t.statusReviewed,
    submitted: t.statusSubmitted,
    late: t.statusLate,
    returned: t.statusReturned,
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      {assignments.map((asgn) => {
        const sub = asgn.submission;
        const hasScore = sub?.score !== null && sub?.score !== undefined;
        return (
          <Card key={asgn.id} className="border-border/60 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-bold">{asgn.title}</CardTitle>
                  {sub && (
                    <Badge variant="outline" className={submissionBadgeClass(sub.status)}>
                      {statusLabel[sub.status]}
                    </Badge>
                  )}
                </div>
                {asgn.dueAt && (
                  <CardDescription className="text-xs flex items-center gap-1.5 mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(asgn.dueAt).toLocaleDateString(dateLocale)}
                  </CardDescription>
                )}
              </div>

              {hasScore ? (
                <div className="text-right">
                  <div className="text-lg font-extrabold text-emerald-600">
                    {formatLocalizedNumber(sub!.score!, locale)} /{' '}
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
                  <p className="text-emerald-950 dark:text-emerald-200">{sub.tutorFeedback}</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-0 flex items-center justify-between gap-2">
              <Link
                href={withLocale(`/assignments/${asgn.id}`, locale)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                <span>{locale === 'bn' ? 'বিস্তারিত দেখুন' : 'View Details'}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <div className="flex items-center gap-2">
                {userRole === 'student' && !sub && (
                  <Button
                    size="sm"
                    onClick={() => onSubmit(asgn)}
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
                    onClick={() => onGrade(asgn)}
                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    {hasScore ? t.reviseScore : t.gradeAction}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
