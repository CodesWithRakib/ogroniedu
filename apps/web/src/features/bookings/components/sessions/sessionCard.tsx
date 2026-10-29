'use client';

import Link from 'next/link';
import {
  Video,
  RotateCcw,
  Calendar,
  Clock,
  User,
  GraduationCap,
  ChevronRight,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatWeekdayDate, formatTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import type { CalendarSessionItem } from '../../types/session.types';
import { SessionStatusBadge } from './sessionStatusBadge';

/** Premium session card: subject hero badge, participant profiles, live video launcher, and lifecycle actions. */
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
  const isBn = locale === 'bn';
  const formattedDate = formatWeekdayDate(session.startsAt, locale);
  const formattedTime = formatTime(session.startsAt, locale);
  const isScheduled = session.status === 'scheduled' || session.status === 'in_progress';

  return (
    <Card
      className="group relative flex flex-col justify-between transition-colors bg-card border border-border rounded-xl overflow-hidden"
      data-testid={`session-card-${session.id}`}
    >
      <CardHeader className="flex flex-col gap-3 p-5 sm:p-6 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-foreground font-medium text-xs border border-border">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>{formattedDate}</span>
            <span className="text-muted-foreground">•</span>
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span>{formattedTime}</span>
          </div>
          <SessionStatusBadge locale={locale} status={session.status} />
        </div>

        <div>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors tracking-tight">
              {session.subjectName || (isBn ? 'পদার্থবিজ্ঞান ১ম পত্র' : 'Physics Paper 1')}
            </CardTitle>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground mt-0.5 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-primary" />
            <span>
              {session.timezone ? `সময় অঞ্চল: (${session.timezone})` : 'বাংলাদেশ সময় (BST)'}
            </span>
          </p>
        </div>

        {/* Participant Profile Cards */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/30 border border-border text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-muted-foreground block truncate">
                {isBn ? 'শিক্ষক' : 'Tutor'}
              </span>
              <span className="font-semibold text-foreground text-[11px] block truncate">
                {session.tutorName || (isBn ? 'একাডেমিক শিক্ষক' : 'Academic Tutor')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 min-w-0 border-l border-border pl-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-muted-foreground block truncate">
                {isBn ? 'শিক্ষার্থী' : 'Student'}
              </span>
              <span className="font-semibold text-foreground text-[11px] block truncate">
                {session.studentName || (isBn ? 'নিবন্ধিত শিক্ষার্থী' : 'Enrolled Student')}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 px-5 sm:px-6 py-2 text-xs">
        {/* Direct Classroom Action Link */}
        {session.meetingUrl && session.status !== 'cancelled' && (
          <div className="p-3 bg-muted/30 rounded-xl border border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-xs text-foreground block truncate">
                  {isBn ? 'লাইভ ক্লাসরুম' : 'Live Classroom'}
                </span>
                <span className="text-[10px] text-muted-foreground block truncate">
                  {isBn ? 'ভিডিও ও ইন্টার‍্যাক্টিভ বোর্ড' : 'Video & Interactive Board'}
                </span>
              </div>
            </div>
            <a
              href={session.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{dict.scheduling?.joinMeeting || (isBn ? 'ক্লাসে যোগ দিন' : 'Join Class')}</span>
            </a>
          </div>
        )}

        {/* Cancellation Assessment Metadata */}
        {session.cancellationAssessment && (
          <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20 text-xs text-destructive flex flex-col gap-1">
            <span className="font-semibold block">
              {isBn ? 'বাতিলকৃত সেশন নীতি' : 'Cancelled Session Policy'}
            </span>
            <p className="font-medium text-[11px]">
              {isBn ? 'রিফান্ড হার:' : 'Refund Rate:'}{' '}
              <span className="font-bold">
                {formatLocalizedNumber(session.cancellationAssessment.refundPercentage, locale)}%
              </span>{' '}
              {session.cancellationAssessment.leadHours !== undefined &&
                `(${session.cancellationAssessment.leadHours}h notice)`}
            </p>
            {session.cancellationAssessment.reason && (
              <p className="italic text-muted-foreground text-[11px]">
                "{session.cancellationAssessment.reason}"
              </p>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 sm:p-5 pt-3 border-t border-border flex items-center justify-between gap-2 bg-card">
        <Link
          href={withLocale(`/sessions/${session.id}`, locale)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 transition-colors"
        >
          <span>{isBn ? 'বিস্তারিত ও উপস্থিতি' : 'Details & Attendance'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>

        {isScheduled && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRescheduleClick(session)}
              data-testid={`reschedule-btn-${session.id}`}
              className="text-xs font-semibold rounded-xl h-8 px-2.5"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              {dict.scheduling?.reschedule || (isBn ? 'পুনঃনির্ধারণ' : 'Reschedule')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onCancelClick(session)}
              data-testid={`cancel-btn-${session.id}`}
              className="text-xs font-semibold rounded-xl h-8 px-2.5"
            >
              {dict.scheduling?.cancelSession || (isBn ? 'বাতিল' : 'Cancel')}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
