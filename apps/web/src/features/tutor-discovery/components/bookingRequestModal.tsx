'use client';

import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getDictionary, type Locale } from '@/lib/i18n';
import type { OptionItem, TutorCardData } from '../types/tutor-discovery.types';

export interface BookingFormValue {
  studentId: string;
  levelId: string;
  subjectId: string;
  mode: 'online' | 'in_person' | 'hybrid';
  days: string[];
  notes: string;
}

export function BookingRequestModal({
  tutor,
  locale,
  studentOptions,
  levelOptions,
  value,
  isSubmitting,
  successMessage,
  error,
  onChange,
  onToggleDay,
  onSubmit,
  onClose,
}: {
  tutor: TutorCardData;
  locale: Locale;
  studentOptions: OptionItem[];
  levelOptions: OptionItem[];
  value: BookingFormValue;
  isSubmitting: boolean;
  successMessage: string | null;
  error: string | null;
  onChange: (patch: Partial<BookingFormValue>) => void;
  onToggleDay: (dayKey: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  const dict = getDictionary(locale);
  const daysList = [
    { key: 'sunday', label: dict.bookingRequest?.daysSunday || 'Sunday' },
    { key: 'monday', label: dict.bookingRequest?.daysMonday || 'Monday' },
    { key: 'tuesday', label: dict.bookingRequest?.daysTuesday || 'Tuesday' },
    { key: 'wednesday', label: dict.bookingRequest?.daysWednesday || 'Wednesday' },
    { key: 'thursday', label: dict.bookingRequest?.daysThursday || 'Thursday' },
    { key: 'friday', label: dict.bookingRequest?.daysFriday || 'Friday' },
    { key: 'saturday', label: dict.bookingRequest?.daysSaturday || 'Saturday' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      data-testid="booking-request-modal"
    >
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div>
            <h3 className="font-bold text-foreground">
              {dict.bookingRequest?.modalTitle || 'Request Tutoring Session'}
            </h3>
            <p className="text-xs text-muted-foreground">{tutor.displayName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-xl p-1 transition-colors cursor-pointer"
            aria-label={locale === 'bn' ? 'মোডাল বন্ধ করুন' : 'Close modal'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMessage ? (
          <div className="p-4 bg-primary-soft border border-primary/25 rounded-2xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-primary mx-auto" />
            <p className="text-sm font-semibold text-primary-soft-foreground">{successMessage}</p>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="space-y-4 text-xs"
            data-testid="booking-request-form"
          >
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive-soft p-3 text-xs text-destructive font-medium"
                data-testid="booking-request-error"
              >
                {error}
              </div>
            )}
            {studentOptions.length > 0 && (
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  {dict.bookingRequest?.selectStudent || 'Select Student'}
                </label>
                <Select
                  value={value.studentId}
                  onValueChange={(val) => onChange({ studentId: val })}
                >
                  <SelectTrigger className="w-full h-10 rounded-xl bg-card border-border text-xs" data-testid="booking-student-select">
                    <SelectValue placeholder={dict.bookingRequest?.selectStudent || 'Select Student'} />
                  </SelectTrigger>
                  <SelectContent>
                    {studentOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {levelOptions.length > 0 && (
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  {dict.bookingRequest?.selectLevel || 'Select Level'}
                </label>
                <Select
                  value={value.levelId}
                  onValueChange={(val) => onChange({ levelId: val })}
                >
                  <SelectTrigger className="w-full h-10 rounded-xl bg-card border-border text-xs" data-testid="booking-level-select">
                    <SelectValue placeholder={dict.bookingRequest?.selectLevel || 'Select Level'} />
                  </SelectTrigger>
                  <SelectContent>
                    {levelOptions.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                {dict.bookingRequest?.selectSubject || 'Select Subject'}
              </label>
              <Select
                value={value.subjectId}
                onValueChange={(val) => onChange({ subjectId: val })}
              >
                <SelectTrigger className="w-full h-10 rounded-xl bg-card border-border text-xs" data-testid="booking-subject-select">
                  <SelectValue placeholder={dict.bookingRequest?.selectSubject || 'Select Subject'} />
                </SelectTrigger>
                <SelectContent>
                  {tutor.subjects.map((sub) => (
                    <SelectItem key={sub.id || sub.subjectId} value={sub.subjectId}>
                      {locale === 'bn' ? sub.subjectNameBn : sub.subjectNameEn} (
                      {sub.educationLevelNameEn || 'General'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                {dict.bookingRequest?.selectMode || 'Preferred Mode'}
              </label>
              <Select
                value={value.mode}
                onValueChange={(val) => onChange({ mode: val as BookingFormValue['mode'] })}
              >
                <SelectTrigger className="w-full h-10 rounded-xl bg-card border-border text-xs" data-testid="booking-mode-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">{dict.tutor?.modeOnline || 'Online'}</SelectItem>
                  <SelectItem value="in_person">{dict.tutor?.modeInPerson || 'In-person'}</SelectItem>
                  <SelectItem value="hybrid">{dict.tutor?.modeHybrid || 'Hybrid'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                {dict.bookingRequest?.preferredDaysLabel || 'Preferred Days'}
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {daysList.map((d) => {
                  const isSelected = value.days.includes(d.key);
                  return (
                    <Button
                      key={d.key}
                      type="button"
                      variant={isSelected ? 'primary' : 'outline'}
                      size="xs"
                      onClick={() => onToggleDay(d.key)}
                      data-testid={`day-toggle-${d.key}`}
                      className="rounded-xl text-[11px] h-7 font-semibold"
                    >
                      {d.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                {dict.bookingRequest?.notesLabel || 'Notes / Learning Goals'}
              </label>
              <Textarea
                rows={3}
                value={value.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder={
                  dict.bookingRequest?.notesPlaceholder || 'Describe syllabus chapters or goals...'
                }
                data-testid="booking-notes-input"
                className="rounded-xl border-border bg-card text-xs resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl">
                {dict.common?.cancel || 'Cancel'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                data-testid="submit-booking-request"
                className="rounded-xl font-semibold shadow-xs"
              >
                {dict.bookingRequest?.submitButton || 'Send Request'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
