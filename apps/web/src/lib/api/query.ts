/**
 * Single typed query-string serializer for all RTK Query feature APIs.
 * Replaces the per-service `toQueryString`/`toQuery` duplicates.
 */
export type QueryValue = string | number | boolean | undefined | null;

export function toQueryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      continue;
    }
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
