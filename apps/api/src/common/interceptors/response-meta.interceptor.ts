import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { randomUUID } from 'node:crypto';
import { sanitizeRequestPath } from '../utils/request-sanitizer';

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
      url === '/' ||
      url === '' ||
      url.startsWith('/?') ||
      url.startsWith('/health') ||
      url.startsWith('/api/docs') ||
      url.includes('/webhook') ||
      url.includes('/webhooks')
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (typeof context.getType === 'function' && context.getType() !== 'http') {
      return next.handle();
    }

    const ctx = context.switchToHttp?.();
    const request = ctx?.getRequest<Request>();
    const response = ctx?.getResponse<Response>();

    if (!request) {
      return next.handle();
    }

    const requestId =
      request.requestId || (request.headers?.['x-request-id'] as string) || randomUUID();

    if (!request.requestId) {
      request.requestId = requestId;
    }
    if (typeof response?.setHeader === 'function' && !response.getHeader('x-request-id')) {
      response.setHeader('x-request-id', requestId);
    }

    if (this.isExemptRoute(request.url)) {
      return next.handle();
    }

    const path = sanitizeRequestPath(request.originalUrl || request.url);
    const method = request.method || 'GET';
    const timestamp = new Date().toISOString();

    const buildMeta = (existingMeta?: Record<string, unknown>) => ({
      ...existingMeta,
      requestId:
        (typeof existingMeta?.requestId === 'string' && existingMeta.requestId) || requestId,
      timestamp:
        (typeof existingMeta?.timestamp === 'string' && existingMeta.timestamp) || timestamp,
      path: (typeof existingMeta?.path === 'string' && existingMeta.path) || path,
      method: (typeof existingMeta?.method === 'string' && existingMeta.method) || method,
    });

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
            meta: buildMeta(),
          };
        }

        // Arrays -> collection envelope
        if (Array.isArray(body)) {
          return {
            success: true,
            data: body,
            meta: buildMeta(),
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

            return {
              ...record,
              meta: buildMeta(existingMeta),
            };
          }

          // Raw object: wrap into canonical envelope, and spread properties for backwards compatibility
          return {
            success: true,
            data: body,
            meta: buildMeta(),
            ...record,
          };
        }

        // Primitives (number, boolean, string)
        return {
          success: true,
          data: body,
          meta: buildMeta(),
        };
      }),
    );
  }
}
