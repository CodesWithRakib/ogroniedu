'use client';

import React from 'react';
import { BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';

export interface DayActivity {
  day: string; // fallback e.g. 'S', 'M'
  shortBn?: string; // e.g. 'রবি', 'সোম'
  shortEn?: string; // e.g. 'Sun', 'Mon'
  fullDayBn: string;
  fullDayEn: string;
  percentage: number; // 0 - 100
  count: number;
  isPeak?: boolean;
}

export interface WeeklyActivityChartProps {
  locale: Locale;
  title?: string;
  subtitle?: string;
  data?: DayActivity[];
}

const DEFAULT_DAYS: DayActivity[] = [
  {
    day: 'S',
    shortBn: 'রবি',
    shortEn: 'Sun',
    fullDayBn: 'রবিবার',
    fullDayEn: 'Sunday',
    percentage: 45,
    count: 2,
  },
  {
    day: 'M',
    shortBn: 'সোম',
    shortEn: 'Mon',
    fullDayBn: 'সোমবার',
    fullDayEn: 'Monday',
    percentage: 70,
    count: 4,
  },
  {
    day: 'T',
    shortBn: 'মঙ্গল',
    shortEn: 'Tue',
    fullDayBn: 'মঙ্গলবার',
    fullDayEn: 'Tuesday',
    percentage: 88,
    count: 5,
    isPeak: true,
  },
  {
    day: 'W',
    shortBn: 'বুধ',
    shortEn: 'Wed',
    fullDayBn: 'বুধবার',
    fullDayEn: 'Wednesday',
    percentage: 95,
    count: 6,
  },
  {
    day: 'T',
    shortBn: 'বৃহঃ',
    shortEn: 'Thu',
    fullDayBn: 'বৃহস্পতিবার',
    fullDayEn: 'Thursday',
    percentage: 60,
    count: 3,
  },
  {
    day: 'F',
    shortBn: 'শুক্র',
    shortEn: 'Fri',
    fullDayBn: 'শুক্রবার',
    fullDayEn: 'Friday',
    percentage: 35,
    count: 1,
  },
  {
    day: 'S',
    shortBn: 'শনি',
    shortEn: 'Sat',
    fullDayBn: 'শনিবার',
    fullDayEn: 'Saturday',
    percentage: 50,
    count: 2,
  },
];

export function WeeklyActivityChart({
  locale,
  title,
  subtitle,
  data = DEFAULT_DAYS,
}: WeeklyActivityChartProps) {
  const isBn = locale === 'bn';
  const heading = title ?? (isBn ? 'সাপ্তাহিক স্টাডি অ্যাক্টিভিটি' : 'Weekly Activity');
  const sub =
    subtitle ??
    (isBn ? 'সপ্তাহের দিনগুলোতে ক্লাস ও স্টাডির সময়' : 'Learning and session volume across week');

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between select-none shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            {heading}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary-soft text-primary">
          {isBn ? 'এই সপ্তাহ' : 'This Week'}
        </span>
      </div>

      {/* Bar Chart Container */}
      <div className="h-48 pt-6 pb-2 flex items-end justify-between gap-2 sm:gap-3 px-2">
        {data.map((item, idx) => {
          const heightPercent = Math.max(15, Math.min(100, item.percentage));
          const isHighest = item.isPeak || item.percentage >= 85;
          const displayLabel = isBn ? (item.shortBn ?? item.day) : (item.shortEn ?? item.day);

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end group relative"
            >
              {/* Tooltip Badge on Hover or Peak */}
              {isHighest && (
                <div className="absolute -top-6 bg-card border border-primary/20 shadow-xs text-foreground text-[10px] font-bold px-2 py-0.5 rounded-md pointer-events-none z-10 transition-transform group-hover:scale-110">
                  {formatLocalizedNumber(item.percentage, locale)}%
                </div>
              )}

              {/* Bar Pill */}
              <div
                className="w-full max-w-[32px] rounded-full overflow-hidden transition-all duration-300 relative flex flex-col justify-end"
                style={{ height: `${heightPercent}%` }}
              >
                {isHighest ? (
                  /* Solid active pill bar */
                  <div className="w-full h-full bg-gradient-to-t from-blue-600 to-indigo-600 rounded-full shadow-xs shadow-blue-500/25 transition-all" />
                ) : (
                  /* Soft neutral pill bar */
                  <div className="w-full h-full rounded-full bg-surface-muted group-hover:bg-primary-soft transition-colors" />
                )}
              </div>

              {/* Day label */}
              <span
                className={cn(
                  'mt-3 text-[11px] sm:text-xs font-semibold transition-colors',
                  isHighest
                    ? 'text-primary font-bold'
                    : 'text-muted-foreground group-hover:text-foreground',
                )}
                title={isBn ? item.fullDayBn : item.fullDayEn}
              >
                {displayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
