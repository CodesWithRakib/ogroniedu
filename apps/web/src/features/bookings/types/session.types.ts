import type { SessionItem, SessionStatus } from '@/store/services/sessions-api';

export type SessionItemStatus = SessionStatus;
export type { SessionItem };

/** Server-computed cancellation assessment (refund matrix). Never fabricated client-side. */
export interface CancelAssessmentView {
  leadHours: number;
  refundPercentage: number;
  penaltyNotice?: string | null;
  reason?: string | null;
}

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
  cancellationAssessment?: CancelAssessmentView | null;
}

export interface ScheduleOneOffInput {
  bookingId: string;
  startsAt: string;
  meetingUrl?: string;
}

export interface WeeklySlotInput {
  weekday: number;
  startLocal: string;
  durationMinutes?: number;
}

export interface ScheduleRecurringInput {
  bookingId: string;
  startDate: string;
  count: number;
  timezone?: string;
  meetingUrl?: string;
  scheduleSlots: WeeklySlotInput[];
}

export type ScheduleSessionInput =
  | ({ mode: 'one_off' } & ScheduleOneOffInput)
  | ({ mode: 'recurring' } & ScheduleRecurringInput);
