'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="reschedule-modal"
        className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left"
      >
        <DialogHeader className="border-b border-slate-100 pb-3 text-left">
          <DialogTitle className="font-black text-slate-900 text-lg">
            {dict.scheduling?.reschedule || 'Reschedule Session'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Select new session date and time with reason
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label className="font-semibold text-foreground text-xs">
              {dict.scheduling?.rescheduleNewTime || 'New Date & Time (BST)'}
            </Label>
            <Input
              type="datetime-local"
              required
              value={newTime.slice(0, 16)}
              onChange={(e) => setNewTime(e.target.value)}
              data-testid="reschedule-time-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-foreground text-xs">
              {dict.scheduling?.rescheduleReasonLabel || 'Reason for Rescheduling'}
            </Label>
            <Textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide brief context for rescheduling..."
              className="w-full p-2.5 rounded-xl border border-border bg-card text-foreground text-xs focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none"
              data-testid="reschedule-reason-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl"
            >
              {dict.common?.cancel || 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              data-testid="confirm-reschedule-btn"
              className="rounded-xl font-semibold"
            >
              {dict.scheduling?.confirmReschedule || 'Confirm'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
