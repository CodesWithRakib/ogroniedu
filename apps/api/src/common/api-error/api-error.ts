/**
 * Canonical API error contract (see docs/architecture/api-contract-standard.md).
 * { success:false, error:{code,message,details?}, meta:{requestId} }
 */

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INVALID_CURSOR'
  | 'SORT_NOT_ALLOWED'
  | 'PAYMENT_REQUIRED'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

export interface ApiErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
  meta: { requestId?: string };
}

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  402: 'PAYMENT_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
};

export function codeForStatus(status: number): ApiErrorCode {
  if (status in STATUS_TO_CODE) return STATUS_TO_CODE[status];
  if (status >= 500) return 'INTERNAL_ERROR';
  if (status >= 400) return 'VALIDATION_ERROR';
  return 'INTERNAL_ERROR';
}

export function errorEnvelope(args: {
  code: ApiErrorCode;
  message: string;
  details?: ApiErrorDetail[];
  requestId?: string;
}): ApiErrorEnvelope {
  return {
    success: false,
    error: {
      code: args.code,
      message: args.message,
      ...(args.details !== undefined ? { details: args.details } : {}),
    },
    meta: args.requestId ? { requestId: args.requestId } : {},
  };
}

/**
 * Normalize class-validator ValidationPipe errors (string[] | ValidationError[]) into details[].
 * Accepts the raw `message` payload from HttpException responses.
 */
export function toErrorDetails(message: unknown): ApiErrorDetail[] | undefined {
  if (!Array.isArray(message)) return undefined;
  return message.map((m) => {
    if (typeof m === 'string') return { code: 'INVALID_VALUE', message: m };
    if (typeof m === 'object' && m !== null) {
      const r = m as Record<string, unknown>;
      const field =
        typeof r.property === 'string'
          ? r.property
          : typeof r.field === 'string'
            ? r.field
            : undefined;
      const msg =
        typeof r.message === 'string'
          ? r.message
          : typeof m === 'object'
            ? JSON.stringify(m)
            : 'Invalid value.';
      const code = typeof r.code === 'string' ? r.code : 'INVALID_VALUE';
      return field ? { field, code, message: msg } : { code, message: msg };
    }
    return { code: 'INVALID_VALUE', message: String(m) };
  });
}
