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
  CheckCircle2,
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
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 border border-indigo-900/40">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>
                {isBn
                  ? `${formatLocalizedNumber(streakDays, locale)} দিনের সক্রিয় স্টাডি স্ট্রিক 🔥`
                  : `${streakDays}-day learning streak 🔥`}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {isBn ? 'আজকের জন্য কোনো ক্লাস নির্ধারিত নেই' : 'No classes scheduled for today'}
            </h2>
            <p className="text-sm text-indigo-100/80 leading-relaxed">
              {isBn
                ? 'আপনার স্টাডি রুমে আজকের অধ্যায় নোট রিভিশন দিন বা আসন্ন পরীক্ষার প্রস্তুতির জন্য শিক্ষকের সাথে নতুন সেশন শিডিউল করুন।'
                : 'Review your revision notes in the Study Room or schedule a session with your verified tutor to stay ahead.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href={withLocale('/dashboard/student/learning', locale)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs backdrop-blur-xs transition-all"
            >
              <BookOpen className="w-4 h-4 text-indigo-300" />
              <span>{isBn ? 'স্টাডি রুমে যান' : 'Open Study Room'}</span>
            </Link>
            <Link
              href={withLocale('/tutors', locale)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isBn ? 'নতুন শিক্ষক খুঁজুন' : 'Browse Tutors'}</span>
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
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-7 border border-indigo-900/50"
      data-testid="student-next-class-hero"
    >
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 -mb-20 w-60 h-60 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left side: Class metadata & tutor */}
        <div className="flex flex-col gap-3.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/25 border border-red-500/40 text-red-300 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                {isBn ? 'ক্লাস চলছে (Live)' : 'Live In Progress'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/25 border border-blue-400/40 text-blue-200 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-blue-300" />
                {isBn ? 'পরবর্তী আসন্ন ক্লাস' : 'Next Scheduled Session'}
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-[11px] font-medium border border-white/10">
              {isOnline ? (
                <>
                  <Video className="w-3 h-3 text-cyan-300" />
                  <span>{isBn ? 'অনলাইন লাইভ ক্লাস' : 'Online Classroom'}</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3 h-3 text-amber-300" />
                  <span>{isBn ? 'হোম টিউটরিং' : 'In-Person Tutoring'}</span>
                </>
              )}
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {nextSession.subjectName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs sm:text-sm text-indigo-100/90 font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-300 shrink-0" />
                <span>{formatDateTime(nextSession.startsAt, locale)}</span>
              </span>
              <span className="text-indigo-400/60">•</span>
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {isBn ? 'শিক্ষক: ' : 'Tutor: '}
                  <strong className="text-white">{nextSession.tutorName}</strong>
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
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm transition-colors"
            >
              <Video className="w-4 h-4 text-primary-foreground" />
              <span>{isBn ? 'ক্লাসরুমে যোগ দিন' : 'Join Classroom Now'}</span>
              <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
            </a>
          ) : (
            <Link
              href={withLocale(`/dashboard/student/sessions`, locale)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm transition-colors"
            >
              <Video className="w-4 h-4 text-primary-foreground" />
              <span>{isBn ? 'ক্লাস লিংক ও রুম দেখুন' : 'Enter Study Room'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <Link
            href={withLocale('/dashboard/student/sessions', locale)}
            className="text-xs text-indigo-200/80 hover:text-white transition-colors text-center lg:text-right font-medium hover:underline py-1"
          >
            {isBn ? 'পূর্ণ ক্লাস শিডিউল দেখুন →' : 'View Full Schedule →'}
          </Link>
        </div>
      </div>
    </div>
  );
}
