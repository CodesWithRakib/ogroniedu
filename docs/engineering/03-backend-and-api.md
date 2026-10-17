# 03 — Backend & API: Modules, Routes, Contracts, and the Dev-Validation Gap

All counts in this document come from the API boot route map captured in this session
(`09-evidence-appendix.md` §1), source inspection at commit `c58d026`, and live probes against
the running dev API (`:4000`). No endpoint behavior is asserted without one of those sources.
Sections marked **As-built** were added during the Phase 24 Pre-Gate and cite the implementing
commits; unmarked text remains the audit-time record at `c58d026`.

## 1. Runtime & boot pipeline

| Item             | Value                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Framework        | NestJS 12.1.2 on Express, TypeORM 1.1.2 (`pg` 8.23.1)                                    |
| Dev runtime      | `tsx watch src/main.ts` (audit-time; **as-built:** `node scripts/dev.mjs` — see §1 note) |
| Prod runtime     | `tsc` build → `node dist/main.js` (Docker/compose)                                       |
| Port / namespace | `:4000`; Socket.IO gateway namespace `ws://:4000/notifications`                          |
| Docs             | Swagger UI at `/api/docs`                                                                |

**As-built (PG-1 `6e87fc5`, watcher scoped in `83cf532`).** `pnpm --filter @ogroniedu/api dev`
now runs `node scripts/dev.mjs` = `tsc -p tsconfig.build.json --watch` +
`node --watch --watch-path=dist dist/main.js`. Dev therefore executes the same compiled
artifact as production (decorator metadata present; `tsx` removed from the dev path — see §5),
and the watcher only reacts to `dist` emits, so unrelated `node_modules` churn cannot restart
the API mid-request.

Boot order (`apps/api/src/main.ts`): `cookieParser()` → CORS (`FRONTEND_URL`, comma-separated,
`credentials: true`) → global `AllExceptionsFilter` → global `ResponseMetaInterceptor` →
global `ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })` →
Swagger → listen. A request-id middleware assigns `request.requestId`, consumed by both the
interceptor and the filter.

## 2. Route inventory — 22 controllers / 120 mapped routes

Grouped by base path exactly as the boot log maps them (controller file in parentheses):

