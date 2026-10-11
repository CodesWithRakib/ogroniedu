import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Injects `meta.requestId` into `{success:true,...}` envelopes.
 * Never double-wraps: skips responses that already carry `meta`, lack `success:true`,
 * or are streams/buffers (file downloads). Exempt routes (health/webhooks) bypass via controller design.
 */
@Injectable()
export class ResponseMetaInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const requestId = request.requestId;
    if (!requestId) return next.handle();
    return next.handle().pipe(
      map((body: unknown) => {
        if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
        const record = body as Record<string, unknown>;
        if (record.success !== true) return body;
        if (Buffer.isBuffer(body)) return body;
        const meta = record.meta;
        if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
          const metaRecord = meta as Record<string, unknown>;
          if (typeof metaRecord.requestId === 'string') return body;
          return { ...record, meta: { ...metaRecord, requestId } };
        }
        return { ...record, meta: { requestId } };
      }),
    );
  }
}
