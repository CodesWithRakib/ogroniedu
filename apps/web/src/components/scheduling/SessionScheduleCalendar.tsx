'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, AlertTriangle, Plus } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import type {
  CalendarSessionItem,
  CancelAssessmentView,
  ScheduleOneOffInput,
} from '@/features/bookings/types/session.types';
import { SessionCard } from '@/features/bookings/components/sessions/sessionCard';
import { RescheduleModal } from '@/features/bookings/components/sessions/rescheduleModal';
import { CancelSessionModal } from '@/features/bookings/components/sessions/cancelModal';
import { ScheduleSessionModal } from '@/features/bookings/components/sessions/scheduleModal';

export type { CalendarSessionItem, CancelAssessmentView, ScheduleOneOffInput };
export type { SessionItemStatus } from '@/features/bookings/types/session.types';

interface SessionScheduleCalendarProps {
  locale: Locale;
  initialSessions?: CalendarSessionItem[];
  isLoading?: boolean;
  queryError?: string | null;
  onScheduleOneOff?: (data: ScheduleOneOffInput) => Promise<void>;
  scheduleOptions?: { id: string; status: string }[];
  onReschedule?: (sessionId: string, newStartsAt: string, reason: string) => Promise<void>;
  onCancel?: (sessionId: string, reason: string) => Promise<CancelAssessmentView | null | void>;
}

const DEFAULT_SESSIONS: CalendarSessionItem[] = [];

/**
 * Sessions calendar composer: banner, policy notice, session grid, and the
 * reschedule/cancel dialogs. Cancellation assessments are always server
 * values (returned by onCancel, then refreshed by the parent refetch) —
 * never fabricated locally.
 */
export function SessionScheduleCalendar({
  locale,
  initialSessions = DEFAULT_SESSIONS,
  isLoading = false,
  queryError = null,
  onScheduleOneOff,
  onReschedule,
  onCancel,
  scheduleOptions = [],
}: SessionScheduleCalendarProps) {
  const dict = getDictionary(locale);
  const [sessions, setSessions] = useState<CalendarSessionItem[]>(initialSessions);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  React.useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  const [selectedSessionForReschedule, setSelectedSessionForReschedule] =
    useState<CalendarSessionItem | null>(null);
  const [selectedSessionForCancel, setSelectedSessionForCancel] =
    useState<CalendarSessionItem | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

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
          locale === 'bn'
            ? 'পুনর্নির্ধারণ এখন উপলব্ধ নয়।'
            : 'Rescheduling is unavailable right now.',
        );
      }
      setSessions((prev) =>
        prev.map((s) =>
          s.id === selectedSessionForReschedule.id
            ? { ...s, startsAt: newStartsAt, status: 'scheduled' }
            : s,
        ),
      );
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
      // Server-computed refund matrix when the backend returns it; otherwise
      // mark cancelled with no assessment (parent refetch supplies truth).
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

  const handleConfirmSchedule = async (input: ScheduleOneOffInput) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      if (onScheduleOneOff) {
        await onScheduleOneOff(input);
      } else {
        throw new Error(
          locale === 'bn' ? 'শিডিউলিং এখন উপলব্ধ নয়।' : 'Scheduling is unavailable right now.',
        );
      }
      // The sessions query refreshes via RTK cache invalidation; close the form.
      setScheduleOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8"
      data-testid="scheduling-container"
    >
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-medium text-emerald-300">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {dict.scheduling?.timezoneNotice || 'Bangladesh Standard Time (BST / UTC+6)'}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {dict.scheduling?.calendarTitle || 'Class Schedule & Sessions'}
          </h1>
          <p className="text-emerald-100/80 text-sm max-w-xl">
            {dict.scheduling?.calendarSubtitle ||
              'Manage scheduled tutoring classes, meeting links, and calendar slots'}
          </p>
        </div>
      </div>

      {/* Cancellation Policy Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block">
            {dict.scheduling?.cancellationPolicyTitle || 'Bangladesh Cancellation & Refund Policy'}
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-amber-800 dark:text-amber-300">
            <span>• {dict.scheduling?.fullRefundNotice || 'Full 100% refund (>24h notice)'}</span>
            <span>• {dict.scheduling?.partialRefundNotice || '80% refund (4–24h notice)'}</span>
            <span>• {dict.scheduling?.noRefundNotice || 'Non-refundable (<4h notice)'}</span>
          </div>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-600" />
            <span>Scheduled Classes</span>
          </h2>
          {onScheduleOneOff && (
            <Button size="sm" onClick={() => setScheduleOpen(true)} data-testid="schedule-open-btn">
              <Plus className="w-4 h-4 mr-1" />
              {dict.scheduling.scheduleSession}
            </Button>
          )}
        </div>

        {actionError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
            data-testid="scheduling-action-error"
          >
            {actionError}
          </div>
        )}
        {queryError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
            data-testid="scheduling-query-error"
          >
            {queryError}
          </div>
        )}
        {isLoading ? (
          <Card className="text-center py-12">
            <CardContent className="text-slate-500 text-sm">
              {dict.common?.loading || 'Loading...'}
            </CardContent>
          </Card>
        ) : sessions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-2 text-slate-500">
              <CalendarIcon className="w-10 h-10 mx-auto text-slate-300" />
              <p>{dict.scheduling?.noSessions || 'No sessions scheduled.'}</p>
            </CardContent>
          </Card>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            data-testid="sessions-grid"
          >
            {sessions.map((session) => (
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
      </div>

      {/* Reschedule Modal */}
      {selectedSessionForReschedule && (
        <RescheduleModal
          locale={locale}
          session={selectedSessionForReschedule}
          isSubmitting={isSubmitting}
          onClose={() => setSelectedSessionForReschedule(null)}
          onConfirm={handleConfirmReschedule}
        />
      )}

      {/* Cancel Modal */}
      {selectedSessionForCancel && (
        <CancelSessionModal
          locale={locale}
          isSubmitting={isSubmitting}
          onClose={() => setSelectedSessionForCancel(null)}
          onConfirm={handleConfirmCancel}
        />
      )}

      {/* Schedule Modal */}
      {scheduleOpen && onScheduleOneOff && (
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
