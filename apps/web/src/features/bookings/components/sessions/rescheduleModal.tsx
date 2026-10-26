'use client';

import React from 'react';
import { Calendar, Clock, AlertCircle, Sparkles } from 'lucide-react';
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

function addHoursToDateString(currentStr: string, hours: number): string {
  try {
    const base = new Date(currentStr);
    if (isNaN(base.getTime())) return currentStr;
    const future = new Date(base.getTime() + hours * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}T${pad(future.getHours())}:${pad(future.getMinutes())}`;
  } catch {
    return currentStr;
  }
}

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
  const isBn = locale === 'bn';
  const [newTime, setNewTime] = React.useState(session.startsAt);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  function applyQuickPreset(hours: number) {
    const calculated = addHoursToDateString(session.startsAt, hours);
    setNewTime(calculated);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const targetDate = new Date(newTime);
    if (isNaN(targetDate.getTime())) {
      setError(isBn ? 'সঠিক তারিখ ও সময় নির্বাচন করুন।' : 'Please choose a valid date and time.');
      return;
    }

    if (targetDate.getTime() <= Date.now()) {
      setError(
        isBn
          ? 'রিশিডিউল সময় অবশ্যই ভবিষ্যতের হতে হবে।'
          : 'Rescheduled time must be in the future.',
      );
      return;
    }

    if (!reason.trim()) {
      setError(
        isBn
          ? 'অনুগ্রহ করে রিশিডিউল করার কারণ উল্লেখ করুন।'
          : 'Please provide a reason for rescheduling.',
      );
      return;
    }

    await onConfirm(newTime, reason.trim());
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="reschedule-modal"
        className="bg-white border-2 border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 text-left"
      >
        <DialogHeader className="border-b border-slate-100 pb-3 text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-black text-slate-900 text-lg">
                {dict.scheduling?.reschedule || (isBn ? 'ক্লাস রিশিডিউল করুন' : 'Reschedule Session')}
              </DialogTitle>
              <p className="text-xs text-slate-600 font-medium">
                {session.subjectName || (isBn ? 'টিচিং সেশন' : 'Tutoring Session')} • {session.tutorName}
              </p>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Select new session date and time with reason
          </DialogDescription>
        </DialogHeader>

        {/* Lead time policy alert */}
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950 flex items-start gap-2 shadow-2xs font-medium">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {isBn
              ? 'ক্লাস শুরুর নূন্যতম ২ ঘণ্টা আগে রিশিডিউল প্রস্তাব করা বাধ্যতামূলক। নতুন সময় শিক্ষক ও শিক্ষার্থীর শিডিউল অনুযায়ী কার্যকর হবে।'
              : 'Reschedule requests should be submitted at least 2 hours before session start time.'}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-950 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>{isBn ? 'দ্রুত সময় নির্বাচন (ক্লিক করুন)' : 'Quick Presets (Click to apply)'}</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { hours: 24, labelBn: '+১ দিন', labelEn: '+24 Hours' },
                { hours: 48, labelBn: '+২ দিন', labelEn: '+48 Hours' },
                { hours: 72, labelBn: '+৩ দিন', labelEn: '+72 Hours' },
                { hours: 168, labelBn: '+১ সপ্তাহ', labelEn: '+1 Week' },
              ].map((p) => (
                <button
                  key={p.hours}
                  type="button"
                  onClick={() => applyQuickPreset(p.hours)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-[11px] transition-colors shadow-2xs cursor-pointer text-center"
                >
                  {isBn ? p.labelBn : p.labelEn}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reschedule-time-input" className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>{dict.scheduling?.rescheduleNewTime || (isBn ? 'নতুন তারিখ ও সময় (BST)' : 'New Date & Time (BST)')}</span>
            </Label>
            <Input
              id="reschedule-time-input"
              type="datetime-local"
              required
              value={newTime.slice(0, 16)}
              onChange={(e) => {
                setNewTime(e.target.value);
                setError(null);
              }}
              className="border-slate-300 text-slate-900 bg-white font-medium"
              data-testid="reschedule-time-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reschedule-reason-input" className="font-bold text-slate-800 text-xs">
              {dict.scheduling?.rescheduleReasonLabel || (isBn ? 'রিশিডিউলের কারণ' : 'Reason for Rescheduling')}
            </Label>
            <Textarea
              id="reschedule-reason-input"
              rows={3}
              required
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              placeholder={
                isBn
                  ? 'রিশিডিউল করার কারণ লিখুন (যেমন: জরুরি পারিবারিক কাজ, বিদ্যুৎ বিভ্রাট, অসুস্থতা ইত্যাদি)...'
                  : 'Provide brief context for rescheduling (e.g., family emergency, illness)...'
              }
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none placeholder:text-slate-400 font-medium"
              data-testid="reschedule-reason-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl border-slate-300 text-slate-800 hover:bg-slate-100 font-bold"
            >
              {dict.common?.cancel || (isBn ? 'বাতিল' : 'Cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              data-testid="confirm-reschedule-btn"
              className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              {dict.scheduling?.confirmReschedule || (isBn ? 'রিশিডিউল নিশ্চিত করুন' : 'Confirm Reschedule')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
