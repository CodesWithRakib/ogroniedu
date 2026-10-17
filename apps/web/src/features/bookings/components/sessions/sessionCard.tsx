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
import { formatWeekdayDate, formatTime } from '@/lib/format';
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
  const formattedDate = formatWeekdayDate(session.startsAt, locale);
  const formattedTime = formatTime(session.startsAt, locale);

  return (
    <Card
      className="flex flex-col justify-between hover:shadow-md transition-all bg-card border border-border/90 hover:border-primary/40 rounded-2xl overflow-hidden shadow-xs"
      data-testid={`session-card-${session.id}`}
    >
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-foreground">
            {formattedDate} • {formattedTime}
          </span>
          <SessionStatusBadge locale={locale} status={session.status} />
        </div>
        <CardTitle className="text-base font-extrabold text-foreground">
          {session.subjectName || (locale === 'bn' ? 'পদার্থবিজ্ঞান ১ম পত্র' : 'Physics Paper 1')}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground font-medium">
          {locale === 'bn' ? 'শিক্ষক:' : 'Tutor:'} {session.tutorName} |{' '}
          {locale === 'bn' ? 'শিক্ষার্থী:' : 'Learner:'} {session.studentName}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 text-xs pt-0">
        {session.meetingUrl && session.status !== 'cancelled' && (
          <div className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 text-foreground">
              <Video className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-xs truncate max-w-[170px]">
                {locale === 'bn' ? 'অনলাইন ক্লাসরুম' : 'Online Classroom'}
              </span>
            </div>
            <a
              href={session.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{dict.scheduling?.joinMeeting || (locale === 'bn' ? 'ক্লাসে যোগ দিন' : 'Join Class')}</span>
            </a>
          </div>
        )}

        {session.cancellationAssessment && (
          <div className="p-3 bg-destructive-soft rounded-xl border border-destructive/20 text-xs text-destructive-soft-foreground space-y-1">
            <span className="font-bold block">
              {locale === 'bn' ? 'বাতিলকৃত সেশন' : 'Cancelled Session'}
            </span>
            <p className="font-medium">
              {locale === 'bn' ? 'রিফান্ড হার:' : 'Refund:'}{' '}
              {formatLocalizedNumber(session.cancellationAssessment.refundPercentage, locale)}%
            </p>
            {session.cancellationAssessment.reason && (
              <p className="italic text-muted-foreground">"{session.cancellationAssessment.reason}"</p>
            )}
          </div>
        )}
      </CardContent>

      {session.status === 'scheduled' && (
        <CardFooter className="pt-3 border-t border-border flex justify-end gap-2 bg-card">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRescheduleClick(session)}
            data-testid={`reschedule-btn-${session.id}`}
            className="text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            {dict.scheduling?.reschedule || 'Reschedule'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onCancelClick(session)}
            data-testid={`cancel-btn-${session.id}`}
            className="text-xs font-semibold"
          >
            {dict.scheduling?.cancelSession || 'Cancel'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
