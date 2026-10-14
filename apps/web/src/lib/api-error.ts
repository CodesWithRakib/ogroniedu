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
  if (typeof data === 'string' && data.trim()) return data;
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;
    // Canonical envelope: { success:false, error:{ code, message, details? } }
    const err = record.error;
    if (typeof err === 'object' && err !== null) {
      const errRec = err as Record<string, unknown>;
      if (typeof errRec.message === 'string' && errRec.message.trim()) return errRec.message;
      const details = errRec.details;
      if (Array.isArray(details)) {
        const first = details[0] as Record<string, unknown> | undefined;
        if (first && typeof first.message === 'string' && first.message.trim()) {
          return first.message;
        }
      }
    }
    const direct = record.message;
    if (typeof direct === 'string' && direct.trim()) return direct;
    // Legacy Nest shape: { statusCode, message: string | string[] }
    if (Array.isArray(direct) && typeof direct[0] === 'string') return direct[0];
    const errors = record.errors;
    if (Array.isArray(errors) && typeof errors[0] === 'string') return errors[0];
    if (Array.isArray(errors) && errors[0] && typeof errors[0] === 'object') {
      const first = errors[0] as Record<string, unknown>;
      if (typeof first.message === 'string') return first.message;
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
