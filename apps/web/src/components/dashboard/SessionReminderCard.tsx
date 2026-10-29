'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Clock, Video, ArrowRight, Sparkles } from 'lucide-react';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

export interface SessionReminderCardProps {
  locale: Locale;
  title?: string;
  tutorName?: string;
  timeRange?: string;
  roomUrl?: string;
  hasUpcoming?: boolean;
  scheduleHref?: string;
}

export function SessionReminderCard({
  locale,
  title,
  tutorName,
  timeRange,
  roomUrl,
  scheduleHref,
}: SessionReminderCardProps) {
  const isBn = locale === 'bn';

  const sessionTitle =
    title ?? (isBn ? 'পদার্থবিজ্ঞান ও উচ্চতর গণিত' : 'Physics & Higher Math Live Class');
  const tutor = tutorName ?? (isBn ? 'শিক্ষক: রাহাত মাহমুদ' : 'Tutor: Rahat Mahmud');
  const time = timeRange ?? (isBn ? 'আজ বিকাল ০৪:০০ - ০৫:৩০' : 'Today 04:00 PM - 05:30 PM');

  const fallbackScheduleHref = scheduleHref || withLocale('/dashboard/student/sessions', locale);

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between select-none">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {isBn ? 'রিমাইন্ডার ও লাইভ ক্লাস' : 'Reminders & Live Class'}
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-3 w-3" />
            <span>{isBn ? 'আসন্ন সেশন' : 'Next Up'}</span>
          </span>
        </div>

        <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
          {sessionTitle}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{tutor}</p>

        {/* Time metadata pill */}
        <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{time}</span>
        </div>
      </div>

      {/* Action CTA Pill Button */}
      <div className="mt-6 pt-2">
        {roomUrl ? (
          <a
            href={roomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm py-2.5 px-4 transition-all"
          >
            <Video className="h-4 w-4" />
            <span>{isBn ? 'লাইভ ক্লাসে যোগ দিন' : 'Start / Join Meeting'}</span>
          </a>
        ) : (
          <Link
            href={fallbackScheduleHref}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-surface text-foreground font-semibold text-xs sm:text-sm py-2.5 px-4 transition-all"
          >
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{isBn ? 'ক্লাস শিডিউল দেখুন' : 'View Session Schedule'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
