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
        'group relative flex flex-col justify-between rounded-3xl p-5 sm:p-6 transition-all duration-200 select-none overflow-hidden',
        isHero
          ? 'bg-gradient-to-br from-primary via-primary/95 to-primary-hover text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5'
          : 'bg-card border border-border/70 text-card-foreground shadow-xs hover:shadow-md hover:border-border hover:-translate-y-0.5',
      )}
    >
      {/* Decorative ambient glow for hero card */}
      {isHero && (
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      )}

      {/* Top row: Title + Action Arrow Button */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <Icon
              className={cn(
                'h-4 w-4 shrink-0',
                isHero ? 'text-primary-foreground/90' : 'text-primary',
              )}
            />
          )}
          <span
            className={cn(
              'text-xs sm:text-sm font-semibold truncate',
              isHero ? 'text-primary-foreground/90' : 'text-muted-foreground',
            )}
          >
            {title}
          </span>
        </div>

        <div
          className={cn(
            'h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 group-hover:scale-105',
            isHero
              ? 'bg-white/20 text-primary-foreground group-hover:bg-white/30 backdrop-blur-xs'
              : 'border border-border/80 bg-surface/75 text-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary shadow-2xs',
          )}
        >
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>

      {/* Center: Stat value */}
      <div className="my-4 relative z-10">
        <p
          className={cn(
            'text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-sans leading-none',
            isHero ? 'text-primary-foreground' : 'text-foreground',
          )}
        >
          {value}
        </p>
      </div>

      {/* Bottom: Trend / Status badge */}
      {changeText && (
        <div className="relative z-10">
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold w-fit tracking-tight',
              isHero
                ? 'bg-white/15 text-white/95 border border-white/20 backdrop-blur-xs'
                : 'bg-surface border border-border/80 text-muted-foreground',
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
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-3xl"
      >
        {content}
      </Link>
    );
  }

  return content;
}
