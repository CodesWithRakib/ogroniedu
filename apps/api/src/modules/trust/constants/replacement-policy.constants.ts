import type { ReplacementStatus } from '../entities/tutor-replacement-case.entity';

/**
 * Repository policy (`docs/BUSINESS_RULES.md` §3):
 *  - request window: 48 hours after the first trial session;
 *  - matching target: 24 hours;
 *  - up to 2 alternate tutors;
 *  - 100% refund if no replacement is accepted.
 *
 * The Phase 03 brief mentions a 48-hour matching target; the repository policy
 * is authoritative and the target is configurable so operations can change it
 * without a code change. See docs/features/tutor-discovery/REPLACEMENT_WORKFLOW.md.
 */
export const REPLACEMENT_POLICY_VERSION = 'v1.1-tutor-replacement-guarantee';

export const DEFAULT_REPLACEMENT_MATCH_TARGET_HOURS = 24;
export const MAX_REPLACEMENT_MATCH_TARGET_HOURS = 48;
export const REPLACEMENT_REQUEST_WINDOW_HOURS = 48;
export const REPLACEMENT_MAX_OFFERS = 2;
export const REPLACEMENT_REFUND_REVIEW_BUSINESS_DAYS = 3;

/** Deadline extension bounds accepted from staff. */
export const MIN_DEADLINE_EXTENSION_HOURS = 1;
export const MAX_DEADLINE_EXTENSION_HOURS = 72;

export function resolveReplacementMatchTargetHours(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.TUTOR_REPLACEMENT_MATCH_TARGET_HOURS);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_REPLACEMENT_MATCH_TARGET_HOURS) {
    return DEFAULT_REPLACEMENT_MATCH_TARGET_HOURS;
  }
  return parsed;
}

/** Server-clock deadline; callers persist the result. */
export function computeReplacementDeadline(
  from: Date,
  hours = resolveReplacementMatchTargetHours(),
): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Allowed status transitions. `accepted` is intentionally absent from every
 * staff-editable target: acceptance requires the participant consent endpoint.
 */
export const REPLACEMENT_TRANSITIONS: Record<ReplacementStatus, readonly ReplacementStatus[]> = {
  requested: ['under_review', 'matching', 'cancelled'],
  under_review: ['matching', 'rejected', 'cancelled'],
  matching: ['offered', 'refund_eligible', 'rejected', 'cancelled'],
  offered: ['matching', 'accepted', 'refund_eligible', 'rejected', 'cancelled'],
  accepted: ['closed'],
  rejected: ['closed'],
  refund_eligible: ['closed'],
  closed: [],
  cancelled: [],
};

export function canTransitionReplacement(from: ReplacementStatus, to: ReplacementStatus): boolean {
  return REPLACEMENT_TRANSITIONS[from].includes(to);
}

/** Statuses in which the case still consumes the guarantee clock. */
export const OPEN_REPLACEMENT_STATUSES: readonly ReplacementStatus[] = [
  'requested',
  'under_review',
  'matching',
  'offered',
];

/** Statuses that may be cancelled by the participant before an offer. */
export const PARTICIPANT_CANCELLABLE_STATUSES: readonly ReplacementStatus[] = [
  'requested',
  'under_review',
];

/** Statuses that set `resolved_at` and stop the deadline clock. */
export const RESOLVED_REPLACEMENT_STATUSES: readonly ReplacementStatus[] = [
  'accepted',
  'rejected',
  'closed',
  'refund_eligible',
  'cancelled',
];
