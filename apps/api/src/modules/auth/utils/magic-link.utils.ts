import crypto from 'node:crypto';
import { hashToken } from './token.utils';

/** Entropy (bytes) of a magic-link token — 256 bits, URL-safe encoded. */
const MAGIC_LINK_TOKEN_BYTES = 32;

/**
 * Internal destinations a magic-link login may return the user to. Anything
 * else is dropped (the user still signs in and lands on their role dashboard).
 */
export const ALLOWED_REDIRECT_PREFIXES: readonly string[] = [
  '/dashboard',
  '/onboarding',
  '/admin',
  '/profile',
  '/bookings',
  '/requests',
  '/notifications',
  '/tutor',
  '/guardian',
];

export function generateMagicLinkToken(): string {
  return crypto.randomBytes(MAGIC_LINK_TOKEN_BYTES).toString('base64url');
}

/** SHA-256 representation stored in `auth_magic_links.token_hash`. */
export function hashMagicLinkToken(token: string): string {
  return hashToken(token);
}

/** Strip a leading locale segment (`/bn`, `/en`) before policy checks. */
function stripLocalePrefix(path: string): string {
  const match = path.match(/^\/(bn|en)(\/.*)?$/);
  if (!match) return path;
  return match[2] && match[2].length > 0 ? match[2] : '/';
}

/**
 * Validate a caller-supplied post-login destination.
 *
 * Rejects absolute URLs, protocol-relative URLs, backslash tricks, control
 * characters and any path outside {@link ALLOWED_REDIRECT_PREFIXES}. Returns the
 * normalized internal path, or `null` when the input is unusable — callers then
 * fall back to the role dashboard instead of failing the login.
 */
export function resolveSafeRedirectPath(candidate: unknown): string | null {
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.length > 256) return null;
  for (const char of trimmed) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return null;
  }
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return null;
  if (trimmed.includes('\\')) return null;

  const withoutLocale = stripLocalePrefix(trimmed);
  const allowed = ALLOWED_REDIRECT_PREFIXES.some(
    (prefix) => withoutLocale === prefix || withoutLocale.startsWith(`${prefix}/`),
  );
  return allowed ? trimmed : null;
}
