'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Lock,
  LogIn,
  BookOpen,
  CalendarDays,
  Clock,
  Sparkles,
  Send,
  User,
} from 'lucide-react';
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
import { formatTimeString12h } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import { WEEKDAY_LABELS, type OptionItem, type TutorCardData } from '../types/tutor-discovery.types';

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
  availability,
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
  availability?: Array<{ weekday: number; startLocal: string; endLocal: string }>;
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

  const tutorName = isBn
    ? tutor.displayNameBn || tutor.displayNameEn || tutor.displayName || ''
    : tutor.displayNameEn || tutor.displayNameBn || tutor.displayName || '';

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="booking-request-modal"
        className="w-[94vw] max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 flex flex-col gap-5 rounded-2xl border border-border bg-card shadow-2xl"
      >
        {/* Header with Tutor Overview */}
        <DialogHeader className="flex flex-col gap-2 border-b border-border pb-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="font-black text-foreground text-base sm:text-xl tracking-tight">
                {dict.bookingRequest?.modalTitle ||
                  (isBn ? 'টিউটরিং ক্লাসের অনুরোধ পাঠান' : 'Request Tutoring Session')}
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-primary mt-0.5">
                {tutorName}
              </DialogDescription>
            </div>
            {tutor.hourlyRateMinor && (
              <span className="shrink-0 text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-xl">
                ৳{Math.round(Number(tutor.hourlyRateMinor) / 100)}/{isBn ? 'ঘণ্টা' : 'hr'}
              </span>
            )}
          </div>

          {/* 3-Step Timeline Stepper Header */}
          <div className="mt-2 pt-2 border-t border-border/60">
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-xs ring-4 ring-primary/20">
                  ১
                </div>
                <span className="text-foreground">{isBn ? 'বিষয় ও স্তর' : 'Subject & Level'}</span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary font-black text-xs border border-primary/30">
                  ২
                </div>
                <span className="text-muted-foreground">
                  {isBn ? 'মাধ্যম ও সময়সূচি' : 'Mode & Schedule'}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground font-black text-xs border border-border">
                  ৩
                </div>
                <span className="text-muted-foreground">
                  {isBn ? 'লক্ষ্য ও নিশ্চিতকরণ' : 'Goals & Confirm'}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {successMessage ? (
          <Alert className="bg-emerald-500/10 border border-emerald-500/30 text-center p-6 rounded-2xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <AlertDescription className="text-sm font-bold text-emerald-700 leading-relaxed">
              {successMessage}
            </AlertDescription>
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="rounded-xl font-bold border-emerald-500/40 text-emerald-800"
              >
                {isBn ? 'ঠিক আছে' : 'Close'}
              </Button>
            </div>
          </Alert>
        ) : (
          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-6 text-xs"
            data-testid="booking-request-form"
          >
            {error && (
              <Alert
                variant="destructive"
                data-testid="booking-request-error"
                className="p-3.5 text-xs rounded-xl"
              >
                <AlertDescription className="font-semibold">{error}</AlertDescription>
              </Alert>
            )}

            {/* Stepper Timeline Body Container */}
            <div className="relative pl-7 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-primary before:via-blue-300 before:to-muted flex flex-col gap-6">
              {/* STEP 1: Student & Subject Selection */}
              <div className="relative flex flex-col gap-3">
                <div className="absolute -left-7 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-[11px] ring-4 ring-background border border-primary shadow-sm">
                  1
                </div>

                <div className="flex items-center gap-1.5 pb-1">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="font-black text-foreground text-xs uppercase tracking-wider">
                    {isBn ? 'ধাপ ১: শিক্ষার্থী ও বিষয় নির্বাচন' : 'Step 1: Student & Subject'}
                  </span>
                </div>

                {studentOptions.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <Label className="font-bold text-foreground text-xs">
                      {dict.bookingRequest?.selectStudent ||
                        (isBn ? 'শিক্ষার্থী নির্বাচন করুন' : 'Select Student')}
                    </Label>
                    <Select
                      value={value.studentId}
                      onValueChange={(val) => onChange({ studentId: val })}
                    >
                      <SelectTrigger
                        className="w-full rounded-xl bg-card border-border text-xs text-foreground"
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
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-bold text-amber-700 text-xs">
                      <LogIn className="w-4 h-4 shrink-0" />
                      <span>
                        {isBn ? 'অনুরোধ পাঠাতে লগইন প্রয়োজন' : 'Sign in required to request'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {isBn
                        ? 'শিক্ষককে অনুরোধ পাঠাতে অভিভাবক বা শিক্ষার্থী একাউন্টে লগইন করুন।'
                        : 'Please sign in to your student or guardian account to book this tutor.'}
                    </p>
                    <Link
                      href={withLocale('/login', locale)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 text-xs transition-colors self-start"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{isBn ? 'লগইন করুন' : 'Sign in now'}</span>
                    </Link>
                  </div>
                )}

                {levelOptions.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="font-bold text-foreground text-xs">
                      {dict.bookingRequest?.selectLevel ||
                        (isBn ? 'শ্রেণি / স্তর নির্বাচন করুন' : 'Select Level')}
                    </Label>
                    <Select
                      value={value.levelId}
                      onValueChange={(val) => onChange({ levelId: val })}
                    >
                      <SelectTrigger
                        className="w-full rounded-xl bg-card border-border text-xs text-foreground"
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

                <div className="flex flex-col gap-1.5">
                  <Label className="font-bold text-foreground text-xs">
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
                      className="w-full rounded-xl bg-card border-border text-xs text-foreground"
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
              </div>

              {/* STEP 2: Mode & Preferred Days / 12-Hour Schedule Reference */}
              <div className="relative flex flex-col gap-3 pt-2">
                <div className="absolute -left-7 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-[11px] ring-4 ring-background border border-primary shadow-sm">
                  2
                </div>

                <div className="flex items-center gap-1.5 pb-1">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span className="font-black text-foreground text-xs uppercase tracking-wider">
                    {isBn
                      ? 'ধাপ ২: পাঠদান মাধ্যম ও সুবিধাজনক দিন'
                      : 'Step 2: Teaching Mode & Schedule'}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="font-bold text-foreground text-xs">
                    {dict.bookingRequest?.selectMode ||
                      (isBn ? 'পছন্দের মাধ্যম' : 'Preferred Mode')}
                  </Label>
                  <Select
                    value={value.mode}
                    onValueChange={(val) => onChange({ mode: val as BookingFormValue['mode'] })}
                  >
                    <SelectTrigger
                      className="w-full rounded-xl bg-card border-border text-xs text-foreground"
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

                <div className="flex flex-col gap-1.5">
                  <Label className="font-bold text-foreground text-xs">
                    {dict.bookingRequest?.preferredDaysLabel ||
                      (isBn ? 'পছন্দের দিনসমূহ নির্বাচন করুন' : 'Preferred Days')}
                  </Label>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
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
                          className={`rounded-xl text-[11px] h-7 font-bold transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'border-border bg-card text-foreground hover:border-primary/40'
                          }`}
                        >
                          {d.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* 12-Hour Tutor Schedule Reference Chip Banner */}
                {availability && availability.length > 0 && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex flex-col gap-2 mt-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {isBn
                          ? 'শিক্ষকের নিয়মিত সময়সূচি (১২-ঘণ্টা ফরম্যাটে)'
                          : 'Tutor Published Availability (12-hour format)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {availability.map((slot) => {
                        const dayLabel = isBn
                          ? WEEKDAY_LABELS[slot.weekday]?.bn
                          : WEEKDAY_LABELS[slot.weekday]?.en;
                        const start12 = formatTimeString12h(slot.startLocal, locale);
                        const end12 = formatTimeString12h(slot.endLocal, locale);
                        return (
                          <div
                            key={`${slot.weekday}-${slot.startLocal}-${slot.endLocal}`}
                            className="flex items-center justify-between rounded-lg bg-card/80 border border-border px-2.5 py-1 text-[11px]"
                          >
                            <span className="font-bold text-foreground">{dayLabel}</span>
                            <span className="font-semibold text-primary font-mono">
                              {start12} — {end12}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: Learning Goals & Escrow Guarantee */}
              <div className="relative flex flex-col gap-3 pt-2">
                <div className="absolute -left-7 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-[11px] ring-4 ring-background border border-primary shadow-sm">
                  3
                </div>

                <div className="flex items-center gap-1.5 pb-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-black text-foreground text-xs uppercase tracking-wider">
                    {isBn
                      ? 'ধাপ ৩: শিক্ষার্থীর লক্ষ্য ও চূড়ান্ত অনুরোধ'
                      : 'Step 3: Goals & Confirmation'}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="font-bold text-foreground text-xs">
                    {dict.bookingRequest?.notesLabel ||
                      (isBn ? 'প্রয়োজনীয় নির্দেশনা বা লক্ষ্য (ঐচ্ছিক)' : 'Notes / Learning Goals')}
                  </Label>
                  <Textarea
                    rows={3}
                    value={value.notes}
                    onChange={(e) => onChange({ notes: e.target.value })}
                    placeholder={
                      dict.bookingRequest?.notesPlaceholder ||
                      (isBn
                        ? 'নির্দিষ্ট অধ্যায়, বোর্ড পরীক্ষার প্রস্তুতি বা বিশেষ লক্ষ্য উল্লেখ করুন...'
                        : 'Describe syllabus chapters or specific goals...')
                    }
                    data-testid="booking-notes-input"
                    className="rounded-xl border-border bg-card text-xs text-foreground resize-none placeholder:text-muted-foreground"
                  />
                </div>

                {/* Escrow note inside modal */}
                <div className="rounded-xl bg-muted/40 border border-border p-3 flex items-start gap-2.5 text-[11px] text-muted-foreground">
                  <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-foreground">
                      {isBn ? 'অগ্রণী এসক্রো গ্যারান্টি' : 'Ogroni Escrow Guarantee'}
                    </span>
                    <p className="leading-relaxed">
                      {isBn
                        ? 'শিক্ষক অনুরোধ গ্রহণ করার পর প্রথম ক্লাস শুরু হবে। সন্তোষজনক ক্লাসের পর পেমেন্ট শিক্ষকদের কাছে পৌঁছাবে।'
                        : 'Payment is safely held in escrow until session completion. Full refund if unsatisfied.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="rounded-xl px-5 border-border text-foreground font-semibold text-xs"
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
                className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-md shadow-primary/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {dict.bookingRequest?.submitButton || (isBn ? 'অনুরোধ পাঠান' : 'Send Request')}
                </span>
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}