| Base path                              |                 Routes | Access posture                                                                      |
| -------------------------------------- | ---------------------: | ----------------------------------------------------------------------------------- |
| `/health`                              |                      2 | public                                                                              |
| `/api/v1/auth`                         |                     10 | mixed (login/register/codes/reset public; `me`, `revoke-all`, `admin-only` guarded) |
| `/api/v1/users`                        |                      5 | `@UseGuards(AuthGuard)` (controller-level)                                          |
| `/api/v1/guardians`                    |                      6 | `AuthGuard + RolesGuard`; `GET children/:studentId` adds `GuardianStudentGuard`     |
| `/api/v1/taxonomy`                     |                      4 | public (subjects/levels/curricula/**locations**)                                    |
| `/api/v1/tutors`                       |                     13 | `search`, `public/:id` public; all `me/*` + `calendar` guarded                      |
| `/api/v1/admin/tutors`                 |                      4 | `AuthGuard + RolesGuard` (admin family)                                             |
| `/api/v1/requests`                     |                      5 | `AuthGuard` (booking requests)                                                      |
| `/api/v1/sessions`                     | 6 (+1 under `/tutors`) | per-route `AuthGuard`                                                               |
| `/api/v1/learning`                     |                      8 | per-route `AuthGuard`                                                               |
| `/api/v1/payments`                     |                      7 | per-route `AuthGuard` except `webhook/:provider` (provider-signature surface)       |
| `/api/v1/reviews`                      |                      4 | `tutors/:tutorId` public; create/reply/moderate guarded                             |
| `/api/v1/safety-reports`               |                      4 | `AuthGuard`                                                                         |
| `/api/v1/tutor-replacements`           |                      4 | `AuthGuard`                                                                         |
| `/api/v1/notifications`                |                      7 | `AuthGuard` (controller-level)                                                      |
| `/api/v1/bookings/:bookingId/messages` |                      3 | `AuthGuard`                                                                         |
| `/api/v1/support/tickets`              |                      2 | `POST` public, `mine` guarded                                                       |
| `/api/v1/admin/support-tickets`        |                      2 | `AuthGuard + RolesGuard`                                                            |
| `/api/v1/public`                       |                      1 | public (`stats`)                                                                    |
| `/api/v1/analytics`                    |                      5 | `AuthGuard + RolesGuard`                                                            |
| `/api/v1/admin` (operations)           |                     16 | `AuthGuard + RolesGuard`                                                            |
| `/api/v1/files`                        |                      2 | `AuthGuard`                                                                         |

**Total: 120** (sum of the table).

## 3. Authorization wiring (as coded)

- **No global guard.** There is no `APP_GUARD` registration; every controller/route opts in via
  `@UseGuards(AuthGuard)` and, where roles apply, `@UseGuards(AuthGuard, RolesGuard)` + `@Roles(...)`.
  The `@Public()` decorator / `IS_PUBLIC_KEY` exist and `AuthGuard` honors them
  (`auth.guard.ts:55-63`) but no route actually uses `@Public()` — public routes simply omit the guard.
  Consequence: a future controller that forgets `@UseGuards` is public by default.
- **AuthGuard semantics** (`apps/api/src/common/guards/auth.guard.ts`): verifies `Bearer` JWT
  signature/expiry with `jsonwebtoken`; maps claims into `request.user`; expired vs malformed
  tokens produce distinct 401 messages. Dev/test escape hatches (`x-user-id` header, `mock:` tokens)
  are gated by `isTestAuthBypassEnabled()` (`common/auth/test-auth.ts`) = `NODE_ENV` `test`/`development`
  **or** `ALLOW_TEST_AUTH_BYPASS=true` (see `07-security-findings.md` S-3).
- **RolesGuard** consumes `@Roles(...)`; admin surfaces use `ADMIN_ROLES` from
  `common/auth/role.utils.ts` (the Phase-23 role-helper rollout that includes `super_admin` in
  single-`admin` checks). Note the web UI divergence for those roles — `02-routing-and-ux.md` R-1.
- **GuardianStudentGuard** applies on top of auth+roles for `GET /guardians/children/:studentId`.
- **Access tokens are stateless** (not looked up in `auth_sessions` per request in AuthGuard);
  the refresh cookie is `httpOnly`, `sameSite=strict`, `path=/api/v1/auth`, `secure` only when
  `NODE_ENV === 'production'`, 7-day max age (`auth.controller.ts:36-44`). Revoke-all E2E passed at
  the session/refresh boundary.

## 4. Response contract — per-controller behavior (observed + coded)

The normative envelope (`docs/architecture/api-contract-standard.md`): success
`{success:true,data,meta:{requestId,pagination?}}`; error `{success:false,error:{code,message,details?},meta:{requestId}}`.
What the implementation actually does:

1. `ResponseMetaInterceptor` decorates **only bodies that already carry `success:true`**
   (`response-meta.interceptor.ts:20-30`). It never wraps.
2. Because of (1), endpoints returning the standard envelope get `meta.requestId` for free;
   **login/register/refresh/logout return the controller's raw payload** (live probe keys:
   `user`, `accessToken`; refresh token is also set as the cookie) and therefore have **no
   `success` flag and no `meta`**.
3. Errors flow through `AllExceptionsFilter`, which echoes `requestId` in `meta` and sanitizes 5xx
   body text (stack only server-side). **Observed exception:** a malformed JSON body produced
   `500 INTERNAL_ERROR` with `meta:{}` — the body-parser error surfaces without a request id
   (see F-3 evidence below).
4. **Pagination is opt-in per controller.** Canonical `meta.pagination` exists only where
   `paginated()`/`buildOffsetMeta()` is called (admin, support, tutor search, notifications);
   the remaining array-returning GETs return bare `{success:true,data:[…]}` — already scoped as
   Phase 24 WS1, not re-litigated here.

## 5. F-3 (High) — DTO validation is silently disabled in dev (`tsx` emits no decorator metadata) — resolved by PG-1

**Expected behavior.** `main.ts:32-38` installs a global `ValidationPipe` with
`whitelist`, `transform`, `forbidNonWhitelisted`. DTOs across `apps/api/src/modules/**/dto` carry
`class-validator` decorators (e.g. `@IsUUID()` on the booking-request `tutorId`).

**Observed behavior (dev, `tsx watch`).** None of that runs:

| Probe (dev server, this session)                                            | Expected                     | Observed                                                                                                     |
| --------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `POST /api/v1/requests` with `tutorId: "tutor-buet-1"`                      | 400 (`@IsUUID`)              | **500** `invalid input syntax for type uuid: "tutor-buet-1"` (TypeORM/Postgres reached)                      |
| `POST /api/v1/auth/login` with `{}`                                         | 400 (required `identifier`)  | **500** `TypeError: Cannot read properties of undefined (reading 'toLowerCase')` at `auth.service.ts:168:74` |
| `POST /api/v1/auth/login` with `identifier: "a"` (violates `@MinLength(3)`) | 400                          | **401** (service reached; validation skipped)                                                                |
| Any DTO with an unknown extra property                                      | 400 (`forbidNonWhitelisted`) | property ignored / service reached                                                                           |
| Malformed JSON body                                                         | 400                          | **500** with `meta:{}` (no requestId)                                                                        |

**Mechanism (verified by probes, exact cause of tsx behavior by observation).**
`ValidationPipe` identifies the DTO _metatype_ from the parameter's `design:paramtypes` metadata
emitted by `emitDecoratorMetadata`. Under `tsx`/esbuild that metadata is never emitted:
`Reflect.getMetadata('design:paramtypes', AuthController.prototype, 'login')` → `undefined`
(probed under both ESM and CJS load). The pipe therefore sees `Object`, skips validation and
transformation, and the raw body reaches services. The built `apps/api/dist` (from `tsc`) **does**
contain `__metadata("design:paramtypes", …)`, so production/staging builds validate normally.
This is the same metadata gap the Phase 24 plan calls out for cross-module DI (§1: "explicit
`@Inject(...)`" rule) — the codebase was hardened for DI but the pipe was not accounted for.
Unit tests call services directly (metadata irrelevant) and E2E runs against the dev `tsx` server,
so neither caught it.

**Impact.**

- Dev/E2E/QA behavior diverges from any built artifact: client errors become 500s, services and SQL
  see malformed input first, rate-limit keys can throw (`login`), and `forbidNonWhitelisted`
  protections (mass-assignment surface) are off in dev.
- Aggravated by F-4: the fake curated tutor ids are only rejected _because_ the DB cast fails —
  with validation working they would be clean 400s; as shipped in dev they are 500s.
- It is invisible in CI: `tsc`, unit tests, and docs validation all pass; only a _live_ bad-input
  probe reveals it. Nothing in the current test suites exercises the HTTP validation boundary.

**Mitigation direction (as recorded at audit time).** Make the dev runtime emit metadata (or run
dev against the built output / a loader that emits it), then add one live validation-boundary
smoke test (bad DTO → 400) that fails if metadata is missing.

**As-built (PG-1 `6e87fc5`, verified 2026-10-16).** The dev runtime now runs the tsc-built
output (`scripts/dev.mjs`; §1), so `design:paramtypes` is present and the global
`ValidationPipe` is active in dev. Live probe matrix on the final code — 6/6 as expected:
empty login body, `identifier:"a"` (`@MinLength(3)`), unknown property, malformed JSON, and a
non-UUID booking `tutorId` all return **400 VALIDATION_ERROR with field details** (previously
500/401); valid demo login → 200. Boundary coverage was added:
`apps/api/test/validation-boundary.spec.ts` (4 tests, real HTTP boundary with the real global
pipe config and `AuthController`). The same commit hardened
`http-exception.filter.ts` (truthful 4xx statuses on non-`HttpException` errors are no longer
re-cast to 500; a `requestId` is generated when the parser fails before `RequestIdMiddleware`;
`entity.parse.failed` → "The request body is not valid JSON."). Because dev now runs the built
artifact, the audit-time note below that "E2E runs against the dev `tsx` server" no longer
holds; the dev watcher was later scoped to `dist` (`83cf532`).

## 6. Verified live this session (beyond F-3)

- Login with seeded credentials (200, sets refresh cookie), wrong password (401), no-identifier (F-3 500).
- `GET /api/v1/tutors/search` → real published tutors with envelope + `meta.pagination`.
- `POST /api/v1/requests` with a real tutor UUID → created (request id returned); the E2E journey uses this path successfully when not racing the curated-card flash.
- Contact form → ticket created; a re-run hit the per-email daily rate limit → `429` (tolerated by the spec).
- `GET /health/live`, `GET /health/ready`, `GET /api/v1/public/stats` → 200.
- Revoke-all via UI → sessions invalidated at refresh boundary (E2E green).

## 7. Residual risks / notes

- The 5xx sanitizer is good (`07-security-findings.md`), but under F-3 it emits 500 for
  client-correctable input, which also pollutes error-rate SLOs (Phase 24 WS5) with false 5xx.
- Login (and auth family) envelopes lack `meta.requestId`; WS5's "requestId traceable end-to-end"
  will need the auth responses included or explicitly exempted.
- Webhooks: `POST /payments/webhook/:provider` is intentionally unguarded by JWT; signature
  verification is provider-adapter territory and was not re-verified live this session.
