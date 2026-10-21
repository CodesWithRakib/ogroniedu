'use client';

import { BookOpen, CalendarCheck, TrendingUp } from 'lucide-react';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';

export const LEARNING_TABS = ['attendance', 'assignments', 'progress'] as const;
export type LearningTabKey = (typeof LEARNING_TABS)[number];

export function LearningTabsBar({
  locale,
  activeTab,
  attendanceCount,
  assignmentCount,
  reportCount,
  onSelect,
}: {
  locale: Locale;
  activeTab: LearningTabKey;
  attendanceCount: number;
  assignmentCount: number;
  reportCount: number;
  onSelect: (tab: LearningTabKey) => void;
}) {
  const t = getDictionary(locale).learning;

  const tabs = [
    {
      key: 'attendance' as const,
      label: t.tabsAttendance,
      count: attendanceCount,
      Icon: CalendarCheck,
    },
    {
      key: 'assignments' as const,
      label: t.tabsAssignments,
      count: assignmentCount,
      Icon: BookOpen,
    },
    { key: 'progress' as const, label: t.tabsProgress, count: reportCount, Icon: TrendingUp },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-surface border border-border/80">
      {tabs.map(({ key, label, count, Icon }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`px-4 py-2 text-xs sm:text-sm font-bold transition-all rounded-xl flex items-center gap-2 cursor-pointer ${
              isActive
                ? 'bg-card text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <span>{label}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-primary-soft text-primary' : 'bg-muted text-muted-foreground'
              }`}
            >
              {formatLocalizedNumber(count, locale)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
