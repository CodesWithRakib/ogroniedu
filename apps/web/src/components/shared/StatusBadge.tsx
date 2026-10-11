import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const TONE_CLASS: Record<string, string> = {
  success: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300',
  danger: 'bg-rose-500/15 text-rose-600 border-rose-500/30 dark:text-rose-300',
  info: 'bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-300',
  neutral: 'bg-slate-500/15 text-slate-600 border-slate-500/30 dark:text-slate-300',
  violet: 'bg-violet-500/15 text-violet-600 border-violet-500/30 dark:text-violet-300',
};

export function StatusBadge({
  tone = 'neutral',
  children,
  testId,
}: {
  tone?: keyof typeof TONE_CLASS;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <Badge variant="outline" data-testid={testId} className={cn('border font-medium', TONE_CLASS[tone])}>
      {children}
    </Badge>
  );
}
