'use client';

import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui';
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

  const selectClass =
    'w-full h-10 px-3 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors';

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
            className="text-muted-foreground hover:text-foreground rounded-xl p-1 transition-colors"
            aria-label={locale === 'bn' ? 'মোডাল বন্ধ করুন' : 'Close modal'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMessage ? (
          <div className="p-4 bg-primary-soft border border-primary/25 rounded-2xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-primary mx-auto" />
            <p className="text-sm font-semibold text-primary-soft-foreground">
              {successMessage}
            </p>
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
                className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium"
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
                <select
                  value={value.studentId}
                  onChange={(e) => onChange({ studentId: e.target.value })}
                  required
                  data-testid="booking-student-select"
                  className={selectClass}
                >
                  {studentOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {levelOptions.length > 0 && (
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  {dict.bookingRequest?.selectLevel || 'Select Level'}
                </label>
                <select
                  value={value.levelId}
                  onChange={(e) => onChange({ levelId: e.target.value })}
                  required
                  data-testid="booking-level-select"
                  className={selectClass}
                >
                  {levelOptions.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                {dict.bookingRequest?.selectSubject || 'Select Subject'}
              </label>
              <select
                value={value.subjectId}
                onChange={(e) => onChange({ subjectId: e.target.value })}
                required
                data-testid="booking-subject-select"
                className={selectClass}
              >
                {tutor.subjects.map((sub) => (
                  <option key={sub.id || sub.subjectId} value={sub.subjectId}>
                    {locale === 'bn' ? sub.subjectNameBn : sub.subjectNameEn} (
                    {sub.educationLevelNameEn || 'General'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                {dict.bookingRequest?.selectMode || 'Preferred Mode'}
              </label>
              <select
                value={value.mode}
                onChange={(e) => onChange({ mode: e.target.value as BookingFormValue['mode'] })}
                data-testid="booking-mode-select"
                className={selectClass}
              >
                <option value="online">{dict.tutor?.modeOnline || 'Online'}</option>
                <option value="in_person">{dict.tutor?.modeInPerson || 'In-person'}</option>
                <option value="hybrid">{dict.tutor?.modeHybrid || 'Hybrid'}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                {dict.bookingRequest?.preferredDaysLabel || 'Preferred Days'}
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {daysList.map((d) => {
                  const isSelected = value.days.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => onToggleDay(d.key)}
                      data-testid={`day-toggle-${d.key}`}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-surface-muted text-foreground border-border hover:bg-surface-hover'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                {dict.bookingRequest?.notesLabel || 'Notes / Learning Goals'}
              </label>
              <textarea
                rows={3}
                value={value.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder={
                  dict.bookingRequest?.notesPlaceholder || 'Describe syllabus chapters or goals...'
                }
                data-testid="booking-notes-input"
                className="w-full p-2.5 text-xs rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
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
                data-testid="submit-booking-request"
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
