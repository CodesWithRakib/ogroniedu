import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const TONE_CLASS: Record<string, string> = {
  success: 'bg-success-soft text-success border-success/30',
  warning: 'bg-warning-soft text-warning border-warning/30',
  danger: 'bg-destructive-soft text-destructive border-destructive/30',
  info: 'bg-info-soft text-info border-info/30',
  neutral: 'bg-surface-muted text-muted-foreground border-border/70',
  violet: 'bg-interactive-soft text-interactive border-interactive/30',
};

export function StatusBadge({
  tone = 'neutral',
  children,
  testId,
  className,
}: {
  tone?: keyof typeof TONE_CLASS;
  children: React.ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      data-testid={testId}
      className={cn('border font-medium', TONE_CLASS[tone] || TONE_CLASS.neutral, className)}
    >
      {children}
    </Badge>
  );
}
