/**
 * Recursively redacts sensitive keys (passwords, tokens, secrets, card data, …)
 * from arbitrary payloads before they are returned in admin API responses
 * or written to logs.
 */
export function redactSensitiveData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  // Preserve non-plain built-ins — Object.entries would flatten a Date to `{}`,
  // silently dropping timestamps from API responses.
  if (obj instanceof Date) return obj;
  if (obj instanceof Map || obj instanceof Set || obj instanceof RegExp) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item)) as T;
  }
  const redacted: Record<string, unknown> = {};
  const sensitiveKeyRegex =
    /(password|token|secret|cvv|pan|card|pin|hash|credential|api_?key|^key$|nid|national_?id|passport|ssn)/i;

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (sensitiveKeyRegex.test(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted as T;
}
