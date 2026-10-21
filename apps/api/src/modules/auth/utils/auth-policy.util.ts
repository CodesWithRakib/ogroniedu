import crypto from 'node:crypto';

/** Account statuses that must never authenticate or refresh. */
export const BLOCKED_STATUSES: readonly string[] = [
  'suspended',
  'deactivated',
  'deletion_pending',
];

/**
 * Returns true if the account status prevents authentication or token refresh.
 */
export function isAccountBlocked(status: string | null | undefined): boolean {
  if (!status) return false;
  return BLOCKED_STATUSES.includes(status.toLowerCase().trim());
}

/**
 * Generates a cryptographically random numeric OTP code (default 6 digits).
 */
export function generateSecureOtpCode(digits = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return String(crypto.randomInt(min, max + 1));
}

/**
 * Checks whether an OTP or token has expired.
 */
export function isTokenExpired(expiresAt: Date | string | number, now: Date = new Date()): boolean {
  const expTime = new Date(expiresAt).getTime();
  return now.getTime() > expTime;
}

/**
 * Checks if wrong OTP attempt count has exceeded maximum allowed attempts.
 */
export function isOtpMaxAttemptsExceeded(attempts: number, maxAttempts = 5): boolean {
  return attempts >= maxAttempts;
}

/**
 * Calculates absolute expiration Date for OTP.
 */
export function calculateOtpExpiry(ttlSeconds = 600, now: Date = new Date()): Date {
  return new Date(now.getTime() + ttlSeconds * 1000);
}

/**
 * Calculates absolute expiration Date for magic links.
 */
export function calculateMagicLinkExpiry(ttlMinutes = 15, now: Date = new Date()): Date {
  return new Date(now.getTime() + ttlMinutes * 60 * 1000);
}
