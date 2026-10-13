'use client';

import React from 'react';
import Link from 'next/link';
import { Video, Clock, Calendar, ArrowRight } from 'lucide-react';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

export interface SessionReminderCardProps {
  locale: Locale;
  title?: string;
  tutorName?: string;
  timeRange?: string;
  roomUrl?: string;
  hasUpcoming?: boolean;
}

export function SessionReminderCard({
  locale,
  title,
  tutorName,
  timeRange,
  roomUrl,
  hasUpcoming = true,
}: SessionReminderCardProps) {
  const isBn = locale === 'bn';

  const sessionTitle = title ?? (isBn ? 'পদার্থবিজ্ঞান ও উচ্চতর গণিত' : 'Physics & Higher Math Live Class');
  const tutor = tutorName ?? (isBn ? 'শিক্ষক: রাহাত মাহমুদ' : 'Tutor: Rahat Mahmud');
  const time = timeRange ?? (isBn ? 'আজ বিকাল ০৪:০০ - ০৫:৩০' : 'Today 04:00 PM - 05:30 PM');

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between select-none">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {isBn ? 'রিমাইন্ডার ও লাইভ ক্লাস' : 'Reminders & Live Class'}
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {isBn ? 'আসন্ন ক্লাস' : 'Upcoming'}
          </span>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-snug">
          {sessionTitle}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{tutor}</p>

        {/* Time metadata pill */}
        <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border/80 text-xs font-semibold text-foreground">
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
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs sm:text-sm py-3 px-4 shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Video className="h-4 w-4" />
            <span>{isBn ? 'লাইভ ক্লাসে যোগ দিন' : 'Start / Join Meeting'}</span>
          </a>
        ) : (
          <Link
            href={withLocale('/sessions', locale)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs sm:text-sm py-3 px-4 shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Calendar className="h-4 w-4" />
            <span>{isBn ? 'ক্লাস শিডিউল দেখুন' : 'View Session Schedule'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
