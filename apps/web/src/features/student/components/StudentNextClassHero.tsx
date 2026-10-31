'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Video,
  ArrowRight,
  ExternalLink,
  Flame,
  BookOpen,
  MapPin,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import type { CalendarSessionItem } from '@/features/bookings/types/session.types';

interface StudentNextClassHeroProps {
  locale: Locale;
  nextSession: CalendarSessionItem | null;
  streakDays?: number;
  isLoading?: boolean;
}

export function StudentNextClassHero({
  locale,
  nextSession,
  streakDays = 5,
  isLoading,
}: StudentNextClassHeroProps) {
  const isBn = locale === 'bn';

  if (isLoading) {
    return (
      <div className="w-full h-44 rounded-xl bg-muted/30 border border-border animate-pulse flex items-center justify-center">
        <div className="h-6 w-32 bg-muted rounded-full" />
      </div>
    );
  }

  if (!nextSession) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-card text-foreground p-6 sm:p-8 border border-border shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold w-fit">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {isBn
                  ? `${formatLocalizedNumber(streakDays, locale)} দিনের সক্রিয় স্টাডি স্ট্রিক`
                  : `${streakDays}-day learning streak`}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {isBn ? 'আজকের জন্য কোনো ক্লাস নির্ধারিত নেই' : 'No classes scheduled for today'}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isBn
                ? 'আপনার স্টাডি রুমে আজকের অধ্যায় নোট রিভিশন দিন বা আসন্ন পরীক্ষার প্রস্তুতির জন্য শিক্ষকের সাথে নতুন সেশন শিডিউল করুন।'
                : 'Review your revision notes in the Study Room or schedule a session with your verified tutor to stay ahead.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href={withLocale('/dashboard/student/learning', locale)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border font-semibold text-xs transition-colors"
            >
              <BookOpen className="w-4 h-4 text-primary" />
              <span>{isBn ? 'স্টাডি রুমে যান' : 'Open Study Room'}</span>
            </Link>
            <Link
              href={withLocale('/dashboard/student/sessions', locale)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isBn ? 'ক্লাস রুটিন দেখুন' : 'View Schedule'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isLive = nextSession.status === 'in_progress';
  const isOnline = Boolean(nextSession.meetingUrl) || !nextSession.locationInstructions;

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-card text-foreground p-6 sm:p-7 border border-border shadow-xs"
      data-testid="student-next-class-hero"
    >
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left side: Class metadata & tutor */}
        <div className="flex flex-col gap-3.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/15 border border-destructive/30 text-destructive text-xs font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-destructive" />
                {isBn ? 'ক্লাস চলছে (Live)' : 'Live In Progress'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {isBn ? 'পরবর্তী আসন্ন ক্লাস' : 'Next Scheduled Session'}
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium border border-border">
              {isOnline ? (
                <>
                  <Video className="w-3 h-3 text-primary" />
                  <span>{isBn ? 'অনলাইন লাইভ ক্লাস' : 'Online Classroom'}</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3 h-3 text-amber-600" />
                  <span>{isBn ? 'হোম টিউটরিং' : 'In-Person Tutoring'}</span>
                </>
              )}
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {nextSession.subjectName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs sm:text-sm text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <span>{formatDateTime(nextSession.startsAt, locale)}</span>
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {isBn ? 'শিক্ষক: ' : 'Tutor: '}
                  <strong className="text-foreground">{nextSession.tutorName}</strong>
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Direct Join CTA and link */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
          {nextSession.meetingUrl ? (
            <a
              href={nextSession.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm transition-colors"
            >
              <Video className="w-4 h-4 text-primary-foreground" />
              <span>{isBn ? 'ক্লাসরুমে যোগ দিন' : 'Join Classroom Now'}</span>
              <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
            </a>
          ) : (
            <Link
              href={withLocale(`/dashboard/student/sessions`, locale)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm transition-colors"
            >
              <Video className="w-4 h-4 text-primary-foreground" />
              <span>{isBn ? 'ক্লাস লিংক ও রুম দেখুন' : 'Enter Study Room'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <Link
            href={withLocale('/dashboard/student/sessions', locale)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center lg:text-right font-medium hover:underline py-1"
          >
            {isBn ? 'পূর্ণ ক্লাস শিডিউল দেখুন →' : 'View Full Schedule →'}
          </Link>
        </div>
      </div>
    </div>
  );
}
