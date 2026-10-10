'use client';

import React, { useState, useTransition } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Plus,
  Repeat,
  Info,
  X,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Input,
} from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';

export type SessionItemStatus =
  'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'reschedule_pending';

export interface CalendarSessionItem {
  id: string;
  bookingId: string;
  subjectName: string;
  tutorName: string;
  studentName: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  timezone: string;
  status: SessionItemStatus;
  meetingUrl?: string | null;
  locationInstructions?: string | null;
  cancellationAssessment?: {
    leadHours: number;
    refundPercentage: number;
    penaltyNotice: string;
    reason?: string;
  } | null;
}

interface SessionScheduleCalendarProps {
  locale: Locale;
  initialSessions?: CalendarSessionItem[];
  onScheduleOneOff?: (data: {
    bookingId: string;
    startsAt: string;
    meetingUrl?: string;
  }) => Promise<void>;
  onReschedule?: (sessionId: string, newStartsAt: string, reason: string) => Promise<void>;
  onCancel?: (sessionId: string, reason: string) => Promise<void>;
}

const DEFAULT_SESSIONS: CalendarSessionItem[] = [
  {
    id: 'sess-1',
    bookingId: 'booking-uuid-1',
    subjectName: 'Higher Mathematics (উচ্চতর গণিত)',
    tutorName: 'Rahat Mahmud (রাহাত মাহমুদ)',
    studentName: 'Tanvir Hossain (তানভীর হোসেন)',
    startsAt: '2026-10-15T10:00:00Z',
    endsAt: '2026-10-15T11:00:00Z',
    timezone: 'Asia/Dhaka',
    status: 'scheduled',
    meetingUrl: 'https://meet.ogroni.edu/room-math-101',
    locationInstructions: 'Online Google Meet Classroom',
  },
  {
    id: 'sess-2',
    bookingId: 'booking-uuid-1',
    subjectName: 'Higher Mathematics (উচ্চতর গণিত)',
    tutorName: 'Rahat Mahmud (রাহাত মাহমুদ)',
    studentName: 'Tanvir Hossain (তানভীর হোসেন)',
    startsAt: '2026-10-18T10:00:00Z',
    endsAt: '2026-10-18T11:00:00Z',
    timezone: 'Asia/Dhaka',
    status: 'scheduled',
    meetingUrl: 'https://meet.ogroni.edu/room-math-101',
  },
  {
    id: 'sess-3',
    bookingId: 'booking-uuid-2',
    subjectName: 'Physics (পদার্থবিজ্ঞান)',
    tutorName: 'Nusrat Jahan (নুসরাত জাহান)',
    studentName: 'Subarna Hossain (সুবর্ণা হোসেন)',
    startsAt: '2026-10-12T11:00:00Z',
    endsAt: '2026-10-12T12:00:00Z',
    timezone: 'Asia/Dhaka',
    status: 'completed',
    meetingUrl: 'https://meet.ogroni.edu/room-phys-201',
  },
];

