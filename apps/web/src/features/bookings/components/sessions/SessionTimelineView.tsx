'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Video,
  Sparkles,
  RotateCcw,
  User,
  GraduationCap,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
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
    <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/80">
      {sessions.map((session, idx) => {
        const formattedDate = formatWeekdayDate(session.startsAt, locale);
        const formattedTime = formatTime(session.startsAt, locale);
        const isScheduled = session.status === 'scheduled' || session.status === 'in_progress';

        return (
          <div key={session.id} className="relative group">
            {/* Timeline Node Bullet */}
            <div
              className={`absolute -left-6 sm:-left-8 top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs ${
                session.status === 'in_progress'
                  ? 'bg-emerald-500 border-white text-white animate-pulse'
                  : session.status === 'scheduled'
                    ? 'bg-blue-600 border-white text-white'
                    : session.status === 'completed'
                      ? 'bg-slate-200 border-slate-300 text-slate-700'
                      : 'bg-rose-100 border-rose-300 text-rose-600'
              }`}
            >
              {session.status === 'completed' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
              ) : session.status === 'cancelled' ? (
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
              ) : (
                <Clock className="w-3 h-3 text-white" />
              )}
            </div>

            {/* Timeline Session Row Card */}
            <div className="rounded-2xl sm:rounded-3xl border border-border/80 bg-card/90 backdrop-blur-sm p-4 sm:p-6 hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft text-primary font-bold text-xs border border-primary/20">
                    <Calendar className="w-3 h-3" />
                    <span>{formattedDate}</span>
                    <span className="text-muted-foreground/60">•</span>
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span>{formattedTime}</span>
                  </span>
                  <SessionStatusBadge locale={locale} status={session.status} />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                    {session.subjectName || (isBn ? 'পদার্থবিজ্ঞান ১ম পত্র' : 'Physics Paper 1')}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-primary" />
                      <strong className="text-foreground">{session.tutorName}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{session.studentName}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/70">
                {session.meetingUrl && session.status !== 'cancelled' && (
                  <a
                    href={session.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs shadow-blue-500/25 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isBn ? 'ক্লাসে প্রবেশ' : 'Join Classroom'}</span>
                  </a>
                )}

                <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold">
                  <Link href={withLocale(`/sessions/${session.id}`, locale)} className="flex items-center gap-1">
                    <span>{isBn ? 'বিবরণ' : 'Details'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>

                {isScheduled && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRescheduleClick(session)}
                      className="rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      {isBn ? 'রিশিডিউল' : 'Reschedule'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancelClick(session)}
                      className="rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10"
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
