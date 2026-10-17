import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const TONE_CLASS: Record<string, string> = {
  success: 'bg-primary/15 text-success-soft-foreground border-primary/40 ',
  warning: 'bg-warning/15 text-warning border-warning/40 ',
  danger: 'bg-destructive/15 text-destructive border-destructive/40 ',
  info: 'bg-interactive/15 text-interactive border-interactive/40 ',
  neutral: 'bg-muted/15 text-muted-foreground border-border ',
  violet: 'bg-interactive/15 text-interactive border-interactive/30 ',
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
    <Badge
      variant="outline"
      data-testid={testId}
      className={cn('border font-medium', TONE_CLASS[tone])}
    >
      {children}
    </Badge>
  );
}
