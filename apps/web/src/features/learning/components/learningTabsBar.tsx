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
    <div className="flex border-b border-border space-x-2">
      {tabs.map(({ key, label, count, Icon }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`pb-3 px-4 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 -mb-px ${
            activeTab === key
              ? 'border-primary/40 text-primary  '
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
            {formatLocalizedNumber(count, locale)}
          </span>
        </button>
      ))}
    </div>
  );
}
