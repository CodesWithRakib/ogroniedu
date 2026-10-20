/**
 * Sensitive query parameter keys that must never appear in response metadata or logs.
 */
const SENSITIVE_QUERY_PATTERNS = [
  'token',
  'secret',
  'password',
  'key',
  'auth',
  'signature',
  'credential',
  'cvv',
  'pin',
  'otp',
  'cookie',
  'session',
];

/**
 * Sanitizes request URL/path for inclusion in response metadata envelopes and error logs.
 * Preserves the path hierarchy while redacting sensitive query parameter values.
 */
export function sanitizeRequestPath(rawUrl: string | undefined): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  const qIndex = trimmed.indexOf('?');
  if (qIndex === -1) {
    return trimmed;
  }

  const path = trimmed.substring(0, qIndex);
  const search = trimmed.substring(qIndex + 1);
  if (!search) {
    return path;
  }

  try {
    const params = new URLSearchParams(search);
    for (const [key] of Array.from(params.entries())) {
      const lower = key.toLowerCase();
      if (SENSITIVE_QUERY_PATTERNS.some((p) => lower.includes(p))) {
        params.set(key, '[REDACTED]');
      }
    }

    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  } catch {
    return path;
  }
}
