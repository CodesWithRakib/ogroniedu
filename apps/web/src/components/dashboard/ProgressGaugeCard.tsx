'use client';

import React from 'react';
import { Target } from 'lucide-react';
import type { Locale } from '@/lib/i18n';

export interface ProgressGaugeCardProps {
  locale: Locale;
  percentage?: number;
  title?: string;
  subtitle?: string;
  completedLabel?: string;
  inProgressLabel?: string;
  pendingLabel?: string;
}

export function ProgressGaugeCard({
  locale,
  percentage = 74,
  title,
  subtitle,
  completedLabel,
  inProgressLabel,
  pendingLabel,
}: ProgressGaugeCardProps) {
  const isBn = locale === 'bn';

  const heading = title ?? (isBn ? 'লার্নিং ও কোর্স অগ্রগতি' : 'Course Progress');
  const sub =
    subtitle ?? (isBn ? 'সিলেবাস কভারেজ ও পাঠ পরিকল্পনা' : 'Syllabus coverage & lesson milestones');
  const lblDone = completedLabel ?? (isBn ? 'সম্পন্ন' : 'Completed');
  const lblActive = inProgressLabel ?? (isBn ? 'চলমান' : 'In Progress');
  const lblPending = pendingLabel ?? (isBn ? 'অবশিষ্ট' : 'Pending');

  // Math for semi-circle arc (radius = 70, strokeWidth = 14)
  const radius = 64;
  const circumference = Math.PI * radius; // Half circle circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between select-none">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          {heading}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>

      {/* Semi-Circle SVG Gauge */}
      <div className="flex flex-col items-center justify-center my-3 relative">
        <svg viewBox="0 0 160 90" className="w-48 max-w-full overflow-visible">
          {/* Background Track */}
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            className="stroke-muted/40 dark:stroke-muted/20"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Foreground Progress Arc */}
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            className="stroke-primary transition-all duration-700 ease-out"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        {/* Center Text inside the arc */}
        <div className="absolute bottom-1 flex flex-col items-center">
          <span className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight font-sans leading-none">
            {percentage}%
          </span>
          <span className="text-[11px] text-muted-foreground font-semibold mt-1">{lblDone}</span>
        </div>
      </div>

      {/* Legend Dots (Donezo Style) */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 pt-2 border-t border-border/50 text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
          <span className="text-foreground">{lblDone}</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-500 shrink-0" />
          <span className="text-muted-foreground">{lblActive}</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-border shrink-0" />
          <span className="text-muted-foreground">{lblPending}</span>
        </div>
      </div>
    </div>
  );
}
