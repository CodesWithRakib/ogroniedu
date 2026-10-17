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

  const content = (
    <div
      data-testid={testId}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl p-5 sm:p-6 transition-all duration-200 select-none bg-card border border-border/80 shadow-2xs hover:shadow-xs hover:border-border hover:-translate-y-0.5',
        isHero && 'ring-1 ring-primary/20 bg-gradient-to-b from-primary-soft/30 via-card to-card',
      )}
    >
      {/* Top row: Title + Icon + Arrow indicator */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div
              className={cn(
                'h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors',
                isHero
                  ? 'bg-primary-soft border-primary/25 text-primary'
                  : 'bg-surface border-border/70 text-muted-foreground group-hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
          <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
            {title}
          </span>
        </div>

        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-muted-foreground/70 group-hover:text-foreground group-hover:bg-surface-hover transition-colors">
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>

      {/* Center: Stat value */}
      <div className="my-3 sm:my-4">
        <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground font-sans tabular-nums leading-none">
          {value}
        </p>
      </div>

      {/* Bottom: Trend / Status badge */}
      {changeText && (
        <div>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium w-fit tracking-tight border',
              isHero
                ? 'bg-primary-soft text-primary border-primary/25'
                : 'bg-surface text-muted-foreground border-border/70',
            )}
          >
            <TrendingUp className="h-3 w-3 shrink-0" />
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
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
      >
        {content}
      </Link>
    );
  }

  return content;
}