export function SessionScheduleCalendar({
  locale,
  initialSessions = DEFAULT_SESSIONS,
  onReschedule,
  onCancel,
}: SessionScheduleCalendarProps) {
  const dict = getDictionary(locale);
  const [sessions, setSessions] = useState<CalendarSessionItem[]>(initialSessions);
  const [selectedSessionForReschedule, setSelectedSessionForReschedule] =
    useState<CalendarSessionItem | null>(null);
  const [selectedSessionForCancel, setSelectedSessionForCancel] =
    useState<CalendarSessionItem | null>(null);

  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStatusBadge = (status: SessionItemStatus) => {
    switch (status) {
      case 'scheduled':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {dict.scheduling?.statusScheduled || 'Scheduled'}
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="warning" className="gap-1 animate-pulse">
            <Clock className="w-3 h-3" />
            {dict.scheduling?.statusInProgress || 'In Progress'}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="gap-1 bg-slate-100 text-slate-700">
            <CheckCircle2 className="w-3 h-3 text-slate-500" />
            {dict.scheduling?.statusCompleted || 'Completed'}
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            {dict.scheduling?.statusCancelled || 'Cancelled'}
          </Badge>
        );
      case 'reschedule_pending':
        return (
          <Badge variant="warning" className="gap-1">
            <RotateCcw className="w-3 h-3" />
            {dict.scheduling?.statusReschedulePending || 'Reschedule Pending'}
          </Badge>
        );
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForReschedule) return;
    setIsSubmitting(true);
    try {
      if (onReschedule) {
        await onReschedule(selectedSessionForReschedule.id, rescheduleTime, rescheduleReason);
      }
      setSessions((prev) =>
        prev.map((s) =>
          s.id === selectedSessionForReschedule.id
            ? { ...s, startsAt: rescheduleTime, status: 'scheduled' }
            : s,
        ),
      );
      setSelectedSessionForReschedule(null);
      setRescheduleReason('');
    } catch {
      // Handled by UI
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForCancel) return;
    setIsSubmitting(true);
    try {
      if (onCancel) {
        await onCancel(selectedSessionForCancel.id, cancelReason);
      }
      setSessions((prev) =>
        prev.map((s) =>
          s.id === selectedSessionForCancel.id
            ? {
                ...s,
                status: 'cancelled',
                cancellationAssessment: {
                  leadHours: 24,
                  refundPercentage: 100,
                  penaltyNotice: 'none',
                  reason: cancelReason,
                },
              }
            : s,
        ),
      );
      setSelectedSessionForCancel(null);
      setCancelReason('');
    } catch {
      // Handled by UI
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
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-emerald-600" />
          <span>Scheduled Classes</span>
        </h2>

        {sessions.length === 0 ? (
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
            {sessions.map((session) => {
              const startDate = new Date(session.startsAt);
              const formattedDate = startDate.toLocaleDateString(
                locale === 'bn' ? 'bn-BD' : 'en-US',
                {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                },
              );
              const formattedTime = startDate.toLocaleTimeString(
                locale === 'bn' ? 'bn-BD' : 'en-US',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                },
              );

              return (
                <Card
                  key={session.id}
                  className="flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800"
                  data-testid={`session-card-${session.id}`}
                >
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {formattedDate} • {formattedTime}
                      </span>
                      {getStatusBadge(session.status)}
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {session.subjectName}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Tutor: {session.tutorName} | Learner: {session.studentName}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs pt-0">
                    {session.meetingUrl && session.status !== 'cancelled' && (
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                          <Video className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-medium truncate max-w-[180px]">
                            Online Classroom
                          </span>
                        </div>
                        <a
                          href={session.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium text-[11px] transition-colors"
                        >
                          {dict.scheduling?.joinMeeting || 'Join'}
                        </a>
                      </div>
                    )}

                    {session.cancellationAssessment && (
                      <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-100 dark:border-rose-900 text-[11px] text-rose-800 dark:text-rose-300 space-y-0.5">
                        <span className="font-semibold block">Cancelled</span>
                        <p>
                          Refund:{' '}
                          {formatLocalizedNumber(
                            session.cancellationAssessment.refundPercentage,
                            locale,
                          )}
                          %
                        </p>
                        {session.cancellationAssessment.reason && (
                          <p className="italic">"{session.cancellationAssessment.reason}"</p>
                        )}
                      </div>
                    )}
                  </CardContent>

                  {session.status === 'scheduled' && (
                    <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSessionForReschedule(session);
                          setRescheduleTime(session.startsAt);
                        }}
                        data-testid={`reschedule-btn-${session.id}`}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        {dict.scheduling?.reschedule || 'Reschedule'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setSelectedSessionForCancel(session)}
                        data-testid={`cancel-btn-${session.id}`}
                      >
                        {dict.scheduling?.cancelSession || 'Cancel'}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {selectedSessionForReschedule && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
          data-testid="reschedule-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                {dict.scheduling?.reschedule || 'Reschedule Session'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSessionForReschedule(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  {dict.scheduling?.rescheduleNewTime || 'New Date & Time (BST)'}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={rescheduleTime.slice(0, 16)}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  data-testid="reschedule-time-input"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  {dict.scheduling?.rescheduleReasonLabel || 'Reason for Rescheduling'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Provide brief context for rescheduling..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  data-testid="reschedule-reason-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSessionForReschedule(null)}
                >
                  {dict.common?.cancel || 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                  data-testid="confirm-reschedule-btn"
                >
                  {dict.scheduling?.confirmReschedule || 'Confirm'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {selectedSessionForCancel && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
          data-testid="cancel-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-rose-600 dark:text-rose-400">
                {dict.scheduling?.cancelSession || 'Cancel Session'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSessionForCancel(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Cancelling this session will evaluate the standard cancellation policy window. If
                cancelled more than 24h in advance, full 100% refund is processed.
              </p>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  {dict.scheduling?.cancelReasonLabel || 'Reason for Cancellation'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explain why you are cancelling..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  data-testid="cancel-reason-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSessionForCancel(null)}
                >
                  {dict.common?.cancel || 'Close'}
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  isLoading={isSubmitting}
                  data-testid="confirm-cancel-btn"
                >
                  {dict.scheduling?.confirmCancel || 'Cancel Class'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
