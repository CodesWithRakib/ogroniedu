'use client';

import { Badge } from '@/components/ui';
import { CheckCircle2, Clock, XCircle, RotateCcw, AlertCircle } from 'lucide-react';
import { getDictionary, type Locale } from '@/lib/i18n';
import type { SessionItemStatus } from '../../types/session.types';

/** Status badge for a session card (display-only). */
export function SessionStatusBadge({
  locale,
  status,
}: {
  locale: Locale;
  status: SessionItemStatus;
}) {
  const dict = getDictionary(locale);
  switch (status) {
    case 'scheduled':
      return (
        <Badge variant="success" className="gap-1.5">
          <CheckCircle2 className="w-3 h-3" />
          {dict.scheduling?.statusScheduled || 'Scheduled'}
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="info" className="gap-1.5 animate-pulse">
          <Clock className="w-3 h-3" />
          {dict.scheduling?.statusInProgress || 'In Progress'}
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="completed" className="gap-1.5">
          <CheckCircle2 className="w-3 h-3" />
          {dict.scheduling?.statusCompleted || 'Completed'}
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="cancelled" className="gap-1.5">
          <XCircle className="w-3 h-3" />
          {dict.scheduling?.statusCancelled || 'Cancelled'}
        </Badge>
      );
    case 'no_show':
      return (
        <Badge variant="destructive" className="gap-1.5">
          <AlertCircle className="w-3 h-3" />
          {locale === 'bn' ? 'অনুপস্থিত (No-show)' : 'No Show'}
        </Badge>
      );
    case 'reschedule_pending':
      return (
        <Badge variant="pending" className="gap-1.5">
          <RotateCcw className="w-3 h-3" />
          {dict.scheduling?.statusReschedulePending || 'Reschedule Pending'}
        </Badge>
      );
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}
