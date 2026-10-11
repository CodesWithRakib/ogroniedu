/**
 * Single typed query-string serializer for all RTK Query feature APIs.
 * Replaces the per-service `toQueryString`/`toQuery` duplicates.
 */
export type QueryValue = string | number | boolean | undefined | null;

export function toQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
