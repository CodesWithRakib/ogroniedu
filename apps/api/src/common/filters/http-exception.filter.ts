import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import {
  codeForStatus,
  errorEnvelope,
  toErrorDetails,
  type ApiErrorCode,
} from '../api-error/api-error';

/**
 * Middleware-level failures raised before Nest's exception layer (e.g. the
 * express body-parser SyntaxError for a malformed JSON body) are not
 * HttpExceptions but still carry a truthful 4xx `status`/`statusCode`.
 * Honor it so client mistakes are never reported as sanitized 500s.
 */
function resolveHttpStatus(exception: unknown): number {
  if (exception instanceof HttpException) return exception.getStatus();
  if (typeof exception === 'object' && exception !== null) {
    const err = exception as { status?: unknown; statusCode?: unknown };
    const candidate = typeof err.status === 'number' ? err.status : err.statusCode;
    if (typeof candidate === 'number' && candidate >= 400 && candidate < 500) return candidate;
  }
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

/**
 * Canonical error envelope: { success:false, error:{code,message,details?}, meta:{requestId} }.
 * - Validation errors (400/422) carry field-level details[] for frontend forms.
 * - 5xx responses are sanitized (no stack/SQL/secrets); full trace is logged server-side.
 * - requestId from RequestIdMiddleware is always echoed in meta + x-request-id header.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (!request || !response || typeof response.status !== 'function') {
      return;
    }

    // Middleware-level errors (body parser) can precede RequestIdMiddleware;
    // generate a fallback so every error envelope stays traceable.
    const requestId =
      request.requestId ?? (request.headers?.['x-request-id'] as string) ?? randomUUID();
    if (!request.requestId && typeof response.setHeader === 'function') {
      response.setHeader('x-request-id', requestId);
    }

    const status = resolveHttpStatus(exception);

    let code: ApiErrorCode = codeForStatus(status);
    let message = 'The request could not be processed.';
    let details: ReturnType<typeof toErrorDetails> = undefined;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (typeof resObj.code === 'string') code = resObj.code as ApiErrorCode;
        const rawMessage = resObj.message ?? exception.message;
        if (typeof rawMessage === 'string') {
          message = rawMessage;
        } else {
          details = toErrorDetails(rawMessage);
          message =
            status === 422 || status === 400
              ? 'The request contains invalid fields.'
              : exception.message;
        }
        if (code === 'VALIDATION_ERROR' && details === undefined && Array.isArray(rawMessage)) {
          details = toErrorDetails(rawMessage);
        }
      } else {
        message = exception.message;
      }
      if (status === 401 && code === 'VALIDATION_ERROR') code = 'UNAUTHORIZED';
      if (status === 403 && code === 'VALIDATION_ERROR') code = 'FORBIDDEN';
      if (status === 404 && code === 'VALIDATION_ERROR') code = 'NOT_FOUND';
      if (status === 409 && code === 'VALIDATION_ERROR') code = 'CONFLICT';
    } else if (status < 500) {
      // Client-correctable middleware error (e.g. body-parser SyntaxError):
      // keep the canonical envelope but never report it as an internal error.
      const type = (exception as { type?: unknown }).type;
      code = codeForStatus(status);
      message =
        type === 'entity.parse.failed'
          ? 'The request body is not valid JSON.'
          : 'The request could not be processed.';
    } else {
      code = 'INTERNAL_ERROR';
      message = 'Internal server error. Please contact support with request ID.';
    }

    if (status >= 500) {
      const detail =
        exception instanceof Error ? `${exception.message}\n${exception.stack}` : String(exception);
      this.logger.error(
        `[${requestId || 'no-id'}] ${request.method} ${request.url} - ${status} ${code}: ${detail}`,
      );
    } else {
      this.logger.warn(
        `[${requestId || 'no-id'}] ${request.method} ${request.url} - ${status} ${code}: ${message}`,
      );
    }

    response.status(status).json(errorEnvelope({ code, message, details, requestId }));
  }
}
