'use client';

import React from 'react';
import {
  GraduationCap,
  Plus,
  BookOpen,
  Edit3,
  CalendarCheck,
  CheckCircle2,
  Users,
  Sparkles,
} from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { Button } from '@/components/ui/Button';

interface TutorStudioDeskHeaderProps {
  locale: Locale;
  activeCourseName?: string;
  enrolledStudentsCount?: number;
  pendingGradingCount?: number;
  attendanceRate?: number;
  onCreateAssignmentClick?: () => void;
  showCreateForm?: boolean;
}

export function TutorStudioDeskHeader({
  locale,
  activeCourseName = 'উচ্চতর গণিত ও পদার্থবিজ্ঞান',
  enrolledStudentsCount = 4,
  pendingGradingCount = 2,
  attendanceRate = 96,
  onCreateAssignmentClick,
  showCreateForm = false,
}: TutorStudioDeskHeaderProps) {
  const isBn = locale === 'bn';

  return (
    <div
      className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs mb-6"
      data-testid="tutor-studio-desk-header"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Title and context */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft border border-primary/25 text-primary text-xs font-bold">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{isBn ? 'টিচিং স্টুডিও ও ক্লাসরুম' : 'Teaching Studio Desk'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            {isBn ? 'পাঠদান পরিকল্পনা, উপস্থিতি ও মূল্যায়ন' : 'Class Evaluation & Course Desk'}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
            {isBn
              ? `${activeCourseName} কোর্সের শিক্ষার্থীদের ক্লাসের উপস্থিতি সংরক্ষণ করুন, নতুন হোমওয়ার্ক দিন ও জমা দেওয়া খাতা মূল্যায়ন করুন।`
              : `Manage lessons, mark student attendance, publish homework, and review submitted assignments.`}
          </p>
        </div>

        {/* Quick KPI Strip & New Assignment CTA */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-3.5 py-2 rounded-2xl bg-surface border border-border/80 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {isBn ? 'মূল্যায়ন অপেক্ষমান' : 'To Grade'}
            </span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400">
              {formatLocalizedNumber(pendingGradingCount, locale)}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-2xl bg-surface border border-border/80 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {isBn ? 'উপস্থিতির হার' : 'Attendance'}
            </span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatLocalizedNumber(attendanceRate, locale)}%
            </span>
          </div>

          {onCreateAssignmentClick && (
            <Button
              onClick={onCreateAssignmentClick}
              size="sm"
              className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 h-11 px-4 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>
                {showCreateForm
                  ? isBn
                    ? 'ফর্ম বন্ধ করুন'
                    : 'Close Form'
                  : isBn
                    ? 'নতুন অ্যাসাইনমেন্ট দিন'
                    : 'Create Homework'}
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
