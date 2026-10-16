# API Contract Standard (Phase 22) — normative for `apps/api` + `apps/web`

## 1. Success — single resource

```json
{ "success": true, "data": { "id": "uuid" }, "message": "Optional human message.", "meta": { "requestId": "req-..." } }
```

`message` is optional and never parsed programmatically. `data` may be `null` for void mutations (prefer returning the mutated resource when cheap).

## 2. Success — offset collection

```json
{
  "success": true, "data": [],
  "meta": {
    "requestId": "req-...",
    "pagination": { "strategy": "offset", "page": 1, "pageSize": 20, "totalItems": 145, "totalPages": 8, "hasNextPage": true, "hasPreviousPage": false }
  }
}
```

Query params: `page` (1-based, default 1), `pageSize` (default 20, max 100; tutor search max 50 preserved), `search`, `sortBy` (whitelisted per resource), `sortOrder` (`asc|desc`), domain filters. Backend validates via `OffsetPaginationQueryDto`; unknown `sortBy` → `SORT_NOT_ALLOWED` (400), never SQL-interpolated.

Migration: legacy top-level `total`, `page`, `limit`, `totalPages` are still sent alongside `meta.pagination` until frontend cutover (see backlog B-C1), then removed. Frontend must read `meta.pagination` first, fall back to legacy fields only via `parseOffsetCollection()`.

## 3. Success — cursor collection

```json
{
  "success": true, "data": [],
  "meta": {
    "requestId": "req-...",
    "pagination": { "strategy": "cursor", "nextCursor": "opaque-or-null", "previousCursor": null, "hasNextPage": true, "pageSize": 20 }
  }
}
```

Query params: `cursor` (opaque, base64url of `[lastCreatedAt, lastId]`), `pageSize` (default 20, max 100), `direction` (`next|prev`, default `next`). Ordering is deterministic `(created_at DESC, id DESC)` or per-resource documented tie-break. Invalid cursor → `INVALID_CURSOR` (400). Never expose raw timestamps/IDs as cursors; never return `totalPages` for cursor resources. Applies to: booking chat messages, notifications, audit/activity feeds.

## 4. Error

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "The request contains invalid fields.", "details": [{ "field": "email", "code": "INVALID_FORMAT", "message": "Enter a valid email address." }] },
  "meta": { "requestId": "req-..." }
}
```

Stable codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INVALID_CURSOR`, `SORT_NOT_ALLOWED`, `PAYMENT_REQUIRED`, `UPSTREAM_ERROR`, `INTERNAL_ERROR`. HTTP status still carries the primary signal (400/401/403/404/409/422/429/500); `code` is for i18n + field mapping. `details[]` is for 400/422 only. Never send stack traces, SQL, secrets, or full user objects in errors. Non-production may add `meta.debugId` (never `stack`).

Legacy compat: `AllExceptionsFilter` previously returned `{statusCode, error, message, timestamp, path}`. The new filter returns the canonical shape; `lib/api/parse.ts:normalizeApiError` accepts both (legacy branch marked `@deprecated`, removed after cutover).

## 5. Exempt endpoints (no envelope)

`GET /health/live`, `/health/ready` (terminus format), file downloads/streams, webhook receivers (`/payments/webhooks/*` preserve provider signatures), Socket.IO gateway payloads (versioned separately in `@ogroniedu/contracts`).

## 6. Frontend parsing rules (`lib/api/parse.ts`)

1. Check `success === false` → normalized error (never assume `data` exists).
2. Item: `parseItem<T>(res)` returns `T`; throws normalized error on `!success`.
3. Offset: `parseOffsetCollection<T>(res)` reads `meta.pagination`, falls back to legacy `total/page/limit/totalPages`.
4. Cursor: `parseCursorCollection<T>(res)` reads `meta.pagination.nextCursor`; throws if `strategy !== 'cursor'`.
5. No component may read `res.data.items` or assume `totalPages` on cursor responses.

## 7. `meta` ownership: interceptor reliance (Phase 23 P2-7)

Controllers hand-build `{ success: true, data, message? }` and MUST NOT fabricate
`meta.requestId` themselves. `ResponseMetaInterceptor` injects `meta: { requestId }`
exactly once at the HTTP layer (never double-wraps; skips error envelopes, which the
`AllExceptionsFilter` stamps instead).

Consequences:
- Web types keep `meta?` optional (`contract.ts`): service-level unit payloads and
  optimistic shapes legitimately lack `meta`. `meta` being present is an HTTP-layer
  guarantee, not a type-level one.
- API tests assert accordingly: `expectSuccessEnvelope()` (shape, in
  `test/http-envelope.spec.ts`) for service/controller specs, `expectHttpEnvelope()`
  (requires `meta.requestId`) only for HTTP-level specs.
- Direct service unit tests bypass the interceptor and therefore never see
  `requestId` — this is expected, not a gap.
