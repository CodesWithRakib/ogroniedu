import type { ReplacementReasonCode } from '../entities/tutor-replacement-case.entity';
import { REPLACEMENT_REQUEST_WINDOW_HOURS } from '../constants/replacement-policy.constants';

export interface EligibilitySession {
  status: string;
  startsAt: Date;
  completedAt?: Date | null;
  cancellationAssessment?: { initiatedByRole?: string } | null;
}

export interface EligibilityBooking {
  status: string;
}

/** Booking states in which a replacement can still be requested. */
export const REPLACEMENT_ELIGIBLE_BOOKING_STATUSES: readonly string[] = [
  'accepted',
  'awaiting_payment',
  'confirmed',
  'in_progress',
  'disputed',
  'replacement_requested',
];

export interface EligibilityResult {
  eligible: boolean;
  error?: string;
}

/**
 * Conservative, deterministic eligibility evaluation. Evidence is derived from
 * persisted booking/session records only; an unexplained reason is rejected
 * rather than accepted optimistically.
 */
export function evaluateReplacementEligibility(input: {
  bookingStatus: string;
  reasonCode: ReplacementReasonCode;
  sessions: readonly EligibilitySession[];
  now?: Date;
}): EligibilityResult {
  const now = input.now ?? new Date();
  if (!REPLACEMENT_ELIGIBLE_BOOKING_STATUSES.includes(input.bookingStatus)) {
    return {
      eligible: false,
      error: `Booking status '${input.bookingStatus}' is not eligible for a replacement request.`,
    };
  }

  const firstCompleted = [...input.sessions]
    .filter((session) => session.status === 'completed')
    .sort(
      (a, b) =>
        new Date(a.completedAt ?? a.startsAt).getTime() -
        new Date(b.completedAt ?? b.startsAt).getTime(),
    )[0];

  const withinTrialWindow = (): boolean => {
    if (!firstCompleted) return false;
    const reference = new Date(firstCompleted.completedAt ?? firstCompleted.startsAt).getTime();
    return now.getTime() - reference <= REPLACEMENT_REQUEST_WINDOW_HOURS * 60 * 60 * 1000;
  };

  switch (input.reasonCode) {
    case 'trial_dissatisfaction':
    case 'teaching_mismatch':
      if (!firstCompleted) {
        return {
          eligible: false,
          error:
            'A completed first session is required before requesting replacement for teaching dissatisfaction.',
        };
      }
      if (!withinTrialWindow()) {
        return {
          eligible: false,
          error: `The ${REPLACEMENT_REQUEST_WINDOW_HOURS}-hour replacement request window after the first session has closed.`,
        };
      }
      return { eligible: true };

    case 'tutor_no_show':
      if (!input.sessions.some((session) => session.status === 'no_show')) {
        return {
          eligible: false,
          error: 'No recorded tutor no-show exists for this booking.',
        };
      }
      return { eligible: true };

    case 'frequent_tutor_cancellation': {
      const tutorCancellations = input.sessions.filter(
        (session) =>
          session.status === 'cancelled' &&
          session.cancellationAssessment?.initiatedByRole === 'tutor',
      ).length;
      if (tutorCancellations < 2) {
        return {
          eligible: false,
          error: 'At least two tutor-initiated session cancellations are required.',
        };
      }
      return { eligible: true };
    }

    case 'unprofessional_conduct':
    case 'other':
      if (input.sessions.length === 0) {
        return {
          eligible: false,
          error: 'A scheduled session or confirmed booking is required for this reason.',
        };
      }
      return { eligible: true };

    default:
      return { eligible: false, error: 'Unsupported replacement reason.' };
  }
}

/** Reason codes a booking can currently support (used by the eligibility list). */
export function summarizeEligibleReasons(input: {
  bookingStatus: string;
  sessions: readonly EligibilitySession[];
  now?: Date;
}): ReplacementReasonCode[] {
  const reasons: ReplacementReasonCode[] = [];
  const candidates: ReplacementReasonCode[] = [
    'trial_dissatisfaction',
    'teaching_mismatch',
    'tutor_no_show',
    'frequent_tutor_cancellation',
    'unprofessional_conduct',
    'other',
  ];
  for (const reason of candidates) {
    if (
      evaluateReplacementEligibility({
        bookingStatus: input.bookingStatus,
        reasonCode: reason,
        sessions: input.sessions,
        now: input.now,
      }).eligible
    ) {
      reasons.push(reason);
    }
  }
  return reasons;
}
