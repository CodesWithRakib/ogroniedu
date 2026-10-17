'use client';

import React from 'react';
import { Badge, type BadgeProps } from './Badge';
import { cn } from '@/lib/utils';

export type StatusTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'destructive'
  | 'info'
  | 'neutral'
  | 'default'
  | 'primary'
  | 'draft'
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'suspended';

const STATUS_CONFIG: Record<string, { variant: NonNullable<BadgeProps['variant']>; label: string }> = {
  draft: { variant: 'draft', label: 'Draft' },
  pending: { variant: 'pending', label: 'Pending' },
  submitted: { variant: 'info', label: 'Submitted' },
  under_review: { variant: 'info', label: 'Under Review' },
  in_progress: { variant: 'info', label: 'In Progress' },
  needs_information: { variant: 'warning', label: 'Needs Information' },
  reschedule_pending: { variant: 'warning', label: 'Reschedule Pending' },
  active: { variant: 'active', label: 'Active' },
  approved: { variant: 'success', label: 'Approved' },
  verified: { variant: 'success', label: 'Verified' },
  completed: { variant: 'completed', label: 'Completed' },
  paid: { variant: 'completed', label: 'Paid' },
  scheduled: { variant: 'info', label: 'Scheduled' },
  reinstated: { variant: 'success', label: 'Reinstated' },
  suspended: { variant: 'suspended', label: 'Suspended' },
  cancelled: { variant: 'cancelled', label: 'Cancelled' },
  rejected: { variant: 'destructive', label: 'Rejected' },
  expired: { variant: 'destructive', label: 'Expired' },
  disputed: { variant: 'destructive', label: 'Disputed' },
  failed: { variant: 'destructive', label: 'Failed' },
  not_started: { variant: 'default', label: 'Not Started' },
};

const TONE_MAP: Record<string, NonNullable<BadgeProps['variant']>> = {
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
  destructive: 'destructive',
  info: 'info',
  neutral: 'default',
  default: 'default',
  primary: 'primary',
  draft: 'draft',
  pending: 'pending',
  active: 'active',
  completed: 'completed',
  cancelled: 'cancelled',
  suspended: 'suspended',
};

export interface StatusBadgeProps {
  status?: string;
  tone?: StatusTone;
  children?: React.ReactNode;
  dot?: boolean;
  size?: 'sm' | 'md' | 'lg';
  testId?: string;
  className?: string;
}

/**
 * Centralized StatusBadge component.
 * Automatically formats status labels and applies unified soft-pastel pill styling.
 */
export function StatusBadge({
  status,
  tone,
  children,
  dot,
  size = 'md',
  testId,
  className,
}: StatusBadgeProps) {
  const normalizedKey = (status || '').toLowerCase().trim();
  const config = STATUS_CONFIG[normalizedKey];

  // Resolve variant from tone, status config, or fallback
  const resolvedVariant: NonNullable<BadgeProps['variant']> = tone
    ? TONE_MAP[tone] || 'default'
    : config?.variant || 'default';

  // Determine display label
  const displayLabel = children ?? (config?.label || status || 'Unknown');

  return (
    <Badge
      variant={resolvedVariant}
      size={size}
      dot={dot}
      data-testid={testId}
      className={cn('capitalize whitespace-nowrap', className)}
    >
      {displayLabel}
    </Badge>
  );
}
