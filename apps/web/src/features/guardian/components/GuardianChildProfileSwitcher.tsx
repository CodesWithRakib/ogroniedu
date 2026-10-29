'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  GraduationCap,
  Plus,
  ArrowRight,
  BookOpen,
  Calendar,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import type { LinkedChild } from '@/store/services/guardians-api';

interface GuardianChildProfileSwitcherProps {
  locale: Locale;
  childrenList: LinkedChild[];
  activeChildId: string | null;
  onSelectChild: (id: string) => void;
}

export function GuardianChildProfileSwitcher({
  locale,
  childrenList,
  activeChildId,
  onSelectChild,
}: GuardianChildProfileSwitcherProps) {
  const isBn = locale === 'bn';

  if (childrenList.length === 0) {
    return (
      <div className="p-4 sm:p-5 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              {isBn ? 'কোনো সন্তান প্রোফাইল যুক্ত নেই' : 'No children profiles linked yet'}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isBn
                ? 'আপনার সন্তানের ফোন নম্বর বা আইডি দিয়ে প্রোফাইল যুক্ত করে পড়ালেখা পর্যবেক্ষণ করুন।'
                : 'Link your child via mobile or ID to track academic milestones and sessions.'}
            </p>
          </div>
        </div>

        <Link
          href={withLocale('/dashboard/guardian/children', locale)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isBn ? 'সন্তান যোগ করুন' : 'Link Child'}</span>
        </Link>
      </div>
    );
  }

  return (
    <div
      className="p-3.5 rounded-xl bg-card border border-border select-none"
      data-testid="guardian-child-switcher"
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
          <GraduationCap className="w-4 h-4 text-primary" />
          {isBn ? 'সন্তানের অ্যাকাউন্টের বিবরণ' : 'Linked Children Portfolio'}
        </span>
        <Link
          href={withLocale('/dashboard/guardian/children', locale)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>{isBn ? 'সব সন্তান পরিচালনা' : 'Manage Children'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {childrenList.map((child) => {
          const isSelected = child.studentId === activeChildId || childrenList.length === 1;
          return (
            <button
              key={child.studentId}
              type="button"
              onClick={() => onSelectChild(child.studentId)}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary/10 text-foreground border border-primary font-bold shadow-xs'
                  : 'bg-card hover:bg-muted/40 border border-border text-muted-foreground'
              }`}
            >
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  isSelected ? 'bg-primary text-white' : 'bg-muted text-foreground'
                }`}
              >
                {child.displayName?.charAt(0) || 'S'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground truncate max-w-[140px]">
                    {child.displayName}
                  </span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {child.educationLevelName || (isBn ? 'এইচএসসি' : 'Class')} •{' '}
                  {child.institutionName || (isBn ? 'কলেজ' : 'Institution')}
                </p>
              </div>
            </button>
          );
        })}

        <Link
          href={withLocale('/dashboard/guardian/children', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface hover:bg-muted/40 border border-dashed border-border/80 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all ml-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isBn ? 'নতুন সন্তান যোগ করুন' : 'Add Child'}</span>
        </Link>
      </div>
    </div>
  );
}
