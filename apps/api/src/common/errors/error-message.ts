/**
 * Safely extract a human-readable message from an unknown thrown value
 * (catch clauses receive `unknown`). Never assumes the value is an Error.
 */
export function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}
