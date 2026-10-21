'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Lock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
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
  const isBn = locale === 'bn';

  const daysList = [
    { key: 'sunday', label: dict.bookingRequest?.daysSunday || (isBn ? 'রবিবার' : 'Sunday') },
    { key: 'monday', label: dict.bookingRequest?.daysMonday || (isBn ? 'সোমবার' : 'Monday') },
    { key: 'tuesday', label: dict.bookingRequest?.daysTuesday || (isBn ? 'মঙ্গলবার' : 'Tuesday') },
    {
      key: 'wednesday',
      label: dict.bookingRequest?.daysWednesday || (isBn ? 'বুধবার' : 'Wednesday'),
    },
    {
      key: 'thursday',
      label: dict.bookingRequest?.daysThursday || (isBn ? 'বৃহস্পতিবার' : 'Thursday'),
    },
    { key: 'friday', label: dict.bookingRequest?.daysFriday || (isBn ? 'শুক্রবার' : 'Friday') },
    { key: 'saturday', label: dict.bookingRequest?.daysSaturday || (isBn ? 'শনিবার' : 'Saturday') },
  ];

  // Resolve unique subject entry key for Radix UI Select
  const selectedSubjectEntry =
    tutor.subjects.find((s) => s.id === value.subjectId || s.subjectId === value.subjectId) ??
    tutor.subjects[0];
  const selectedSubjectEntryKey = selectedSubjectEntry?.id || selectedSubjectEntry?.subjectId || '';

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="booking-request-modal"
        className="w-[94vw] max-w-lg max-h-[88vh] overflow-y-auto p-5 sm:p-6 space-y-4 rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <DialogHeader className="space-y-1 border-b border-slate-200 pb-3 text-left">
          <DialogTitle className="font-black text-slate-900 text-base sm:text-lg">
            {dict.bookingRequest?.modalTitle ||
              (isBn ? 'টিউটরিং ক্লাসের অনুরোধ পাঠান' : 'Request Tutoring Session')}
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-blue-700">
            {isBn
              ? tutor.displayNameBn || tutor.displayNameEn || tutor.displayName
              : tutor.displayNameEn || tutor.displayNameBn || tutor.displayName}
          </DialogDescription>
        </DialogHeader>

        {successMessage ? (
          <Alert className="bg-emerald-50 border-2 border-emerald-300 text-center p-5 rounded-2xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <AlertDescription className="text-sm font-bold text-emerald-900">
              {successMessage}
            </AlertDescription>
          </Alert>
        ) : (
          <form
            onSubmit={onSubmit}
            className="space-y-4 text-xs"
            data-testid="booking-request-form"
          >
            {error && (
              <Alert
                variant="destructive"
                data-testid="booking-request-error"
                className="p-3 text-xs rounded-xl"
              >
                <AlertDescription className="font-semibold">{error}</AlertDescription>
              </Alert>
            )}

            {studentOptions.length > 0 ? (
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-800 text-xs">
                  {dict.bookingRequest?.selectStudent ||
                    (isBn ? 'শিক্ষার্থী নির্বাচন করুন' : 'Select Student')}
                </Label>
                <Select
                  value={value.studentId}
                  onValueChange={(val) => onChange({ studentId: val })}
                >
                  <SelectTrigger
                    className="w-full rounded-xl bg-white border-slate-300 text-xs text-slate-900"
                    data-testid="booking-student-select"
                  >
                    <SelectValue
                      placeholder={
                        dict.bookingRequest?.selectStudent ||
                        (isBn ? 'শিক্ষার্থী নির্বাচন করুন' : 'Select Student')
                      }
                    />
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
            ) : (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                  <LogIn className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{isBn ? 'অনুরোধ পাঠাতে লগইন প্রয়োজন' : 'Sign in required to request'}</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {isBn
                    ? 'শিক্ষককে অনুরোধ পাঠাতে অভিভাবক বা শিক্ষার্থী একাউন্টে লগইন করুন।'
                    : 'Please sign in to your student or guardian account to book this tutor.'}
                </p>
                <Link
                  href={withLocale('/login', locale)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 text-xs shadow-xs transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isBn ? 'লগইন করুন' : 'Sign in now'}</span>
                </Link>
              </div>
            )}

            {levelOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-800 text-xs">
                  {dict.bookingRequest?.selectLevel ||
                    (isBn ? 'শ্রেণি / স্তর নির্বাচন করুন' : 'Select Level')}
                </Label>
                <Select value={value.levelId} onValueChange={(val) => onChange({ levelId: val })}>
                  <SelectTrigger
                    className="w-full rounded-xl bg-white border-slate-300 text-xs text-slate-900"
                    data-testid="booking-level-select"
                  >
                    <SelectValue
                      placeholder={
                        dict.bookingRequest?.selectLevel ||
                        (isBn ? 'লেভেল নির্বাচন করুন' : 'Select Level')
                      }
                    />
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

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-800 text-xs">
                {dict.bookingRequest?.selectSubject ||
                  (isBn ? 'বিষয় নির্বাচন করুন' : 'Select Subject')}
              </Label>
              <Select
                value={selectedSubjectEntryKey}
                onValueChange={(entryKey) => {
                  const match = tutor.subjects.find((s) => (s.id || s.subjectId) === entryKey);
                  if (match) {
                    onChange({
                      subjectId: match.subjectId,
                    });
                  }
                }}
              >
                <SelectTrigger
                  className="w-full rounded-xl bg-white border-slate-300 text-xs text-slate-900"
                  data-testid="booking-subject-select"
                >
                  <SelectValue
                    placeholder={
                      dict.bookingRequest?.selectSubject ||
                      (isBn ? 'বিষয় নির্বাচন করুন' : 'Select Subject')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {tutor.subjects.map((sub) => {
                    const entryKey = sub.id || sub.subjectId;
                    const subName = isBn ? sub.subjectNameBn : sub.subjectNameEn;
                    const lvlName = isBn
                      ? sub.educationLevelNameBn || sub.educationLevelNameEn || ''
                      : sub.educationLevelNameEn || sub.educationLevelNameBn || '';
                    return (
                      <SelectItem key={entryKey} value={entryKey}>
                        {subName} {lvlName ? `(${lvlName})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-800 text-xs">
                {dict.bookingRequest?.selectMode || (isBn ? 'পছন্দের মাধ্যম' : 'Preferred Mode')}
              </Label>
              <Select
                value={value.mode}
                onValueChange={(val) => onChange({ mode: val as BookingFormValue['mode'] })}
              >
                <SelectTrigger
                  className="w-full rounded-xl bg-white border-slate-300 text-xs text-slate-900"
                  data-testid="booking-mode-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">
                    {dict.tutor?.modeOnline || (isBn ? 'অনলাইন' : 'Online')}
                  </SelectItem>
                  <SelectItem value="in_person">
                    {dict.tutor?.modeInPerson || (isBn ? 'হোম টিউশন' : 'In-person')}
                  </SelectItem>
                  <SelectItem value="hybrid">
                    {dict.tutor?.modeHybrid || (isBn ? 'হাইব্রিড' : 'Hybrid')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-800 text-xs">
                {dict.bookingRequest?.preferredDaysLabel ||
                  (isBn ? 'পছন্দের বার' : 'Preferred Days')}
              </Label>
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
                      className={`rounded-xl text-[11px] h-7 font-bold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-blue-500'
                      }`}
                    >
                      {d.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-800 text-xs">
                {dict.bookingRequest?.notesLabel ||
                  (isBn ? 'প্রয়োজনীয় নির্দেশনা বা লক্ষ্য' : 'Notes / Learning Goals')}
              </Label>
              <Textarea
                rows={3}
                value={value.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder={
                  dict.bookingRequest?.notesPlaceholder ||
                  (isBn
                    ? 'নির্দিষ্ট অধ্যায়, লক্ষ্য বা পড়ার বিষয় উল্লেখ করুন...'
                    : 'Describe syllabus chapters or goals...')
                }
                data-testid="booking-notes-input"
                className="rounded-xl border-slate-300 bg-white text-xs text-slate-900 resize-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="rounded-xl px-5 border-slate-200 text-slate-700 font-bold text-xs"
              >
                {dict.common?.cancel || (isBn ? 'বাতিল করুন' : 'Cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                disabled={studentOptions.length === 0}
                data-testid="submit-booking-request"
                className="rounded-xl px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs shadow-blue-500/25"
              >
                {dict.bookingRequest?.submitButton || (isBn ? 'অনুরোধ পাঠান' : 'Send Request')}
              </Button>
            </div>

            {/* Escrow note inside modal */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 flex items-center gap-2 text-[11px] text-slate-600">
              <Lock className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span>
                {isBn
                  ? 'অগ্রণী এসক্রো গ্যারান্টি: ক্লাস সন্তোষজনক হলে তবেই শিক্ষককে পেমেন্ট ছাড় করা হবে।'
                  : 'Ogroni Escrow Guarantee: Payment is safely held until session completion.'}
              </span>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
