'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
      data-testid="schedule-modal"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            {dict.scheduling.scheduleSession}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              {dict.scheduling.scheduleBookingLabel}
            </label>
            <select
              required
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
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

          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              {dict.scheduling.rescheduleNewTime}
            </label>
            <input
              type="datetime-local"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              data-testid="schedule-time-input"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              {dict.scheduling.meetingLinkLabel}
            </label>
            <input
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              data-testid="schedule-meeting-input"
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
              data-testid="confirm-schedule-btn"
            >
              {dict.scheduling.confirmSchedule}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
