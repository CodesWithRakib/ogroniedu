import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';

export interface NormalizedApiError {
  status: number | string;
  message: string;
  fields?: Record<string, string[]>;
}

function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error;
}

function messageFromData(data: unknown, fallback: string): string {
  return extractExactErrorMessage(data, fallback);
}

/** Extract an exact, human-readable error message from any backend API or runtime error. */
export function extractExactErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred. Please try again.',
): string {
  if (!error) return fallback;

  // 1. If error is a string
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractExactErrorMessage(parsed, fallback);
      } catch {
        return trimmed;
      }
    }
    return trimmed || fallback;
  }

  // 2. If error is an Error instance
  if (error instanceof Error && error.message) {
    if (error.message.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(error.message);
        return extractExactErrorMessage(parsed, fallback);
      } catch {
        // proceed
      }
    }
    if (!('data' in (error as any))) {
      return error.message;
    }
  }

  // 3. Inspect object structures (RTK Query FetchBaseQueryError, Axios, NestJS)
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;

    // Case A: RTK Query FetchBaseQueryError where payload is under `data`
    const payload = obj.data !== undefined ? obj.data : obj;

    if (typeof payload === 'string' && payload.trim()) {
      const trimmed = payload.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          return extractExactErrorMessage(parsed, fallback);
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }

    if (typeof payload === 'object' && payload !== null) {
      const p = payload as Record<string, unknown>;

      // Canonical backend envelope: { success: false, error: { code, message, details } }
      if (p.error && typeof p.error === 'object' && p.error !== null) {
        const errObj = p.error as Record<string, unknown>;

        // If there are specific validation details, format them clearly
        if (Array.isArray(errObj.details) && errObj.details.length > 0) {
          const detailMsgs = errObj.details
            .map((d: any) => {
              if (typeof d === 'string') return d;
              if (typeof d === 'object' && d !== null) {
                const field = d.field ? `${d.field}: ` : '';
                const msg = d.message || JSON.stringify(d);
                return `${field}${msg}`;
              }
              return String(d);
            })
            .filter(Boolean);

          if (detailMsgs.length > 0) {
            return detailMsgs.join('; ');
          }
        }

        if (typeof errObj.message === 'string' && errObj.message.trim()) {
          return errObj.message.trim();
        }
      }

      // Case B: NestJS default validation pipe: { statusCode: 400, message: string | string[], error: string }
      if (Array.isArray(p.message) && p.message.length > 0) {
        const msgs = p.message.map((m) => {
          if (typeof m === 'string') return m;
          if (typeof m === 'object' && m !== null) {
            return (m as any).message || JSON.stringify(m);
          }
          return String(m);
        });
        return msgs.join('; ');
      }

      if (typeof p.message === 'string' && p.message.trim()) {
        return p.message.trim();
      }

      // Case C: Array of errors: { errors: [...] }
      if (Array.isArray(p.errors) && p.errors.length > 0) {
        const msgs = p.errors.map((e) => {
          if (typeof e === 'string') return e;
          if (typeof e === 'object' && e !== null) {
            return (e as any).message || (e as any).detail || JSON.stringify(e);
          }
          return String(e);
        });
        return msgs.join('; ');
      }

      // Case D: Direct detail or description (Postgres or RFC 7807 problem details)
      if (typeof p.detail === 'string' && p.detail.trim()) {
        return p.detail.trim();
      }
      if (typeof p.description === 'string' && p.description.trim()) {
        return p.description.trim();
      }

      // Case E: If error property itself is a string
      if (typeof p.error === 'string' && p.error.trim()) {
        return p.error.trim();
      }
    }

    // Direct error object's message
    if (typeof obj.message === 'string' && obj.message.trim()) {
      return obj.message.trim();
    }
  }

  return fallback;
}

/** Normalize RTK Query errors into a localized display message. */
export function normalizeApiError(
  error: FetchBaseQueryError | SerializedError | undefined,
  locale: 'bn' | 'en' = 'bn',
): NormalizedApiError {
  const isBn = locale === 'bn';
  if (!error) {
    return {
      status: 'UNKNOWN',
      message: isBn ? 'অজ্ঞাত ত্রুটি ঘটেছে।' : 'An unknown error occurred.',
    };
  }
  if (!isFetchBaseQueryError(error)) {
    return {
      status: 'CLIENT',
      message:
        error.message ||
        (isBn ? 'অনুরোধ প্রক্রিয়া করা যায়নি।' : 'The request could not be processed.'),
    };
  }
  if (error.status === 'FETCH_ERROR') {
    return {
      status: 'FETCH_ERROR',
      message: isBn
        ? 'সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি। ইন্টারনেট পরীক্ষা করে আবার চেষ্টা করুন।'
        : 'Could not reach the server. Check your connection and try again.',
    };
  }
  if (error.status === 'TIMEOUT_ERROR' || error.status === 'PARSING_ERROR') {
    return {
      status: error.status,
      message: isBn ? 'সার্ভারের উত্তর পড়া যায়নি। আবার চেষ্টা করুন।' : 'Invalid server response.',
    };
  }
  const status = typeof error.status === 'number' ? error.status : 500;
  if (status === 401) {
    return {
      status,
      message: isBn
        ? 'আপনার সেশন শেষ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।'
        : 'Your session expired. Please sign in again.',
    };
  }
  if (status === 403) {
    return {
      status,
      message: isBn
        ? 'এই কাজের অনুমতি আপনার নেই।'
        : 'You do not have permission to perform this action.',
    };
  }
  if (status === 404) {
    return {
      status,
      message: isBn ? 'তথ্য খুঁজে পাওয়া যায়নি।' : 'The requested record was not found.',
    };
  }
  if (status === 409) {
    return {
      status,
      message: messageFromData(
        error.data,
        isBn ? 'এই তথ্য ইতিমধ্যে বিদ্যমান।' : 'This record already exists.',
      ),
    };
  }
  if (status === 422 || status === 400) {
    return {
      status,
      message: messageFromData(
        error.data,
        isBn ? 'দেওয়া তথ্য সঠিক নয়। যাচাই করে আবার চেষ্টা করুন।' : 'Validation failed.',
      ),
    };
  }
  return {
    status,
    message: messageFromData(
      error.data,
      isBn ? 'সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।' : 'Server error. Try again.',
    ),
  };
}

/** Type-safe error normalization: accepts unknown RTK errors without `as never` casts. */
export function normalizeUnknownError(
  error: unknown,
  locale: 'bn' | 'en' = 'bn',
): NormalizedApiError {
  return normalizeApiError(error as FetchBaseQueryError | SerializedError | undefined, locale);
}

/** Build a stable idempotency key for payment/order mutations. */
export function newIdempotencyKey(prefix = 'idem'): string {
  try {
    return `${prefix}-${crypto.randomUUID()}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
