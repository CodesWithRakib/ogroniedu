import { describe, it, expect } from 'vitest';
import {
  calculateReplacementRefundShare,
  isReplacementDeadlineExpired,
  canTransitionReplacement,
  computeReplacementDeadline,
} from '../src/modules/trust/utils/replacement-policy.util';

describe('Tutor Replacement Policy Utilities (Phase 15)', () => {
  describe('calculateReplacementRefundShare', () => {
    it('should return 100% refund when 0 sessions were completed', () => {
      const res = calculateReplacementRefundShare(100000n, 0, 10);
      expect(res.refundablePoisha).toBe(100000n);
      expect(res.tutorEarnedPoisha).toBe(0n);
      expect(res.refundablePoisha + res.tutorEarnedPoisha).toBe(100000n);
    });

    it('should calculate proportional refund with exact balance when halfway', () => {
      const res = calculateReplacementRefundShare(100000n, 5, 10);
      expect(res.refundablePoisha).toBe(50000n);
      expect(res.tutorEarnedPoisha).toBe(50000n);
      expect(res.refundablePoisha + res.tutorEarnedPoisha).toBe(100000n);
    });

    it('should handle odd fractional divisions without losing a single poisha', () => {
      // 1000.00 BDT split across 3 sessions, 1 session completed
      const total = 100000n;
      const res = calculateReplacementRefundShare(total, 1, 3);
      // 100000 / 3 = 33333 poisha to tutor, remainder 66667 to refund
      expect(res.tutorEarnedPoisha).toBe(33333n);
      expect(res.refundablePoisha).toBe(66667n);
      expect(res.refundablePoisha + res.tutorEarnedPoisha).toBe(total);
    });

    it('should return 0 refund when all sessions completed', () => {
      const res = calculateReplacementRefundShare(50000n, 10, 10);
      expect(res.refundablePoisha).toBe(0n);
      expect(res.tutorEarnedPoisha).toBe(50000n);
    });

    it('should guard against zero or negative totals safely', () => {
      expect(calculateReplacementRefundShare(0n, 0, 10)).toEqual({
        refundablePoisha: 0n,
        tutorEarnedPoisha: 0n,
      });
      expect(calculateReplacementRefundShare(-100n, 0, 10)).toEqual({
        refundablePoisha: 0n,
        tutorEarnedPoisha: 0n,
      });
      expect(calculateReplacementRefundShare(1000n, 0, 0)).toEqual({
        refundablePoisha: 0n,
        tutorEarnedPoisha: 0n,
      });
    });
  });

  describe('isReplacementDeadlineExpired', () => {
    const fixedNow = new Date('2026-10-21T18:00:00.000Z');

    it('should detect when replacement matching deadline has passed', () => {
      const past = new Date('2026-10-21T17:59:59.000Z');
      const future = new Date('2026-10-21T18:00:01.000Z');
      expect(isReplacementDeadlineExpired(past, fixedNow)).toBe(true);
      expect(isReplacementDeadlineExpired(future, fixedNow)).toBe(false);
      expect(isReplacementDeadlineExpired(null, fixedNow)).toBe(false);
    });
  });

  describe('canTransitionReplacement', () => {
    it('should validate legal transitions from requested state', () => {
      expect(canTransitionReplacement('requested', 'under_review')).toBe(true);
      expect(canTransitionReplacement('requested', 'matching')).toBe(true);
      expect(canTransitionReplacement('requested', 'cancelled')).toBe(true);
      expect(canTransitionReplacement('requested', 'closed')).toBe(false);
      expect(canTransitionReplacement('requested', 'accepted')).toBe(false);
    });

    it('should enforce terminal closed state', () => {
      expect(canTransitionReplacement('closed', 'matching')).toBe(false);
      expect(canTransitionReplacement('closed', 'requested')).toBe(false);
    });
  });

  describe('computeReplacementDeadline', () => {
    it('should calculate deadline based on target hours', () => {
      const start = new Date('2026-10-21T10:00:00.000Z');
      const deadline = computeReplacementDeadline(start, 24);
      expect(deadline.toISOString()).toBe('2026-10-22T10:00:00.000Z');
    });
  });
});
