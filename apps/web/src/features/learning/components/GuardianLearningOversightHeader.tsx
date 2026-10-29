'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';

interface GuardianLearningOversightHeaderProps {
  locale: Locale;
  childName?: string;
  activeCourseName?: string;
  attendanceRate?: number | null;
  averageScore?: number | null;
  completedTasksCount?: number;
}

export function GuardianLearningOversightHeader({
  locale,
  childName,
  activeCourseName,
  attendanceRate,
  averageScore,
  completedTasksCount = 0,
}: GuardianLearningOversightHeaderProps) {
  const isBn = locale === 'bn';
  const resolvedChildName = childName || (isBn ? 'আপনার সন্তান' : 'Your Child');
  const resolvedCourseName = activeCourseName || (isBn ? 'চলতি কোর্স' : 'Active Course');

  return (
    <div
      className="bg-card border border-border rounded-xl p-5 sm:p-6 mb-6 text-foreground"
      data-testid="guardian-learning-oversight-header"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Title and context */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold w-fit">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isBn ? 'অভিভাবক একাডেমিক তদারকি' : 'Parental Academic Oversight'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            {resolvedChildName}—{isBn ? 'এর পড়াশোনার অগ্রগতি' : 'Learning Progress'}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
            {isBn
              ? `${resolvedCourseName} কোর্সে আপনার সন্তানের উপস্থিতি, হোমওয়ার্কের খাতা ও শিক্ষকের দেওয়া নম্বর পর্যালোচনা করুন।`
              : `Review attendance logs, homework marks and teacher remarks across active tutoring milestones.`}
          </p>
        </div>

        {/* Child Academic Snapshot Chips */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-center min-w-[96px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {isBn ? 'ক্লাস উপস্থিতি' : 'Attendance'}
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
              {attendanceRate != null ? `${formatLocalizedNumber(attendanceRate, locale)}%` : '—'}
            </span>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-center min-w-[96px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {isBn ? 'গড় নম্বর' : 'Avg Score'}
            </span>
            <span className="text-lg sm:text-xl font-black text-primary">
              {averageScore != null ? `${formatLocalizedNumber(averageScore, locale)}%` : '—'}
            </span>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-center min-w-[96px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {isBn ? 'সম্পন্ন কাজ' : 'Tasks Done'}
            </span>
            <span className="text-lg sm:text-xl font-black text-foreground">
              {formatLocalizedNumber(completedTasksCount, locale)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
