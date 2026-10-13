'use client';

import { Video, RotateCcw } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import type { CalendarSessionItem } from '../../types/session.types';
import { SessionStatusBadge } from './sessionStatusBadge';

/** One session card: schedule, meeting link, real cancellation assessment, actions. */
export function SessionCard({
  locale,
  session,
  onRescheduleClick,
  onCancelClick,
}: {
  locale: Locale;
  session: CalendarSessionItem;
  onRescheduleClick: (session: CalendarSessionItem) => void;
  onCancelClick: (session: CalendarSessionItem) => void;
}) {
  const dict = getDictionary(locale);
  const startDate = new Date(session.startsAt);
  const formattedDate = startDate.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = startDate.toLocaleTimeString(locale === 'bn' ? 'bn-BD' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card
      className="flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800"
      data-testid={`session-card-${session.id}`}
    >
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            {formattedDate} • {formattedTime}
          </span>
          <SessionStatusBadge locale={locale} status={session.status} />
        </div>
        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
          {session.subjectName}
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Tutor: {session.tutorName} | Learner: {session.studentName}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 text-xs pt-0">
        {session.meetingUrl && session.status !== 'cancelled' && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <Video className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium truncate max-w-[180px]">Online Classroom</span>
            </div>
            <a
              href={session.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium text-[11px] transition-colors"
            >
              {dict.scheduling?.joinMeeting || 'Join'}
            </a>
          </div>
        )}

        {session.cancellationAssessment && (
          <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-100 dark:border-rose-900 text-[11px] text-rose-800 dark:text-rose-300 space-y-0.5">
            <span className="font-semibold block">Cancelled</span>
            <p>
              Refund:{' '}
              {formatLocalizedNumber(session.cancellationAssessment.refundPercentage, locale)}%
            </p>
            {session.cancellationAssessment.reason && (
              <p className="italic">"{session.cancellationAssessment.reason}"</p>
            )}
          </div>
        )}
      </CardContent>

      {session.status === 'scheduled' && (
        <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRescheduleClick(session)}
            data-testid={`reschedule-btn-${session.id}`}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            {dict.scheduling?.reschedule || 'Reschedule'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onCancelClick(session)}
            data-testid={`cancel-btn-${session.id}`}
          >
            {dict.scheduling?.cancelSession || 'Cancel'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
