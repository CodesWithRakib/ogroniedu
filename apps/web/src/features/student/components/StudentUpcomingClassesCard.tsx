'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Video,
  ArrowRight,
  ExternalLink,
  BookOpen,
  UserCheck,
} from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import type { CalendarSessionItem } from '@/features/bookings/types/session.types';
import type { Locale } from '@/lib/i18n';

interface StudentUpcomingClassesCardProps {
  locale: Locale;
  sessions: CalendarSessionItem[];
  isLoading?: boolean;
}

export function StudentUpcomingClassesCard({
  locale,
  sessions,
  isLoading,
}: StudentUpcomingClassesCardProps) {
  const isBn = locale === 'bn';

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {isBn ? 'লাইভ শিডিউল' : 'Class Schedule'}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              {isBn ? 'আসন্ন লাইভ ক্লাস' : 'Upcoming Classes'}
            </h3>
          </div>
        </div>

        <Link
          href={withLocale('/dashboard/student/sessions', locale)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>{isBn ? 'সব দেখুন' : 'Full Schedule'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Body */}
      <div className="mt-4 flex-1">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted/40 border border-border/60 mx-auto flex items-center justify-center text-muted-foreground mb-3">
              <Calendar className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold text-foreground">
              {isBn ? 'কোনো আসন্ন ক্লাস নেই' : 'No upcoming classes scheduled'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
              {isBn
                ? 'আপনার পছন্দের শিক্ষকের সাথে সময় নির্ধারণ করে ক্লাসের শিডিউল তৈরি করুন।'
                : 'Book a session or wait for your tutor to schedule your next learning slot.'}
            </p>
            <Link
              href={withLocale('/tutors', locale)}
              className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary-hover transition-colors"
            >
              <span>{isBn ? 'শিক্ষক খুঁজুন' : 'Find Tutors'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3" data-testid="student-upcoming-sessions-list">
            {sessions.slice(0, 3).map((s) => {
              const isLive = s.status === 'in_progress';
              return (
                <div
                  key={s.id}
                  className={`p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isLive
                      ? 'bg-primary-soft/40 border-primary/30'
                      : 'bg-muted/20 border-border/60 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                        isLive
                          ? 'bg-success-soft text-success-soft-foreground border border-success/30 animate-pulse'
                          : 'bg-primary-soft text-primary'
                      }`}
                    >
                      {isLive ? <Video className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {s.subjectName}
                        </h4>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                            isLive
                              ? 'bg-success-soft text-success-soft-foreground border-success/30'
                              : 'bg-primary-soft text-primary border-primary/20'
                          }`}
                        >
                          {isLive
                            ? isBn
                              ? '🔴 লাইভ ক্লাস চলছে'
                              : '🔴 Live Now'
                            : isBn
                              ? 'শিডিউলড'
                              : 'Scheduled'}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                          <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{s.tutorName}</span>
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{formatDateTime(s.startsAt, locale)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {s.meetingUrl ? (
                      <a
                        href={s.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs shadow-xs transition-colors"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>{isBn ? 'ক্লাসে যোগ দিন' : 'Join Class'}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <Link
                        href={withLocale('/dashboard/student/learning', locale)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-surface text-foreground font-semibold text-xs transition-colors"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        <span>{isBn ? 'স্টাডি রুম' : 'Study Room'}</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
