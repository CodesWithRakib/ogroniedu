'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle2, TrendingUp, Sparkles, ArrowRight, Award } from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';

export interface SubjectMasteryItem {
  id: string;
  nameBn: string;
  nameEn: string;
  progressPercent: number; // 0 - 100
  completedChapters: number;
  totalChapters: number;
  colorClass: string;
  accentClass: string;
}

const DEFAULT_SUBJECTS: SubjectMasteryItem[] = [
  {
    id: 'subj-1',
    nameBn: 'উচ্চতর গণিত',
    nameEn: 'Higher Mathematics',
    progressPercent: 85,
    completedChapters: 17,
    totalChapters: 20,
    colorClass: 'from-blue-600 to-indigo-600',
    accentClass: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
  },
  {
    id: 'subj-2',
    nameBn: 'পদার্থবিজ্ঞান',
    nameEn: 'Physics',
    progressPercent: 72,
    completedChapters: 13,
    totalChapters: 18,
    colorClass: 'from-indigo-600 to-purple-600',
    accentClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
  },
  {
    id: 'subj-3',
    nameBn: 'রসায়ন',
    nameEn: 'Chemistry',
    progressPercent: 88,
    completedChapters: 15,
    totalChapters: 17,
    colorClass: 'from-emerald-600 to-teal-600',
    accentClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  },
  {
    id: 'subj-4',
    nameBn: 'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)',
    nameEn: 'ICT',
    progressPercent: 60,
    completedChapters: 6,
    totalChapters: 10,
    colorClass: 'from-amber-500 to-orange-500',
    accentClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  },
];

interface StudentSubjectMasteryCardProps {
  locale: Locale;
  subjects?: SubjectMasteryItem[];
  averageScore?: number | null;
}

export function StudentSubjectMasteryCard({
  locale,
  subjects = DEFAULT_SUBJECTS,
  averageScore = 82,
}: StudentSubjectMasteryCardProps) {
  const isBn = locale === 'bn';

  const overallProgress = Math.round(
    subjects.reduce((sum, s) => sum + s.progressPercent, 0) / (subjects.length || 1),
  );

  return (
    <div
      className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between"
      data-testid="student-subject-mastery-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {isBn ? 'পাঠ্যক্রম ট্র্যাকার' : 'Syllabus Tracker'}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              {isBn ? 'বিষয়ভিত্তিক সিলেবাস অগ্রগতি' : 'Subject Mastery Matrix'}
            </h3>
          </div>
        </div>

        <Link
          href={withLocale('/dashboard/student/learning', locale)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>{isBn ? 'স্টাডি হাব' : 'Learning Hub'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Progress Summary Ring & Stats */}
      <div className="my-4 p-4 rounded-xl bg-surface border border-border/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Radial progress ring */}
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-border"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-blue-600 transition-all duration-1000 ease-out"
                strokeDasharray={`${overallProgress}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black text-foreground">
                {formatLocalizedNumber(overallProgress, locale)}%
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-foreground">
              {isBn ? 'সামগ্রিক সিলেবাস কভারেজ' : 'Total Syllabus Covered'}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {isBn
                ? `${formatLocalizedNumber(subjects.length, locale)}টি বিষয়ের সক্রিয় অধ্যায়ন অগ্রগতি`
                : `${subjects.length} enrolled subjects tracked`}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            <Award className="w-3.5 h-3.5" />
            <span>
              {isBn
                ? `গড় নম্বর: ${formatLocalizedNumber(averageScore ?? 85, locale)}%`
                : `Avg: ${averageScore ?? 85}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Subject rows */}
      <div className="flex flex-col gap-3.5">
        {subjects.map((subj) => (
          <div key={subj.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                {isBn ? subj.nameBn : subj.nameEn}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-[11px]">
                  {isBn
                    ? `${formatLocalizedNumber(subj.completedChapters, locale)}/${formatLocalizedNumber(subj.totalChapters, locale)} অধ্যায়`
                    : `${subj.completedChapters}/${subj.totalChapters} ch.`}
                </span>
                <span className="font-bold text-foreground">
                  {formatLocalizedNumber(subj.progressPercent, locale)}%
                </span>
              </div>
            </div>

            {/* Visual gradient progress bar */}
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${subj.colorClass} transition-all duration-500`}
                style={{ width: `${subj.progressPercent}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer action */}
      <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-between text-xs">
        <span className="text-[11px] text-muted-foreground">
          {isBn ? 'সাপ্তাহিক হোমওয়ার্ক ও মূল্যায়ন হালনাগাদ' : 'Weekly assignments & tests updated'}
        </span>
        <Link
          href={withLocale('/dashboard/student/learning', locale)}
          className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
        >
          <span>{isBn ? 'অধ্যায় তালিকা' : 'View Chapters'}</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
