'use client';

import React from 'react';
import { BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

export interface DayActivity {
  day: string; // e.g. 'S', 'M', 'T', 'W', 'T', 'F', 'S'
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
  { day: 'S', fullDayBn: 'রবিবার', fullDayEn: 'Sunday', percentage: 45, count: 2 },
  { day: 'M', fullDayBn: 'সোমবার', fullDayEn: 'Monday', percentage: 70, count: 4 },
  { day: 'T', fullDayBn: 'মঙ্গলবার', fullDayEn: 'Tuesday', percentage: 88, count: 5, isPeak: true },
  { day: 'W', fullDayBn: 'বুধবার', fullDayEn: 'Wednesday', percentage: 95, count: 6 },
  { day: 'T', fullDayBn: 'বৃহস্পতিবার', fullDayEn: 'Thursday', percentage: 60, count: 3 },
  { day: 'F', fullDayBn: 'শুক্রবার', fullDayEn: 'Friday', percentage: 35, count: 1 },
  { day: 'S', fullDayBn: 'শনিবার', fullDayEn: 'Saturday', percentage: 50, count: 2 },
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
    <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            {heading}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary-soft text-primary-soft-foreground border border-primary/20">
          {isBn ? 'এই সপ্তাহ' : 'This Week'}
        </span>
      </div>

      {/* Bar Chart Container */}
      <div className="h-48 pt-6 pb-2 flex items-end justify-between gap-2 sm:gap-3 px-2">
        {data.map((item, idx) => {
          const heightPercent = Math.max(15, Math.min(100, item.percentage));
          const isHighest = item.isPeak || item.percentage >= 85;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end group relative"
            >
              {/* Tooltip Badge on Hover or Peak */}
              {isHighest && (
                <div className="absolute -top-6 bg-card border border-border shadow-xs text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md pointer-events-none z-10 transition-transform group-hover:scale-110">
                  {item.percentage}%
                </div>
              )}

              {/* Bar Pill */}
              <div
                className="w-full max-w-[32px] rounded-full overflow-hidden transition-all duration-300 relative flex flex-col justify-end"
                style={{ height: `${heightPercent}%` }}
              >
                {isHighest ? (
                  /* Solid active pill bar */
                  <div className="w-full h-full bg-primary rounded-full shadow-xs shadow-primary/20 group-hover:bg-primary-hover transition-colors" />
                ) : (
                  /* Striped / soft pill bar (Donezo pattern style) */
                  <div className="w-full h-full rounded-full bg-surface border border-border/70 flex items-center justify-center overflow-hidden group-hover:border-primary/50 transition-colors">
                    <div
                      className="w-full h-full opacity-35 dark:opacity-20"
                      style={{
                        backgroundImage: `repeating-linear-gradient(45deg, currentColor, currentColor 2px, transparent 2px, transparent 6px)`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Day label */}
              <span
                className={cn(
                  'mt-3 text-xs font-bold transition-colors',
                  isHighest ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                )}
                title={isBn ? item.fullDayBn : item.fullDayEn}
              >
                {item.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
