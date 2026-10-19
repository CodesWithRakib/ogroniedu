'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HeroKpiCardProps {
  title: string;
  value: string | number;
  changeText?: string;
  variant?: 'hero' | 'secondary';
  href?: string;
  testId?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function HeroKpiCard({
  title,
  value,
  changeText,
  variant = 'secondary',
  href,
  testId,
  icon: Icon,
}: HeroKpiCardProps) {
  const isHero = variant === 'hero';
  const valString = String(value ?? '');
  // Long strings (like "অনুমোদিত", "যাচাইধীন", "Under Review") should use compact font-size
  const isLongText = valString.length > 5;

  const content = (
    <div
      data-testid={testId}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl p-5 sm:p-6 transition-all duration-200 select-none bg-card border border-border/80 hover:shadow-sm hover:border-primary/40 hover:-translate-y-0.5',
        isHero &&
          'border-primary/30 bg-gradient-to-b from-primary-soft/40 via-card to-card shadow-xs hover:border-primary/50',
      )}
    >
      {/* Top row: Title + Icon + Arrow indicator */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div
              className={cn(
                'h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                isHero
                  ? 'bg-primary-soft text-primary shadow-xs'
                  : 'bg-surface text-muted-foreground group-hover:text-primary group-hover:bg-primary-soft/70',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
          <span className="text-xs sm:text-sm font-semibold text-muted-foreground truncate">
            {title}
          </span>
        </div>

        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-muted-foreground/60 group-hover:text-primary group-hover:bg-primary-soft transition-colors">
          <ArrowUpRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Center: Stat value with intelligent font scaling */}
      <div className="my-3 sm:my-4">
        <p
          className={cn(
            'tracking-tight text-foreground font-sans tabular-nums leading-tight',
            isLongText
              ? 'text-xl sm:text-2xl font-bold'
              : 'text-3xl sm:text-4xl font-extrabold',
          )}
        >
          {value}
        </p>
      </div>

      {/* Bottom: Trend / Status badge */}
      {changeText && (
        <div>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-semibold w-fit tracking-tight px-2.5 py-1 rounded-lg',
              isHero
                ? 'bg-primary-soft text-primary'
                : 'text-muted-foreground bg-surface border border-border/60 group-hover:border-primary/20',
            )}
          >
            <TrendingUp className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{changeText}</span>
          </div>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
      >
        {content}
      </Link>
    );
  }

  return content;
}
