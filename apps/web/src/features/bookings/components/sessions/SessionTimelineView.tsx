'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Sparkles,
  RotateCcw,
  User,
  GraduationCap,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { formatWeekdayDate, formatTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import type { CalendarSessionItem } from '../../types/session.types';
import { SessionStatusBadge } from './sessionStatusBadge';

interface SessionTimelineViewProps {
  locale: Locale;
  sessions: CalendarSessionItem[];
  onRescheduleClick: (session: CalendarSessionItem) => void;
  onCancelClick: (session: CalendarSessionItem) => void;
}

export function SessionTimelineView({
  locale,
  sessions,
  onRescheduleClick,
  onCancelClick,
}: SessionTimelineViewProps) {
  const isBn = locale === 'bn';

  if (sessions.length === 0) return null;

  return (
    <div className="relative pl-6 sm:pl-8 flex flex-col gap-5 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
      {sessions.map((session) => {
        const formattedDate = formatWeekdayDate(session.startsAt, locale);
        const formattedTime = formatTime(session.startsAt, locale);
        const isScheduled = session.status === 'scheduled' || session.status === 'in_progress';

        return (
          <div key={session.id} className="relative group">
            {/* Timeline Node Bullet */}
            <div
              className={`absolute -left-6 sm:-left-8 top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs ${
                session.status === 'in_progress'
                  ? 'bg-emerald-500 border-background text-white animate-pulse'
                  : session.status === 'scheduled'
                    ? 'bg-primary border-background text-primary-foreground'
                    : session.status === 'completed'
                      ? 'bg-muted border-border text-muted-foreground'
                      : 'bg-destructive/10 border-destructive/30 text-destructive'
              }`}
            >
              {session.status === 'completed' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : session.status === 'cancelled' ? (
                <XCircle className="w-3.5 h-3.5" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
            </div>

            {/* Timeline Session Row Card */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-foreground font-medium text-xs border border-border">
                    <Calendar className="w-3 h-3 text-primary" />
                    <span>{formattedDate}</span>
                    <span className="text-muted-foreground">•</span>
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span>{formattedTime}</span>
                  </span>
                  <SessionStatusBadge locale={locale} status={session.status} />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                    {session.subjectName || (isBn ? 'পদার্থবিজ্ঞান ১ম পত্র' : 'Physics Paper 1')}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-primary" />
                      <strong className="text-foreground">{session.tutorName}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>{session.studentName}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                {session.meetingUrl && session.status !== 'cancelled' && (
                  <a
                    href={session.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isBn ? 'ক্লাসে যোগ দিন' : 'Join Classroom'}</span>
                  </a>
                )}

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-semibold"
                >
                  <Link
                    href={withLocale(`/sessions/${session.id}`, locale)}
                    className="flex items-center gap-1"
                  >
                    <span>{isBn ? 'বিস্তারিত' : 'Details'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>

                {isScheduled && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRescheduleClick(session)}
                      className="rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      {isBn ? 'পুনঃনির্ধারণ' : 'Reschedule'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancelClick(session)}
                      className="rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      {isBn ? 'বাতিল' : 'Cancel'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
