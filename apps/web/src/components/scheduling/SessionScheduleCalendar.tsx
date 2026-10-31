'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Plus,
  LayoutGrid,
  ListOrdered,
  CalendarDays,
  Sparkles,
  ShieldCheck,
  Video,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Download,
  ExternalLink,
} from 'lucide-react';
import { Button, Card, CardContent, Alert, AlertDescription, Badge } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { ReactReduxContext } from 'react-redux';
import { primaryRole } from '@/store/slices/auth-slice';
import { formatWeekdayDate, formatTime } from '@/lib/format';
import { playAudioTone } from '@/lib/audio/notification-sound';
import type {
  CalendarSessionItem,
  CancelAssessmentView,
  ScheduleSessionInput,
} from '@/features/bookings/types/session.types';
import {
  SessionCard,
  SessionTimelineView,
  SessionMonthView,
  RescheduleModal,
  CancelSessionModal,
  ScheduleSessionModal,
} from '@/features/bookings/components/sessions';

export type { CalendarSessionItem, CancelAssessmentView, ScheduleSessionInput };
export type { SessionItemStatus } from '@/features/bookings/types/session.types';

function formatGoogleCalendarDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  } catch {
    return '';
  }
}

export function buildGoogleCalendarUrl(session: {
  title?: string;
  startsAt: string;
  endsAt?: string;
  meetingUrl?: string | null;
  tutorName?: string | null;
  studentName?: string | null;
  subjectName?: string | null;
}) {
  const title = encodeURIComponent(session.subjectName || session.title || 'OgroniEdu Class');
  const startStr = formatGoogleCalendarDate(session.startsAt);
  const endStr = session.endsAt
    ? formatGoogleCalendarDate(session.endsAt)
    : formatGoogleCalendarDate(
        new Date(new Date(session.startsAt).getTime() + 60 * 60 * 1000).toISOString(),
      );
  const details = encodeURIComponent(
    `OgroniEdu Class\nTeacher / Student: ${session.tutorName || session.studentName || 'OgroniEdu'}\nDigital Classroom: ${session.meetingUrl || 'https://ogroniedu.com'}`,
  );
  const location = encodeURIComponent(session.meetingUrl || 'OgroniEdu Digital Classroom');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
}

interface SessionScheduleCalendarProps {
  locale: Locale;
  initialSessions?: CalendarSessionItem[];
  isLoading?: boolean;
  queryError?: string | null;
  onScheduleSession?: (data: ScheduleSessionInput) => Promise<void>;
  scheduleOptions?: { id: string; status: string }[];
  onReschedule?: (sessionId: string, newStartsAt: string, reason: string) => Promise<void>;
  onCancel?: (sessionId: string, reason: string) => Promise<CancelAssessmentView | null | void>;
  scopeSlot?: React.ReactNode;
  role?: string;
  requestsHref?: string;
}

const DEFAULT_SESSIONS: CalendarSessionItem[] = [];

/**
 * Ultra-premium Sessions calendar:
 * - Full-width responsive dashboard layout (no max-w constraints)
 * - Live Timezone & BST status strip
 * - Next Live Session spotlight banner with 1-click digital classroom launch
 * - Segmented Status Pill Filters (All, Upcoming & Live, Completed, Cancelled)
 * - 3-Way Interactive View Toggle (Smart Cards Grid, Chronological Timeline Stream, Monthly Matrix)
 * - Rich illustrated empty state with direct action guidance
 * - Real backend-connected scheduling, rescheduling, and cancellation
 */
