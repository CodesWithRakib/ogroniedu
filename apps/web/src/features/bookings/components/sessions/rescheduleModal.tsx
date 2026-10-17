'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import type { CalendarSessionItem } from '../../types/session.types';

/** Reschedule dialog: new BST time + reason, delegates persistence to onConfirm. */
export function RescheduleModal({
  locale,
  session,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  locale: Locale;
  session: CalendarSessionItem;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (newStartsAt: string, reason: string) => Promise<void>;
}) {
  const dict = getDictionary(locale);
  const [newTime, setNewTime] = React.useState(session.startsAt);
  const [reason, setReason] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onConfirm(newTime, reason);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-muted backdrop-blur-xs animate-in fade-in"
      data-testid="reschedule-modal"
    >
      <div className="bg-white  border border-border  rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border  pb-3">
          <h3 className="font-bold text-foreground ">
            {dict.scheduling?.reschedule || 'Reschedule Session'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground rounded-lg p-1"
            aria-label={locale === 'bn' ? 'মোডাল বন্ধ করুন' : 'Close modal'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-foreground ">
              {dict.scheduling?.rescheduleNewTime || 'New Date & Time (BST)'}
            </label>
            <input
              type="datetime-local"
              required
              value={newTime.slice(0, 16)}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border  bg-white  text-foreground "
              data-testid="reschedule-time-input"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-foreground ">
              {dict.scheduling?.rescheduleReasonLabel || 'Reason for Rescheduling'}
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide brief context for rescheduling..."
              className="w-full p-2.5 rounded-xl border border-border  bg-white  text-foreground "
              data-testid="reschedule-reason-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {dict.common?.cancel || 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              data-testid="confirm-reschedule-btn"
            >
              {dict.scheduling?.confirmReschedule || 'Confirm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
