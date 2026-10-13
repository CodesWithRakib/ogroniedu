import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Inbox } from 'lucide-react';
import Link from 'next/link';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function EmptyState({ icon, title, description, action, actionLabel, actionHref, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={twMerge(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center bg-card/40 backdrop-blur-xs',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-muted-foreground ring-1 ring-border/50 shadow-xs">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? (
        <div className="mt-5">{action}</div>
      ) : actionLabel && actionHref ? (
        <div className="mt-5">
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary-hover transition-colors"
          >
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
