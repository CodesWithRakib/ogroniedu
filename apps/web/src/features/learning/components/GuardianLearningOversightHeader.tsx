'use client';

import React from 'react';
import {
  ShieldCheck,
  Award,
  CalendarCheck,
  CheckCircle2,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';

interface GuardianLearningOversightHeaderProps {
  locale: Locale;
  childName?: string;
  activeCourseName?: string;
  attendanceRate?: number;
  averageScore?: number | null;
  completedTasksCount?: number;
}

export function GuardianLearningOversightHeader({
  locale,
  childName = 'আপনার সন্তান',
  activeCourseName = 'উচ্চতর গণিত ও পদার্থবিজ্ঞান',
  attendanceRate = 100,
  averageScore = 88,
  completedTasksCount = 6,
}: GuardianLearningOversightHeaderProps) {
  const isBn = locale === 'bn';

  return (
    <div
      className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs mb-6"
      data-testid="guardian-learning-oversight-header"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Title and context */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isBn ? 'অভিভাবক একাডেমিক তদারকি' : 'Parental Academic Oversight'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            {childName}—{isBn ? 'এর পড়াশোনার অগ্রগতি' : 'Learning Progress'}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
            {isBn
              ? `${activeCourseName} কোর্সে আপনার সন্তানের উপস্থিতি, হোমওয়ার্কের খাতা ও শিক্ষকের দেওয়া নম্বর পর্যালোচনা করুন।`
              : `Review attendance logs, homework marks and teacher remarks across active tutoring milestones.`}
          </p>
        </div>

        {/* Child Academic Snapshot Chips */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-2xl bg-surface border border-border/80 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {isBn ? 'ক্লাস উপস্থিতি' : 'Attendance'}
            </span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {formatLocalizedNumber(attendanceRate, locale)}%
            </span>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-surface border border-border/80 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {isBn ? 'গড় নম্বর' : 'Avg Score'}
            </span>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400">
              {averageScore !== null ? `${formatLocalizedNumber(averageScore, locale)}%` : '—'}
            </span>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-surface border border-border/80 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {isBn ? 'সম্পন্ন হোমওয়ার্ক' : 'Tasks Done'}
            </span>
            <span className="text-xl font-black text-purple-600 dark:text-purple-400">
              {formatLocalizedNumber(completedTasksCount, locale)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
