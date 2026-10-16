# 07 — Security & Privacy Findings

Method: static review of the auth/guard/error paths at `c58d026`, plus live probes during this
session (bad-credential login, validation-boundary probes, contact-form rate limit, revoke-all
E2E). **No penetration testing was performed**; items marked "not verified" below were not
exercised. Cross-references: F-3/F-4 in the README table, R-1…R-6 in `02-routing-and-ux.md`,
static-data rows in `05-static-data-audit.md`.

## 1. Posture summary (verified)

- **The API is the real authorization boundary.** The web app's guards (`RequireAuth`,
  `RequireRole`, role layouts) are client-side UX: guarded routes return HTTP 200 HTML shells and
  redirect after hydration (`02-routing-and-ux.md` §2). API routes carry
  `@UseGuards(AuthGuard)` / `AuthGuard + RolesGuard` explicitly (`03-backend-and-api.md` §3).
- **Refresh cookies are well-configured** (`auth.controller.ts:36-44`): `httpOnly`,
  `sameSite=strict`, `path=/api/v1/auth`, `secure` only when `NODE_ENV=production` (7-day age).
- **Rate limiting is active on auth paths**: `RateLimiterService` gates login at 5 attempts /
  minute per `(ip, identifier)` (`auth.service.ts:167-169`); the contact form's per-email daily
  limit was observed returning `429` on an E2E re-run. (Distributed behavior under real load was
  not tested — see §4.)
- **Errors are sanitized**: `AllExceptionsFilter` returns
  `{success:false,error:{code,message,details?},meta:{requestId}}` and logs stack/SQL server-side
  only; 5xx bodies carry a support message, not internals.
- **Env validation fails closed** for production on `JWT_SECRET` and `DB_PASSWORD`
  (`env.validation.ts:74-90`) — subject to SEC-2's caveat.

## 2. Findings

### SEC-1 (Medium) — Test-auth bypass can be enabled in **production** via a single env var

`isTestAuthBypassEnabled()` (`common/auth/test-auth.ts:14-19`) returns `true` when `NODE_ENV` is
`test`/`development` **or** when `ALLOW_TEST_AUTH_BYPASS === 'true'` — with no production denial,
despite the file's own comment ("Production is always denied"). When enabled, `AuthGuard`
(`auth.guard.ts:70-97`) accepts `x-user-id`/`x-user-roles` headers or `mock:<id>:<role>` bearer
tokens as fully authenticated identities, including privileged roles.
Impact: a mis-set flag in a deployed environment = trivial impersonation of any user.
Recommended: hard-refuse when `NODE_ENV=production` inside `isTestAuthBypassEnabled`.

### SEC-2 (Low) — Hardcoded JWT fallbacks and a narrower-than-advertised prod invariant

Five modules fall back to shared default secrets when `JWT_SECRET` is unset:
`auth.guard.ts:50`, `auth.service.ts:25`, `notification.gateway.ts:31`,
`admin-platform.service.ts:28` (`'ogroniedu-super-secure-jwt-secret-key-2026-bangladesh'`) and
`files.service.ts:86` (`'secure-jwt-secret-dev'`). Production validation rejects only the
documented placeholder (`'super-secret-jwt-key-replace-in-production'` / any `replace-in-production`
string, `env.validation.ts:77-84`) — an explicitly-set, publicly-visible fallback value would pass,
and non-production environments have no check at all. Recommended: fail closed on unset secret in
every environment; reject all known defaults.

### SEC-3 (High — cross-ref F-3) — Dev runtime disables DTO validation (security exposure in dev/QA)

With the global `ValidationPipe` inert under `tsx` (`03-backend-and-api.md` §5), `whitelist` and
`forbidNonWhitelisted` are off in every dev/E2E/QA environment: unknown properties are accepted
(mass-assignment surface), malformed payloads reach services/TypeORM, and client errors surface as
500s. Production builds validate. The security impact is bounded to non-built environments, but
those are exactly where demos, QA, and security reviews happen. Fixing F-3 restores the
protection and the 400-vs-500 contract.

### SEC-4 (Medium) — Public login page ships working demo credentials and a mislabeled OAuth button

`authShell.tsx:39-70` hardcodes `OgroniDev#2026` for all four demo accounts and renders the
"1-click demo" strip in any build that includes the login page (no `NODE_ENV` gate; the strip
renders whenever the form passes `onQuickFill`, which `LoginForm` always does —
`LoginForm.tsx:39,223-250`). `LoginForm.tsx:161-187` renders "Sign in with Google" which **is not
OAuth** — it fills the student demo credentials. Impact: the seeded accounts' password is public;
if any deployment uses seeded data (or the same password), those accounts are compromised, and the
button is a user-deception/consent issue regardless. Recommended: gate to dev, remove the fake
provider button.

### SEC-5 (Medium) — Web client persists access **and** refresh tokens in `localStorage`

`auth-slice.ts:44-69` loads/saves `token`, `refreshToken`, and the user profile in `localStorage`.
Any XSS (or malicious extension) can exfiltrate long-lived credentials; keeping the refresh token
in JS-readable storage substantially negates the API's `httpOnly` cookie design for the web
client. Recommended direction (design-level): refresh token cookie-only (server already accepts
cookie-first), access token in memory, rehydration via `/auth/refresh` on boot.

### SEC-6 (Low) — Swagger UI is mounted unconditionally

`main.ts:59-60` always mounts `/api/docs` with the full route/DTO surface. In a production
deployment this is an unauthenticated API map unless the proxy blocks it. Recommended: gate by
environment or admin auth.

## 3. Positive verifications (this session)

- Bad credentials → 401; email-enumeration signal not observed (uniform 401 path on login probes).
- Revoke-all invalidates sessions end-to-end (E2E green) and clears the refresh cookie.
- Guarded routes redirect unauthenticated users (`auth.guards.spec.ts` green).
- 5xx bodies do not leak stack traces; server logs contain the detail (observed with the
  booking-500 incident).
- Contact endpoint rate limit enforced per email per day (observed live `429`).

## 4. Not verified (explicit gaps)

- Rate limiter under distributed/Redis-backed conditions and burst behavior (Phase 24 WS4.3 scopes this).
- Payment webhook signature verification and replay handling (not exercised).
- File-upload magic-byte checks and signed-URL authorization (not exercised this session).
- Admin impersonation flow (`/admin/impersonation/start`) end-to-end; token-claim handling exists
  (`isImpersonated` reachable in `AuthGuard` claims).
- Audit-log `safeMetadata` redaction contents versus the documented guarantee.
- `pnpm audit` / dependency vulnerability triage; secret scanning; rotation procedures.
