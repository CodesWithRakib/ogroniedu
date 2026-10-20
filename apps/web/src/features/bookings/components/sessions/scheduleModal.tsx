'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getDictionary, type Locale } from '@/lib/i18n';
import type { ScheduleSessionInput } from '@/features/bookings/types/session.types';

type ScheduleMode = 'one_off' | 'recurring';

const WEEKDAYS = [
  { value: 0, en: 'Sunday', bn: 'রবিবার' },
  { value: 1, en: 'Monday', bn: 'সোমবার' },
  { value: 2, en: 'Tuesday', bn: 'মঙ্গলবার' },
  { value: 3, en: 'Wednesday', bn: 'বুধবার' },
  { value: 4, en: 'Thursday', bn: 'বৃহস্পতিবার' },
  { value: 5, en: 'Friday', bn: 'শুক্রবার' },
  { value: 6, en: 'Saturday', bn: 'শনিবার' },
];

/** Schedule dialog: a single session or a bounded weekly series in local time. */
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
  onConfirm: (input: ScheduleSessionInput) => Promise<void>;
}) {
  const dict = getDictionary(locale);
  const isBn = locale === 'bn';

  const [mode, setMode] = React.useState<ScheduleMode>('one_off');
  const [bookingId, setBookingId] = React.useState(options[0]?.id ?? '');
  const [startsAt, setStartsAt] = React.useState('');
  const [meetingUrl, setMeetingUrl] = React.useState('');

  const [startDate, setStartDate] = React.useState('');
  const [weekday, setWeekday] = React.useState(1);
  const [startLocal, setStartLocal] = React.useState('16:00');
  const [count, setCount] = React.useState(4);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!bookingId) {
      setError(isBn ? 'একটি বুকিং নির্বাচন করুন।' : 'Select a booking.');
      return;
    }

    try {
      if (mode === 'recurring') {
        if (!startDate || !startLocal) {
          setError(
            isBn ? 'শুরুর তারিখ ও সময় লিখুন।' : 'Enter the start date and local start time.',
          );
          return;
        }
        await onConfirm({
          mode: 'recurring',
          bookingId,
          startDate,
          count: Math.min(24, Math.max(1, count)),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka',
          meetingUrl: meetingUrl.trim() || undefined,
          scheduleSlots: [
            {
              weekday,
              startLocal,
            },
          ],
        });
      } else {
        if (!startsAt) {
          setError(isBn ? 'শুরুর সময় নির্বাচন করুন।' : 'Choose a start time.');
          return;
        }
        await onConfirm({
          mode: 'one_off',
          bookingId,
          startsAt,
          meetingUrl: meetingUrl.trim() || undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
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
            Select a booking and schedule one session or a weekly series.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label className="font-semibold text-foreground text-xs">
              {dict.scheduling.scheduleBookingLabel}
            </Label>
            <NativeSelect
              required
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="text-xs"
              data-testid="schedule-booking-select"
            >
              {options.length === 0 && <option value="">—</option>}
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id.slice(0, 8)} · {o.status}
                </option>
              ))}
            </NativeSelect>
          </div>

          {/* Mode switch */}
          <div
            className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1"
            role="tablist"
            aria-label={isBn ? 'শিডিউলের ধরন' : 'Schedule type'}
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'one_off'}
              onClick={() => setMode('one_off')}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                mode === 'one_off'
                  ? 'bg-card text-foreground shadow-xs border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isBn ? 'একবার' : 'One-time'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'recurring'}
              onClick={() => setMode('recurring')}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                mode === 'recurring'
                  ? 'bg-card text-foreground shadow-xs border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isBn ? 'সাপ্তাহিক সিরিজ' : 'Weekly series'}
            </button>
          </div>

          {mode === 'one_off' ? (
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
          ) : (
            <div className="space-y-3 rounded-xl border border-border bg-surface/60 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground text-xs">
                    {isBn ? 'শুরুর তারিখ' : 'Start date'}
                  </Label>
                  <Input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="series-start-date"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground text-xs">
                    {isBn ? 'কতটি সেশন' : 'Occurrences'}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    required
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    data-testid="series-count"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground text-xs">
                    {isBn ? 'সাপ্তাহিক দিন' : 'Weekday'}
                  </Label>
                  <NativeSelect
                    value={weekday}
                    onChange={(e) => setWeekday(Number(e.target.value))}
                    className="text-xs"
                    data-testid="series-weekday"
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {isBn ? day.bn : day.en}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground text-xs">
                    {isBn ? 'স্থানীয় সময়' : 'Local time'}
                  </Label>
                  <Input
                    type="time"
                    required
                    value={startLocal}
                    onChange={(e) => setStartLocal(e.target.value)}
                    data-testid="series-start-time"
                  />
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {isBn
                  ? 'সেশনগুলো আপনার স্থানীয় সময় অনুযায়ী তৈরি হবে এবং প্রতি সেশনে দ্বৈত-বুকিং যাচাই করা হবে। সর্বোচ্চ ২৪টি সেশন।'
                  : 'Sessions are generated in your local timezone, checked for conflicts individually, and capped at 24 occurrences.'}
              </p>
            </div>
          )}

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

          {error && (
            <p className="text-[11px] text-destructive" role="alert">
              {error}
            </p>
          )}

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
              {mode === 'recurring'
                ? isBn
                  ? 'সিরিজ তৈরি করুন'
                  : 'Create series'
                : dict.scheduling.confirmSchedule}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
