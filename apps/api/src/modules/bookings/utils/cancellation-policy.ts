import type { CancellationAssessment } from '../entities/booking-session.entity';

export type CancellationInitiator = 'guardian' | 'student' | 'tutor' | 'admin';

/**
 * Pure cancellation policy matrix (docs/BUSINESS_RULES.md §2).
 * Returns an assessment only. No refund, ledger, or wallet mutation happens
 * here or anywhere in the booking flow; financial execution belongs to the
 * authorized payment/refund services.
 */
export function assessCancellation(input: {
  initiator: CancellationInitiator;
  startsAt: Date;
  now?: Date;
  reason?: string;
}): CancellationAssessment {
  const now = input.now ?? new Date();
  const leadHours = Math.max(0, (input.startsAt.getTime() - now.getTime()) / (1000 * 60 * 60));
  const roundedLeadHours = Math.round(leadHours * 10) / 10;
  const base = {
    leadHours: roundedLeadHours,
    reason: input.reason,
    assessedAt: now.toISOString(),
  };

  if (input.initiator === 'tutor' || input.initiator === 'admin') {
    return {
      ...base,
      initiatedByRole: input.initiator,
      refundPercentage: 100,
      tutorCompensationPercentage: 0,
      penaltyNotice:
        input.initiator === 'tutor'
          ? leadHours >= 24
            ? '1 reliability point deducted'
            : '3 reliability points deducted + warning'
          : 'Administrative cancellation',
    };
  }

  if (leadHours >= 24) {
    return {
      ...base,
      initiatedByRole: input.initiator,
      refundPercentage: 100,
      tutorCompensationPercentage: 0,
      penaltyNotice: 'none',
    };
  }
  if (leadHours >= 4) {
    return {
      ...base,
      initiatedByRole: input.initiator,
      refundPercentage: 80,
      tutorCompensationPercentage: 20,
      penaltyNotice: 'none',
    };
  }
  return {
    ...base,
    initiatedByRole: input.initiator,
    refundPercentage: 0,
    tutorCompensationPercentage: 80,
    penaltyNotice: 'Late cancellation recorded on history',
  };
}
