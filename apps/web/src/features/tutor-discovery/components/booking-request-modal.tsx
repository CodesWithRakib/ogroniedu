'use client';

import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import type { OptionItem, TutorCardData } from '../types/tutor-discovery.types';

export interface BookingFormValue {
  studentId: string;
  subjectId: string;
  levelId: string;
  mode: 'in_person' | 'online' | 'hybrid';
  notes: string;
  days: string[];
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
    'w-full h-10 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
      data-testid="booking-request-modal"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              {dict.bookingRequest?.modalTitle || 'Request Tutoring Session'}
            </h3>
            <p className="text-xs text-slate-500">{tutor.displayName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
            aria-label={locale === 'bn' ? 'মোডাল বন্ধ করুন' : 'Close modal'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMessage ? (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
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
                className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
                data-testid="booking-request-error"
              >
                {error}
              </div>
            )}
            {studentOptions.length > 0 && (
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
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
                <label className="font-medium text-slate-700 dark:text-slate-300">
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
              <label className="font-medium text-slate-700 dark:text-slate-300">
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
              <label className="font-medium text-slate-700 dark:text-slate-300">
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
              <label className="font-medium text-slate-700 dark:text-slate-300">
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
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                        isSelected
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-700 dark:text-slate-300">
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
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
