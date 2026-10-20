'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, AlertTriangle, Plus } from 'lucide-react';
import { Button, Card, CardContent, Alert, AlertDescription } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import type {
  CalendarSessionItem,
  CancelAssessmentView,
  ScheduleSessionInput,
} from '@/features/bookings/types/session.types';
import { SessionCard } from '@/features/bookings/components/sessions/sessionCard';
import { RescheduleModal } from '@/features/bookings/components/sessions/rescheduleModal';
import { CancelSessionModal } from '@/features/bookings/components/sessions/cancelModal';
import { ScheduleSessionModal } from '@/features/bookings/components/sessions/scheduleModal';

export type { CalendarSessionItem, CancelAssessmentView, ScheduleSessionInput };
export type { SessionItemStatus } from '@/features/bookings/types/session.types';

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
  onScheduleSession,
  onReschedule,
  onCancel,
  scheduleOptions = [],
  scopeSlot,
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
      {/* Banner — matches home / tutor discovery visual language */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-gradient-to-br from-card via-card/90 to-primary-soft/30 p-6 sm:p-8 text-foreground shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -top-20 -right-12 w-72 h-72 rounded-full bg-brand-soft blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-soft border border-primary/25 rounded-full text-[11px] font-bold text-primary">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {dict.scheduling?.timezoneNotice || 'Bangladesh Standard Time (BST / UTC+6)'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            {dict.scheduling?.calendarTitle || 'Class Schedule & Sessions'}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-xl font-normal leading-relaxed">
            {dict.scheduling?.calendarSubtitle ||
              'Manage scheduled tutoring classes, meeting links, and calendar slots'}
          </p>
          {scopeSlot && <div className="pt-1">{scopeSlot}</div>}
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-2xl bg-card/80 border border-border text-center backdrop-blur">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {locale === 'bn' ? 'আসন্ন ক্লাস' : 'Upcoming'}
            </span>
            <span className="text-xl font-black text-foreground">
              {sessions.filter((s) => s.status === 'scheduled').length}
            </span>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-card/80 border border-border text-center backdrop-blur">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {locale === 'bn' ? 'সম্পন্ন ক্লাস' : 'Completed'}
            </span>
            <span className="text-xl font-black text-foreground">
              {sessions.filter((s) => s.status === 'completed').length}
            </span>
          </div>
        </div>
      </div>

      {/* Cancellation Policy Banner */}
      <div className="bg-warning-soft border border-warning/30 rounded-2xl p-4 text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-foreground block text-sm">
            {dict.scheduling?.cancellationPolicyTitle || 'Bangladesh Cancellation & Refund Policy'}
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground font-medium">
            <span>• {dict.scheduling?.fullRefundNotice || 'Full 100% refund (>24h notice)'}</span>
            <span>• {dict.scheduling?.partialRefundNotice || '80% refund (4–24h notice)'}</span>
            <span>• {dict.scheduling?.noRefundNotice || 'Non-refundable (<4h notice)'}</span>
          </div>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <span>{locale === 'bn' ? 'নির্ধারিত ক্লাসসমূহ' : 'Scheduled Classes'}</span>
          </h2>
          {onScheduleSession && (
            <Button
              size="sm"
              onClick={() => setScheduleOpen(true)}
              data-testid="schedule-open-btn"
              className="bg-primary hover:bg-primary-hover text-white shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              {dict.scheduling.scheduleSession}
            </Button>
          )}
        </div>

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
        {isLoading ? (
          <Card className="text-center py-12">
            <CardContent className="text-muted-foreground text-sm font-medium">
              {dict.common?.loading || 'Loading...'}
            </CardContent>
          </Card>
        ) : sessions.length === 0 ? (
          <Card className="text-center py-12 border-border rounded-2xl">
            <CardContent className="space-y-3 text-muted-foreground py-8">
              <CalendarIcon className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">
                {dict.scheduling?.noSessions ||
                  (locale === 'bn' ? 'কোনো নির্ধারিত ক্লাস নেই।' : 'No sessions scheduled.')}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {locale === 'bn'
                  ? 'আপনার শিক্ষকের সাথে টিউশন অনুরোধ অনুমোদন হলে ক্লাস শিডিউল এখানে দেখতে পাবেন।'
                  : 'Once your tuition booking is confirmed, your live scheduled classes will appear here.'}
              </p>
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
