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
  meta: {
    requestId?: string;
    timestamp?: string;
    path?: string;
    method?: string;
  };
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
  timestamp?: string;
  path?: string;
  method?: string;
}): ApiErrorEnvelope {
  const meta: ApiErrorEnvelope['meta'] = {};
  if (args.requestId) meta.requestId = args.requestId;
  if (args.timestamp) meta.timestamp = args.timestamp;
  if (args.path) meta.path = args.path;
  if (args.method) meta.method = args.method;

  return {
    success: false,
    error: {
      code: args.code,
      message: args.message,
      ...(args.details !== undefined ? { details: args.details } : {}),
    },
    meta,
  };
}

/**
 * Normalize class-validator ValidationPipe errors (string[] | ValidationError[]) into details[].
 * Accepts the raw `message` payload from HttpException responses.
 */
export function toErrorDetails(message: unknown): ApiErrorDetail[] | undefined {
  if (!Array.isArray(message)) return undefined;
  const out: ApiErrorDetail[] = [];
  for (const m of message) {
    if (typeof m === 'string') {
      out.push({ code: 'INVALID_VALUE', message: m });
      continue;
    }
    if (typeof m === 'object' && m !== null) {
      const r = m as Record<string, unknown>;
      const field = typeof r.property === 'string' ? r.property : undefined;
      // class-validator ValidationError: { property, constraints: { key: msg } }
      if (field && typeof r.constraints === 'object' && r.constraints !== null) {
        for (const [key, msg] of Object.entries(r.constraints as Record<string, unknown>)) {
          if (typeof msg === 'string') {
            out.push({ field, code: toDetailCode(key), message: msg });
          }
        }
        continue;
      }
      const msg = typeof r.message === 'string' ? r.message : JSON.stringify(m);
      const code = typeof r.code === 'string' ? r.code : 'INVALID_VALUE';
      out.push(field ? { field, code, message: msg } : { code, message: msg });
    } else {
      out.push({ code: 'INVALID_VALUE', message: String(m) });
    }
  }
  return out;
}

/** Map class-validator constraint keys to stable detail codes. */
function toDetailCode(constraint: string): string {
  const map: Record<string, string> = {
    isNotEmpty: 'REQUIRED',
    isDefined: 'REQUIRED',
    isEmail: 'INVALID_FORMAT',
    isUUID: 'INVALID_FORMAT',
    minLength: 'TOO_SHORT',
    maxLength: 'TOO_LONG',
    min: 'TOO_SMALL',
    max: 'TOO_LARGE',
    isIn: 'INVALID_VALUE',
    isInt: 'INVALID_TYPE',
    isString: 'INVALID_TYPE',
    isNumber: 'INVALID_TYPE',
    isBoolean: 'INVALID_TYPE',
  };
  return map[constraint] ?? 'INVALID_VALUE';
}
