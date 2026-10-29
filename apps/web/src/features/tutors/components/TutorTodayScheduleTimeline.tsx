'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  User,
  Sparkles,
} from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import type { SessionItem } from '@/store/services/sessions-api';

interface TutorTodayScheduleTimelineProps {
  locale: Locale;
  sessions?: SessionItem[];
  isLoading?: boolean;
}

export function TutorTodayScheduleTimeline({
  locale,
  sessions = [],
  isLoading,
}: TutorTodayScheduleTimelineProps) {
  const isBn = locale === 'bn';

  return (
    <div
      className="bg-card border border-border rounded-xl p-5 sm:p-6 flex flex-col justify-between"
      data-testid="tutor-today-timeline"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {isBn ? 'দৈনিক পাঠদান সময়সূচি' : 'Daily Class Schedule'}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              {isBn ? 'আজকের ক্লাস টাইমলাইন' : "Today's Teaching Timeline"}
            </h3>
          </div>
        </div>

        <Link
          href={withLocale('/dashboard/tutor/sessions', locale)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>{isBn ? 'পূর্ণ ক্যালেন্ডার' : 'Full Calendar'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Timeline items */}
      <div className="mt-4 flex-1">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted/40 border border-border mx-auto flex items-center justify-center text-muted-foreground mb-3">
              <Calendar className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold text-foreground">
              {isBn ? 'আজকের জন্য কোনো ক্লাস নির্ধারিত নেই' : 'No classes scheduled for today'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
              {isBn
                ? 'শিক্ষার্থী বা অভিভাবকদের কাছ থেকে আগত নতুন টিউশন অনুরোধ পর্যালোচনা করুন।'
                : 'Review incoming tuition requests or schedule next week slots in your calendar.'}
            </p>
            <Link
              href={withLocale('/dashboard/tutor/requests', locale)}
              className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-colors"
            >
              <span>{isBn ? 'অনুরোধ ইনবক্স' : 'Check Requests'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.slice(0, 3).map((session, idx) => {
              const isLive = session.status === 'in_progress';
              const isCompleted = session.status === 'completed';

              return (
                <div
                  key={session.id || idx}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isLive
                      ? 'bg-primary-soft/40 border-primary/30'
                      : isCompleted
                        ? 'bg-muted/10 border-border opacity-70'
                        : 'bg-muted/20 border-border hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-surface border border-border/80 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
                          {session.subjectName || (isBn ? 'সাধারণ পাঠদান' : 'Class Session')}
                        </span>
                        {isLive && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold animate-pulse">
                            {isBn ? 'লাইভ চলছে' : 'Live Now'}
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 text-[10px] font-bold">
                            {isBn ? 'সম্পন্ন' : 'Completed'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1 truncate">
                          <User className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span>{session.studentName || (isBn ? 'শিক্ষার্থী' : 'Student')}</span>
                        </span>
                        <span>•</span>
                        <span className="truncate">
                          {session.startsAt ? formatDateTime(session.startsAt, locale) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {session.meetingUrl ? (
                      <a
                        href={session.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-colors"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>{isBn ? 'ক্লাস শুরু' : 'Launch Class'}</span>
                        <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                      </a>
                    ) : (
                      <Link
                        href={withLocale('/dashboard/tutor/sessions', locale)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-muted/40 border border-border text-foreground font-semibold text-xs"
                      >
                        <span>{isBn ? 'বিস্তারিত' : 'View Slot'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3.5 border-t border-border flex items-center justify-between text-xs">
        <span className="text-[11px] text-muted-foreground">
          {isBn
            ? 'সেশন শেষ হলে ক্লাসরুম থেকে মার্ক করুন'
            : 'Record attendance after class completes'}
        </span>
        <Link
          href={withLocale('/dashboard/tutor/sessions', locale)}
          className="font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>{isBn ? 'শিডিউল দেখুন' : 'Manage Slots'}</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
