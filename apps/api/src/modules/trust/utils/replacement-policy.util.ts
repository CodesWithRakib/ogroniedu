import {
  canTransitionReplacement,
  computeReplacementDeadline,
  REPLACEMENT_POLICY_VERSION,
  REPLACEMENT_MAX_OFFERS,
} from '../constants/replacement-policy.constants';
import type { ReplacementStatus } from '../entities/tutor-replacement-case.entity';

export type { ReplacementStatus };

export {
  canTransitionReplacement,
  computeReplacementDeadline,
  REPLACEMENT_POLICY_VERSION,
  REPLACEMENT_MAX_OFFERS,
};

/**
 * Calculates fair integer-poisha refund split for tutor replacement or cancellation.
 * Guarantees refundablePoisha + tutorEarnedPoisha === totalPricePoisha exactly with no rounding drift.
 */
export function calculateReplacementRefundShare(
  totalPricePoisha: bigint | number,
  completedSessions: number,
  totalSessions: number,
): { refundablePoisha: bigint; tutorEarnedPoisha: bigint } {
  const total = BigInt(totalPricePoisha);
  if (total <= 0n || totalSessions <= 0) {
    return { refundablePoisha: 0n, tutorEarnedPoisha: 0n };
  }
  if (completedSessions <= 0) {
    return { refundablePoisha: total, tutorEarnedPoisha: 0n };
  }
  if (completedSessions >= totalSessions) {
    return { refundablePoisha: 0n, tutorEarnedPoisha: total };
  }

  const tutorEarned = (total * BigInt(completedSessions)) / BigInt(totalSessions);
  const refundable = total - tutorEarned;

  return {
    refundablePoisha: refundable,
    tutorEarnedPoisha: tutorEarned,
  };
}

/**
 * Checks whether an open replacement case has passed its statutory matching deadline.
 */
export function isReplacementDeadlineExpired(
  deadlineAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!deadlineAt) return false;
  return now.getTime() > new Date(deadlineAt).getTime();
}
