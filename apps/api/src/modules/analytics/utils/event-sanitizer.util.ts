const FORBIDDEN_PROPERTY_SUBSTRINGS = [
  'password',
  'token',
  'secret',
  'otp',
  'auth',
  'credential',
  'card',
  'cvv',
  'pin',
  'phone',
  'email',
  'message',
  'content',
  'evidence',
  'address',
  'national_id',
  'nid',
];

/**
 * Sanitizes arbitrary event properties to enforce privacy and data minimization.
 * - Strips any keys matching forbidden substrings.
 * - Truncates excessively long string values (max 256 characters).
 * - Caps maximum total properties (max 20 keys).
 */
export function sanitizeAnalyticsProperties(
  properties?: Record<string, unknown>,
): Record<string, unknown> {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};
  let count = 0;

  for (const [key, value] of Object.entries(properties)) {
    if (count >= 20) break;

    const lowerKey = key.toLowerCase();
    const isForbidden = FORBIDDEN_PROPERTY_SUBSTRINGS.some((sub) => lowerKey.includes(sub));
    if (isForbidden) {
      continue;
    }

    if (typeof value === 'string') {
      sanitized[key] = value.length > 256 ? value.substring(0, 256) : value;
      count++;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
      count++;
    } else if (value === null) {
      sanitized[key] = null;
      count++;
    }
    // Nested objects / arrays are ignored to keep event payloads flat, predictable, and privacy-preserving
  }

  return sanitized;
}
