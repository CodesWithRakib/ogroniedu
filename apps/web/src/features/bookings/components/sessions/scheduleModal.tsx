'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getDictionary, type Locale } from '@/lib/i18n';

/** One-off schedule dialog: booking + BST start time + optional meeting link. */
export function ScheduleSessionModal({
  locale,
  options,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  locale: Locale;
  options: { id: string; status: string }[];
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (input: { bookingId: string; startsAt: string; meetingUrl?: string }) => Promise<void>;
}) {
  const dict = getDictionary(locale);
  const [bookingId, setBookingId] = React.useState(options[0]?.id ?? '');
  const [startsAt, setStartsAt] = React.useState('');
  const [meetingUrl, setMeetingUrl] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingId || !startsAt) return;
    await onConfirm({ bookingId, startsAt, meetingUrl: meetingUrl.trim() || undefined });
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="schedule-modal"
        className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
      >
        <DialogHeader className="border-b border-border pb-3 text-left">
          <DialogTitle className="font-bold text-foreground">
            {dict.scheduling.scheduleSession}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Select booking and specify date/time
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label className="font-semibold text-foreground text-xs">
              {dict.scheduling.scheduleBookingLabel}
            </Label>
            <select
              required
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-card text-foreground text-xs focus:ring-2 focus:ring-ring focus:outline-none transition-colors"
              data-testid="schedule-booking-select"
            >
              {options.length === 0 && <option value="">—</option>}
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id.slice(0, 8)} · {o.status}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-foreground text-xs">
              {dict.scheduling.rescheduleNewTime}
            </Label>
            <Input
              type="datetime-local"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              data-testid="schedule-time-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-foreground text-xs">
              {dict.scheduling.meetingLinkLabel}
            </Label>
            <Input
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://"
              data-testid="schedule-meeting-input"
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
              data-testid="confirm-schedule-btn"
              className="rounded-xl font-semibold"
            >
              {dict.scheduling.confirmSchedule}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
