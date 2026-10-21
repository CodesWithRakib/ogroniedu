import { describe, it, expect } from 'vitest';
import {
  isAccountBlocked,
  generateSecureOtpCode,
  isTokenExpired,
  isOtpMaxAttemptsExceeded,
  calculateOtpExpiry,
  calculateMagicLinkExpiry,
} from '../src/modules/auth/utils/auth-policy.util';

describe('Auth Policy & Security Utilities (Phase 15)', () => {
  describe('Account Status Blocking Policy', () => {
    it('should identify blocked account statuses', () => {
      expect(isAccountBlocked('suspended')).toBe(true);
      expect(isAccountBlocked('deactivated')).toBe(true);
      expect(isAccountBlocked('deletion_pending')).toBe(true);
      expect(isAccountBlocked('  SUSPENDED  ')).toBe(true);
    });

    it('should permit active and unverified statuses', () => {
      expect(isAccountBlocked('active')).toBe(false);
      expect(isAccountBlocked('pending_verification')).toBe(false);
      expect(isAccountBlocked(null)).toBe(false);
      expect(isAccountBlocked(undefined)).toBe(false);
    });
  });

  describe('Secure OTP Code Generator', () => {
    it('should generate a 6-digit numeric string', () => {
      for (let i = 0; i < 20; i++) {
        const code = generateSecureOtpCode(6);
        expect(code).toMatch(/^\d{6}$/);
        const num = parseInt(code, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });

    it('should support customizable digit lengths', () => {
      const code4 = generateSecureOtpCode(4);
      expect(code4).toMatch(/^\d{4}$/);
      const code8 = generateSecureOtpCode(8);
      expect(code8).toMatch(/^\d{8}$/);
    });
  });

  describe('Token Expiration Calculations', () => {
    const fixedNow = new Date('2026-10-21T12:00:00.000Z');

    it('should correctly evaluate past vs future tokens', () => {
      const past = new Date('2026-10-21T11:59:59.000Z');
      const future = new Date('2026-10-21T12:00:01.000Z');
      expect(isTokenExpired(past, fixedNow)).toBe(true);
      expect(isTokenExpired(future, fixedNow)).toBe(false);
    });

    it('should calculate exact OTP expiration', () => {
      const expiry = calculateOtpExpiry(600, fixedNow);
      expect(expiry.toISOString()).toBe('2026-10-21T12:10:00.000Z');
    });

    it('should calculate exact magic link expiration', () => {
      const expiry = calculateMagicLinkExpiry(15, fixedNow);
      expect(expiry.toISOString()).toBe('2026-10-21T12:15:00.000Z');
    });
  });

  describe('OTP Attempt Throttle Policy', () => {
    it('should block when attempts reach or exceed maximum', () => {
      expect(isOtpMaxAttemptsExceeded(0, 5)).toBe(false);
      expect(isOtpMaxAttemptsExceeded(4, 5)).toBe(false);
      expect(isOtpMaxAttemptsExceeded(5, 5)).toBe(true);
      expect(isOtpMaxAttemptsExceeded(6, 5)).toBe(true);
    });
  });
});
