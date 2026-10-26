/**
 * Neutralizes CSV/Spreadsheet formula injection attacks (CSV Injection / CWE-1236).
 * If a cell string begins with formula trigger characters (=, +, -, @, \t, \r),
 * a single quote (') is prepended so spreadsheet interpreters treat it strictly as text.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  const str = String(value);
  let sanitized = str.trim();

  if (/^[=+\-@\t\r]/.test(sanitized)) {
    sanitized = `'${sanitized}`;
  }

  if (/[",\n\r]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }

  return sanitized;
}

/**
 * Serializes an array of object records to CSV format with formula injection protection.
 */
export function arrayToCsv(
  columns: Array<{ key: string; header: string }>,
  rows: Array<Record<string, unknown>>,
): string {
  const headerLine = columns.map((col) => sanitizeCsvCell(col.header)).join(',');
  const rowLines = rows.map((row) => columns.map((col) => sanitizeCsvCell(row[col.key])).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}