export function SessionScheduleCalendar({
  locale,
  initialSessions = DEFAULT_SESSIONS,
  isLoading = false,
  queryError = null,
  onScheduleSession,
  onReschedule,
  onCancel,
  scheduleOptions = [],
  scopeSlot,
  role: roleProp,
  requestsHref: requestsHrefProp,
}: SessionScheduleCalendarProps) {
  const dict = getDictionary(locale);
  const isBn = locale === 'bn';
  const [sessions, setSessions] = useState<CalendarSessionItem[]>(initialSessions);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>(
    'all',
  );
  const [viewMode, setViewMode] = useState<'grid' | 'timeline' | 'month'>('grid');

  const reduxContext = React.useContext(ReactReduxContext);
  const user = reduxContext ? (reduxContext.store?.getState() as any)?.auth?.user : null;
  const role = roleProp || primaryRole(user?.roles);
  const requestsHref =
    requestsHrefProp ||
    (role === 'guardian'
      ? withLocale('/dashboard/guardian/requests', locale)
      : role === 'tutor'
        ? withLocale('/dashboard/tutor/requests', locale)
        : withLocale('/dashboard/student/requests', locale));

  const filteredSessions = React.useMemo(() => {
    let list = [...sessions];
    if (filterStatus === 'scheduled') {
      list = list.filter((s) => s.status === 'scheduled' || s.status === 'in_progress');
    } else if (filterStatus === 'completed') {
      list = list.filter((s) => s.status === 'completed');
    } else if (filterStatus === 'cancelled') {
      list = list.filter((s) => s.status === 'cancelled' || s.status === 'no_show');
    }

    // Sort: upcoming & in_progress first by startsAt asc; completed by startsAt desc
    return list.sort((a, b) => {
      const timeA = new Date(a.startsAt).getTime();
      const timeB = new Date(b.startsAt).getTime();
      return timeA - timeB;
    });
  }, [sessions, filterStatus]);

  // Find the next upcoming or live session
  const nextSession = React.useMemo(() => {
    const upcoming = sessions
      .filter((s) => s.status === 'scheduled' || s.status === 'in_progress')
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return upcoming[0] || null;
  }, [sessions]);

  React.useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  const [selectedSessionForReschedule, setSelectedSessionForReschedule] =
    useState<CalendarSessionItem | null>(null);
  const [selectedSessionForCancel, setSelectedSessionForCancel] =
    useState<CalendarSessionItem | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingIcs, setIsDownloadingIcs] = useState(false);

  const handleDownloadIcsCalendar = async () => {
    try {
      setIsDownloadingIcs(true);
      const res = await fetch('/api/v1/sessions/calendar/ical', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      const json = await res.json();
      if (json?.data?.icsContent) {
        const blob = new Blob([json.data.icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', json.data.filename || 'ogroniedu-classes.ics');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        playAudioTone('success');
      }
    } catch (err) {
      console.error('Failed to download .ics calendar:', err);
      setActionError(
        locale === 'bn'
          ? 'ক্যালেন্ডার (.ics) ফাইল ডাউনলোড করতে ব্যর্থ হয়েছে।'
          : 'Failed to export calendar (.ics) file.',
      );
    } finally {
      setIsDownloadingIcs(false);
    }
  };

  function openReschedule(session: CalendarSessionItem) {
    setSelectedSessionForReschedule(session);
  }

  const handleConfirmReschedule = async (newStartsAt: string, reason: string) => {
    if (!selectedSessionForReschedule) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      if (onReschedule) {
        await onReschedule(selectedSessionForReschedule.id, newStartsAt, reason);
      } else {
        throw new Error(
          locale === 'bn' ? 'রিশিডিউলিং এখন উপলব্ধ নয়।' : 'Rescheduling is unavailable right now.',
        );
      }
      setSelectedSessionForReschedule(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!selectedSessionForCancel) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      let assessment: CancelAssessmentView | null = null;
      if (onCancel) {
        const result = await onCancel(selectedSessionForCancel.id, reason);
        assessment = result ?? null;
      } else {
        throw new Error(
          locale === 'bn' ? 'বাতিলকরণ এখন উপলব্ধ নয়।' : 'Cancellation is unavailable right now.',
        );
      }
      const cancelledId = selectedSessionForCancel.id;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === cancelledId
            ? { ...s, status: 'cancelled', cancellationAssessment: assessment }
            : s,
        ),
      );
      setSelectedSessionForCancel(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSchedule = async (input: ScheduleSessionInput) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      if (onScheduleSession) {
        await onScheduleSession(input);
      } else {
        throw new Error(
          locale === 'bn' ? 'শিডিউলিং এখন উপলব্ধ নয়।' : 'Scheduling is unavailable right now.',
        );
      }
      setScheduleOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const scheduledCount = sessions.filter(
    (s) => s.status === 'scheduled' || s.status === 'in_progress',
  ).length;
  const completedCount = sessions.filter((s) => s.status === 'completed').length;
  const cancelledCount = sessions.filter((s) => s.status === 'cancelled').length;

  const attendanceRate = React.useMemo(() => {
    const finished = completedCount + cancelledCount;
    if (finished === 0) return null;
    return Math.round((completedCount / finished) * 100);
  }, [completedCount, cancelledCount]);

  return (
    <div className="w-full flex flex-col gap-6" data-testid="scheduling-container">
      {/* 1. Studio Header */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 text-foreground flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex flex-col gap-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Clock className="w-3.5 h-3.5" />
              <span>
                {isBn
                  ? 'বাংলাদেশ সময় (BST / UTC+৬)'
                  : (dict.scheduling?.timezoneNotice || 'Bangladesh Standard Time (BST / UTC+6)')}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted/50 border border-border text-[11px] font-bold text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isBn ? '১০০% এসক্রো সুরক্ষিত ক্লাস' : '100% Escrow Protected'}</span>
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {dict.scheduling?.calendarTitle ||
                (isBn ? 'ক্লাস সময়সূচী ও সেশন কন্ট্রোল' : 'Class Schedule & Sessions')}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1.5 leading-relaxed font-normal">
              {dict.scheduling?.calendarSubtitle ||
                (isBn
                  ? 'আপনার সকল একাডেমিক ক্লাস, মিটিং লিঙ্ক, ডিজিটাল ক্লাসরুম ও উপস্থিতি মনিটর করুন।'
                  : 'Manage scheduled tutoring classes, meeting links, interactive whiteboard sessions, and calendar slots.')}
            </p>
          </div>

          {scopeSlot && <div className="pt-1">{scopeSlot}</div>}
        </div>

        {/* Live Metrics Strip & Schedule Action Button */}
        <div className="flex flex-wrap xl:flex-nowrap items-center gap-3 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full xl:w-auto">
            <div className="px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                {isBn ? 'আসন্ন ও লাইভ' : 'Upcoming & Live'}
              </span>
              <span className="text-lg sm:text-xl font-black text-primary">{scheduledCount}</span>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                {isBn ? 'সম্পন্ন' : 'Completed'}
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-600">
                {completedCount}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                {isBn ? 'উপস্থিতি হার' : 'Attendance'}
              </span>
              <span className="text-lg sm:text-xl font-black text-foreground">
                {attendanceRate != null ? `${formatLocalizedNumber(attendanceRate, locale)}%` : '—'}
              </span>
            </div>
          </div>

          {onScheduleSession && (
            <Button
              size="default"
              onClick={() => setScheduleOpen(true)}
              data-testid="schedule-open-btn"
              className="w-full xl:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-11 px-5"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>
                {dict.scheduling?.scheduleSession ||
                  (isBn ? 'নতুন ক্লাস নির্ধারণ' : 'Schedule Session')}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Spotlight Hero: Next Upcoming Class (Only when an upcoming class exists) */}
      {nextSession && (
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 font-bold text-xs border border-emerald-500/30 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isBn ? 'ডিজিটাল ক্লাসরুম' : 'Digital Classroom'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {nextSession.subjectName || (isBn ? 'সক্রিয় পাঠ্যক্রম' : 'Active Session')}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1 font-bold text-foreground">
                <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                <span>{formatWeekdayDate(nextSession.startsAt, locale)}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-bold text-foreground">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>{formatTime(nextSession.startsAt, locale)}</span>
              </span>
              {nextSession.tutorName && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {isBn ? 'শিক্ষক:' : 'Tutor:'} <strong>{nextSession.tutorName}</strong>
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {nextSession.meetingUrl ? (
              <a
                href={nextSession.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{dict.scheduling?.joinMeeting || (isBn ? 'অনলাইন ক্লাসে যুক্ত হন' : 'Enter Live Classroom')}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            ) : (
              <Button
                asChild
                size="default"
                className="rounded-xl font-bold bg-primary text-primary-foreground"
              >
                <Link
                  href={withLocale(`/sessions/${nextSession.id}`, locale)}
                  className="flex items-center gap-1.5"
                >
                  <Video className="w-4 h-4" />
                  <span>{isBn ? 'সেশন কন্ট্রোল দেখুন' : 'View Session Studio'}</span>
                </Link>
              </Button>
            )}

            <a
              href={buildGoogleCalendarUrl(nextSession)}
              target="_blank"
              rel="noreferrer"
              data-testid="calendar-google-sync-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs transition-colors h-10"
              title={isBn ? 'গুগল ক্যালেন্ডারে যোগ করুন' : 'Add to Google Calendar'}
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              <span>{isBn ? 'Google Calendar' : 'Google Cal'}</span>
            </a>

            <Button
              variant="outline"
              size="default"
              onClick={() => openReschedule(nextSession)}
              data-testid="calendar-spotlight-reschedule-btn"
              className="rounded-xl text-xs font-semibold h-10 border-border text-foreground hover:bg-muted"
            >
              {isBn ? 'সময় পরিবর্তন' : 'Reschedule'}
            </Button>
          </div>
        </div>
      )}

      {/* 3. Cancellation Policy Information Strip */}
      <div className="bg-muted/40 border border-border rounded-xl p-4 sm:p-5 text-xs flex items-start gap-3.5">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-foreground text-sm">
              {dict.scheduling?.cancellationPolicyTitle ||
                'Bangladesh Cancellation & Refund Policy'}
            </span>
            <span className="text-[11px] font-bold text-muted-foreground">
              {isBn ? 'ন্যায্য রিফান্ড অ্যালগরিদম' : 'Fair Automated Refund Algorithm'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-muted-foreground font-medium text-xs">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{dict.scheduling?.fullRefundNotice || 'Full 100% refund (>24h notice)'}</span>
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
              <span>{dict.scheduling?.partialRefundNotice || '80% refund (4–24h notice)'}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              <span>{dict.scheduling?.noRefundNotice || 'Non-refundable (<4h notice)'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Controls Toolbar: Status Pills + View Mode Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-2">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface'
            }`}
          >
            <span>{isBn ? 'সব ক্লাস' : 'All Classes'}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${filterStatus === 'all' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted'}`}
            >
              {sessions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('scheduled')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'scheduled'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${filterStatus === 'scheduled' ? 'bg-primary-foreground' : 'bg-primary'}`}
            />
            <span>{isBn ? 'আসন্ন ও লাইভ' : 'Upcoming & Live'}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${filterStatus === 'scheduled' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary-soft text-primary font-bold'}`}
            >
              {scheduledCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('completed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'completed'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${filterStatus === 'completed' ? 'bg-primary-foreground' : 'bg-emerald-500'}`}
            />
            <span>{isBn ? 'সম্পন্ন' : 'Completed'}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${filterStatus === 'completed' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-emerald-500/15 text-emerald-600 font-bold'}`}
            >
              {completedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('cancelled')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'cancelled'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${filterStatus === 'cancelled' ? 'bg-primary-foreground' : 'bg-rose-400'}`}
            />
            <span>{isBn ? 'বাতিল' : 'Cancelled'}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${filterStatus === 'cancelled' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted'}`}
            >
              {cancelledCount}
            </span>
          </button>
        </div>

        {/* Calendar Sync & View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadIcsCalendar}
            disabled={isDownloadingIcs}
            data-testid="calendar-download-ics-btn"
            className="rounded-xl border-border text-foreground hover:bg-surface-muted font-bold text-xs gap-1.5 h-9"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>
              {isBn
                ? isDownloadingIcs
                  ? 'ডাউনলোড হচ্ছে...'
                  : 'iCal (.ics) ক্যালেন্ডার'
                : isDownloadingIcs
                  ? 'Exporting...'
                  : 'Export .ICS'}
            </span>
          </Button>

          <div className="flex items-center gap-1 p-1 bg-surface rounded-xl border border-border/80">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title={isBn ? 'কার্ড ভিউ' : 'Card Grid View'}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">{isBn ? 'কার্ড' : 'Cards'}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              title={isBn ? 'টাইমলাইন ভিউ' : 'Timeline Agenda View'}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              <span className="hidden md:inline">{isBn ? 'টাইমলাইন' : 'Timeline'}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('month')}
              title={isBn ? 'মাসিক ক্যালেন্ডার' : 'Month Calendar View'}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden md:inline">{isBn ? 'ক্যালেন্ডার' : 'Calendar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Alerts */}
      {actionError && (
        <Alert variant="destructive" className="rounded-xl" data-testid="scheduling-action-error">
          <AlertDescription role="alert">{actionError}</AlertDescription>
        </Alert>
      )}
      {queryError && (
        <Alert variant="destructive" className="rounded-xl" data-testid="scheduling-query-error">
          <AlertDescription role="alert">{queryError}</AlertDescription>
        </Alert>
      )}

      {/* 6. Sessions Body (Loading / Empty / Rendered Views) */}
      {isLoading ? (
        <Card className="text-center py-16 rounded-xl border-border bg-card">
          <CardContent className="flex flex-col gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm font-semibold">
              {dict.common?.loading ||
                (isBn ? 'ক্লাস শিডিউল লোড হচ্ছে...' : 'Loading class sessions...')}
            </p>
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center">
          <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-foreground tracking-tight">
            {dict.scheduling?.noSessions ||
              (isBn ? 'কোনো ক্লাস নির্ধারিত নেই।' : 'No Sessions Scheduled Yet')}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-2 leading-relaxed">
            {isBn
              ? 'আপনার শিক্ষকের সাথে টিউশন অনুরোধ অনুমোদন ও পেমেন্ট সম্পন্ন হলে প্রতিটি ক্লাসের সময়সূচী, গুগল মিট লিঙ্ক এবং ডিজিটাল ক্লাসরুম স্বয়ংক্রিয়ভাবে এখানে যুক্ত হবে।'
              : 'Once your tuition booking is confirmed and secured in escrow, scheduled class links, formula sheets, and live classroom will automatically appear here.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Button
              asChild
              size="default"
              className="rounded-xl font-semibold text-xs h-10 px-4"
            >
              <Link href={withLocale('/request-tutor', locale)} className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>{isBn ? 'টিউশন রিকোয়েস্ট করুন' : 'Request Tutor'}</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="default"
              className="rounded-xl font-semibold text-xs h-10 px-4"
            >
              <Link href={requestsHref} className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span>{isBn ? 'বুকিং অনুরোধ চেক করুন' : 'View Booking Requests'}</span>
              </Link>
            </Button>
          </div>
        </div>
      ) : viewMode === 'month' ? (
        <SessionMonthView locale={locale} sessions={filteredSessions} />
      ) : viewMode === 'timeline' ? (
        <SessionTimelineView
          locale={locale}
          sessions={filteredSessions}
          onRescheduleClick={openReschedule}
          onCancelClick={setSelectedSessionForCancel}
        />
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6"
          data-testid="sessions-grid"
        >
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              locale={locale}
              session={session}
              onRescheduleClick={openReschedule}
              onCancelClick={setSelectedSessionForCancel}
            />
          ))}
        </div>
      )}

      {/* 7. Modals */}
      {selectedSessionForReschedule && (
        <RescheduleModal
          locale={locale}
          session={selectedSessionForReschedule}
          isSubmitting={isSubmitting}
          onClose={() => setSelectedSessionForReschedule(null)}
          onConfirm={handleConfirmReschedule}
        />
      )}

      {selectedSessionForCancel && (
        <CancelSessionModal
          locale={locale}
          isSubmitting={isSubmitting}
          onClose={() => setSelectedSessionForCancel(null)}
          onConfirm={handleConfirmCancel}
        />
      )}

      {scheduleOpen && onScheduleSession && (
        <ScheduleSessionModal
          locale={locale}
          options={scheduleOptions}
          isSubmitting={isSubmitting}
          onClose={() => setScheduleOpen(false)}
          onConfirm={handleConfirmSchedule}
        />
      )}
    </div>
  );
}
