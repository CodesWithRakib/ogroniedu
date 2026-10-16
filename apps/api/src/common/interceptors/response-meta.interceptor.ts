import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { randomUUID } from 'node:crypto';

/**
 * Standardizes API success responses into the canonical contract:
 * { success: true, data: T, message?: string, meta: { requestId } }
 *
 * Rules:
 * - Exempt endpoints (health probes, Swagger UI, webhook receivers, binary streams) bypass wrapping.
 * - Responses already carrying { success: true, ... } have meta.requestId stamped (never double-wrapped).
 * - Error envelopes ({ success: false, ... }) are untouched.
 * - Raw responses (plain objects, arrays, primitives) are wrapped into standard envelopes,
 *   with plain objects mirrored at root for backward compatibility with legacy consumers.
 */
@Injectable()
export class ResponseMetaInterceptor implements NestInterceptor {
  private isExemptRoute(url: string | undefined): boolean {
    if (!url) return false;
    return (
      url.startsWith('/health') ||
      url.startsWith('/api/docs') ||
      url.includes('/webhook') ||
      url.includes('/webhooks')
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId =
      request.requestId ||
      (request.headers['x-request-id'] as string) ||
      randomUUID();

    if (!request.requestId) {
      request.requestId = requestId;
    }
    if (typeof response?.setHeader === 'function' && !response.getHeader('x-request-id')) {
      response.setHeader('x-request-id', requestId);
    }

    if (this.isExemptRoute(request.url)) {
      return next.handle();
    }

    return next.handle().pipe(
      map((body: unknown) => {
        // Leave streams / Buffers untouched (e.g. file downloads)
        if (
          Buffer.isBuffer(body) ||
          (typeof body === 'object' &&
            body !== null &&
            'pipe' in body &&
            typeof (body as { pipe: unknown }).pipe === 'function')
        ) {
          return body;
        }

        // Void / null / undefined responses
        if (body === undefined || body === null) {
          return {
            success: true,
            data: null,
            meta: { requestId },
          };
        }

        // Arrays -> collection envelope
        if (Array.isArray(body)) {
          return {
            success: true,
            data: body,
            meta: { requestId },
          };
        }

        // Plain objects
        if (typeof body === 'object') {
          const record = body as Record<string, unknown>;

          // Already an error envelope from exception filter or controller
          if (record.success === false) {
            return body;
          }

          // Already carries canonical success flag
          if (record.success === true) {
            const existingMeta =
              record.meta && typeof record.meta === 'object' && !Array.isArray(record.meta)
                ? (record.meta as Record<string, unknown>)
                : {};

            if (typeof existingMeta.requestId === 'string') {
              return body;
            }

            return {
              ...record,
              meta: { ...existingMeta, requestId },
            };
          }

          // Raw object: wrap into canonical envelope, and spread properties for backwards compatibility
          return {
            success: true,
            data: body,
            meta: { requestId },
            ...record,
          };
        }

        // Primitives (number, boolean, string)
        return {
          success: true,
          data: body,
          meta: { requestId },
        };
      }),
    );
  }
}

