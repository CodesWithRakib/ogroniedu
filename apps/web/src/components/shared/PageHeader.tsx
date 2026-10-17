import React from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
  breadcrumbs,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div>
        {breadcrumbs && <div className="mb-2">{breadcrumbs}</div>}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {title}
          </h1>
          {badge && <div>{badge}</div>}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
