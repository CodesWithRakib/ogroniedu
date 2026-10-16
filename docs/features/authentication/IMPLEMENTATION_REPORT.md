# Authentication & Role-Based Onboarding — Implementation Report (Phase 01)

**Date:** 2026-10-16 · **Scope:** authentication, session security, RBAC foundations, role-based
onboarding, OTP delivery fallback, passwordless login.
**Evidence:** every result below was produced by running the command shown on this repository, in this
session. No result is inferred from the code alone.

Legend for the status of each capability: **implemented** · **automated-tested** ·
**manually-verified** (executed against the running API + real PostgreSQL) · **externally-verified**
(third-party provider confirmed) · **unverified**.

---

## 1. Original audit findings (summary)

Full detail in `AUDIT.md`. Eleven defect findings and six missing-capability findings were identified; the
highest-severity ones were:

| ID   | Severity | Finding                                                                                                        | Status                                                                        |
| ---- | -------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| D-1  | High     | A valid access token survived suspension/deactivation and password change (guard trusted JWT claims only)      | **Fixed** (manually verified)                                                 |
| D-2  | High     | No OTP was ever delivered — no provider, no fallback, no delivery status                                       | **Fixed** (abstraction automated-tested; live delivery unverified)            |
| D-3  | Medium   | OTP verify was check-then-use (concurrent double-success race)                                                 | **Fixed** (automated-tested)                                                  |
| D-4  | Medium   | Password-recovery flow contradicted itself (verify-code consumed the code reset-password needed)               | **Fixed** (automated-tested)                                                  |
| D-5  | Medium   | Resend left older OTPs valid simultaneously                                                                    | **Fixed** (manually verified)                                                 |
| D-6  | Medium   | Registration had no role-eligibility policy statement, no onboarding record, and duplicate races produced 500s | **Fixed** (automated-tested, manually verified)                               |
| D-7  | Medium   | SEC-1: `ALLOW_TEST_AUTH_BYPASS=true` re-enabled impersonation in production                                    | **Fixed** (automated-tested)                                                  |
| D-8  | Medium   | SEC-5: web client persisted the refresh token in `localStorage`                                                | **Fixed** (automated-tested)                                                  |
| D-9  | Low–Med  | SEC-4: public demo credentials strip + fake Google button                                                      | **Fixed** (automated-tested for the API surface; UI change verified by build) |
| D-10 | Low      | SEC-2 hardcoded JWT fallback; no algorithm pinning; no `iss`/`aud` validation                                  | **Partially fixed** — see §13                                                 |
| D-11 | Low      | F-7 admin nav vs admin subroute role gate mismatch                                                             | **Open** — see §13                                                            |

Missing capabilities M-1…M-6 (onboarding, magic link, OTP delivery abstraction, forgot-password UI,
organization roles in the web model, centralised route policy) are all implemented — see §3.

## 2. Files created / modified / removed

**Created — API (24):**

- `apps/api/src/modules/auth/auth-security.module.ts`
- `apps/api/src/modules/auth/services/account-access.service.ts`
- `apps/api/src/modules/auth/utils/{registration-policy,magic-link.utils}.ts`
- `apps/api/src/modules/auth/dto/magic-link.dto.ts`
- `apps/api/src/modules/auth/delivery/{otp-delivery.types,otp-provider.factory,otp-delivery.service}.ts`
- `apps/api/src/modules/auth/delivery/providers/{dev-otp.provider,http-gateway-otp.provider}.ts`
- `apps/api/src/modules/onboarding/{onboarding.config,onboarding-validators,onboarding.service,onboarding.controller,onboarding.module}.ts`
- `apps/api/src/modules/onboarding/dto/complete-onboarding-step.dto.ts`
- `apps/api/src/modules/onboarding/interfaces/onboarding-status.interface.ts`
- `apps/api/test/{auth-guard-account-status,auth-hardening.utils,otp-delivery,onboarding.service,auth-magic-link}.spec.ts`

**Created — web (11):**

- `apps/web/src/lib/route-policy.ts`
- `apps/web/src/components/auth/OnboardingGate.tsx`
- `apps/web/src/features/onboarding/pages/onboarding-page.tsx`, `apps/web/src/features/onboarding/step-forms.ts`
- `apps/web/src/features/auth/pages/{forgot-password-page,magic-link-page}.tsx`
- `apps/web/src/app/[locale]/{onboarding,forgot-password,magic-link}/page.tsx`
- `apps/web/src/store/services/onboarding-api.ts`
- `apps/web/test/{route-policy,auth-session-storage}.spec.ts`

**Created — other (6):** `packages/database/src/migrations/013_auth_onboarding_and_magic_links.sql`;
`docs/features/authentication/{AUDIT,IMPLEMENTATION_PLAN,ROUTE_AND_PERMISSION_MATRIX,TEST_PLAN,IMPLEMENTATION_REPORT}.md`.

**Modified (22):**

- API: `app.module.ts`, `common/auth/test-auth.ts`, `common/guards/auth.guard.ts`,
  `modules/auth/{auth.controller,auth.service}.ts`, `modules/auth/dto/index.ts`,
  `modules/auth/interfaces/auth-response.interface.ts`, `modules/auth/utils/token.utils.ts`,
  `test/auth-bypass-guard.spec.ts`.
- Web: `components/auth/{LoginForm,authShell,use-login-form}`, `layouts/RoleLayout.tsx`,
  `store/{base-api,index}.ts`, `store/services/auth-api.ts`, `store/slices/auth-slice.ts`.
- Other: `packages/contracts/src/identity.ts`, `packages/database/test/{bcdr-recovery,migration}.spec.ts`,
  `.env.example`, `apps/api/.env.example`.

**Removed:** none. (No file was deleted; the legacy `ogroniedu.refreshToken` localStorage key is purged at
boot, and the fake "Sign in with Google" button was replaced rather than kept dead.)

## 3. Implemented features and real user flows

1. **Registration** — server-side role policy (self-signup: student/guardian/tutor; everything else is
   administrator-provisioned), normalised email/phone, bcrypt(12), transactional creation of user + role +
   tutor profile + onboarding row + session, `23505`→`409`, audit `auth.register`.
2. **Login** — uniform 401, `(ip, identifier)` throttling plus a per-account failure throttle, blocked
   statuses rejected, `auth_epoch` embedded in the access token, audit `auth.login.{succeeded,failed,blocked}`.
3. **Session/refresh** — unchanged rotation + replay detection, now also blocked for suspended accounts and
   audited; logout and revoke-all audited.
4. **OTP** — codes issued via the configured provider chain, previous codes invalidated, atomic single-use
   consumption for contact verification, recovery codes checked-then-consumed by reset-password, audit
   `auth.otp.requested` / `auth.otp.verify_failed` / `auth.contact.verified` / `auth.password.reset_completed`.
5. **Magic link** — `request` (generic, throttled, invalidates previous links, stores only a SHA-256 hash,
   drops untrusted redirect paths) and `consume` (atomic single-use, expiry-checked, issues a session,
   audited `auth.magic_link.{requested,consumed,reuse_blocked}`).
6. **Onboarding** — config-driven tracks for all nine roles, derived from trusted records, step completion
   validated server-side, approval-gated steps never user-completable, resumable, audited.
7. **RBAC/route policy** — centralised frontend mapping (`route-policy.ts`); backend guards unchanged in
   semantics but now account-state aware.
8. **Web pages** — `/onboarding` (progress + real step submission), `/forgot-password`, `/magic-link`
   (explicit confirmation, so link prefetch cannot burn a token), email-link request on the login page.

## 4. Database migrations

`packages/database/src/migrations/013_auth_onboarding_and_magic_links.sql` (forward-only, idempotent):

- `ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_epoch INTEGER NOT NULL DEFAULT 0`
- `CREATE TABLE IF NOT EXISTS user_onboarding` (+ unique `(user_id, role_code)`, status check
  `in_progress|pending_review|completed`, indexes `ix_user_onboarding_user`,
  `ix_user_onboarding_incomplete`)
- `CREATE TABLE IF NOT EXISTS auth_magic_links` (+ unique `token_hash`, purpose check, indexes
  `ix_auth_magic_links_active`)

**Applied and verified against real PostgreSQL in this session:**

```
$ pnpm --filter @ogroniedu/database db:migrate         # ogroniedu_test (via test suite)
  Database Migration Runner & Integrity Constraint Tests (16)  ✓
$ DB_NAME=ogroniedu_dev node scripts/run-migrations.mjs
  Starting migrations on database: ogroniedu_dev...
  Successfully executed migrations: 013_auth_onboarding_and_magic_links.sql
```

Rollback (documented, not executed — the phase adds a column defaulting to 0 and two new tables used only
by this phase):

```sql
DROP INDEX IF EXISTS ix_auth_magic_links_active;
DROP TABLE IF EXISTS auth_magic_links;
DROP INDEX IF EXISTS ix_user_onboarding_incomplete;
DROP INDEX IF EXISTS ix_user_onboarding_user;
DROP TABLE IF EXISTS user_onboarding;
ALTER TABLE users DROP COLUMN IF EXISTS auth_epoch;
```

Rollback is safe because nothing outside the authentication/onboarding modules reads these objects.

## 5. API endpoints and contracts

New:

| Method | Path                                | Auth          | Notes                                                                    |
| ------ | ----------------------------------- | ------------- | ------------------------------------------------------------------------ |
| POST   | `/api/v1/auth/magic-link/request`   | public        | generic response; token never returned                                   |
| POST   | `/api/v1/auth/magic-link/consume`   | public        | single-use; sets auth cookies; returns `AuthResponse & { redirectPath }` |
| GET    | `/api/v1/onboarding/me`             | authenticated | derived onboarding status                                                |
| POST   | `/api/v1/onboarding/steps/:stepKey` | authenticated | body `{ payload }`; returns updated status                               |

Changed behaviour (same paths/contracts, so existing clients keep working):

- `POST /auth/register` — 400 for privileged roles, 409 on duplicate races.
- `POST /auth/request-code` — response gains optional `degraded`; `debugCode` remains non-production only.
- `POST /auth/verify-code` — `contact_verification` consumes atomically; `password_recovery` no longer consumes.
- `POST /auth/reset-password` — bumps `auth_epoch` and revokes sessions.
- All guarded endpoints — 401 for suspended/deactivated accounts and stale credential epochs.
- Access tokens now carry `iss=ogroniedu-api`, `aud=ogroniedu-clients`, `authEpoch`; verification is pinned
  to `HS256`.

`packages/contracts/src/identity.ts` gained `RequestMagicLinkSchema`, `ConsumeMagicLinkSchema`,
`OnboardingTrackStatus`, `OnboardingStepStatusSchema`, `OnboardingStatusSchema`,
`CompleteOnboardingStepSchema`. Swagger `OnboardingController` is tagged `Onboarding` with bearer auth.

## 6. Role/permission matrix

See `ROUTE_AND_PERMISSION_MATRIX.md` — server boundaries per role, the frontend prefix→role policy, the
per-role onboarding tracks with R/A/S/U flags, and the session/token policy.

## 7. Security fixes and threat mitigations

| Threat                                                            | Mitigation now in place                                                                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stolen/lingering access token after suspension or password change | Guard consults `users.status` + `auth_epoch` on every guarded request                                                                                         |
| `alg` confusion / forged tokens                                   | `HS256` pinned on verify; mismatched `iss`/`aud` rejected when present                                                                                        |
| OTP brute force / replay / races                                  | attempt cap, atomic single-use consumption, resend invalidation, per-`(ip,contact)` and per-account throttles                                                 |
| Account enumeration                                               | identical responses for `request-code` and `magic-link/request` on unknown/suspended accounts                                                                 |
| Open redirect via magic link                                      | allow-listed internal prefixes; protocol-relative/backslash/control-char/absolute URLs dropped                                                                |
| Token-in-URL reuse                                                | magic link is single-use and consumed only after an explicit user action                                                                                      |
| Refresh-token theft via XSS                                       | refresh token is `HttpOnly`-cookie-only; the web client no longer persists it; legacy key purged                                                              |
| Privilege escalation via registration                             | self-signup role policy enforced server-side; privileged roles provisioned only by admins                                                                     |
| Onboarding bypass by direct API call                              | step must belong to the caller's track, be `submittable`, and pass its validator; approval-gated steps cannot be completed by the user                        |
| Tutor marked verified by form completion                          | verification is derived from `tutor_profiles.verification_status` only                                                                                        |
| Impersonation via env flag in production                          | production unconditionally denies the test-auth bypass                                                                                                        |
| Secrets in logs/audit                                             | OTP/magic-link values never logged (masked destinations only); DB stores SHA-256 hashes; audit metadata carries provider/status/step only — verified by query |
| Operator credential exposure in the UI                            | demo quick-fill gated to non-production builds; fake OAuth button removed                                                                                     |

## 8. Tests added and exact results

**New/changed specs:** `auth-guard-account-status.spec.ts` (8), `auth-hardening.utils.spec.ts` (8),
`otp-delivery.spec.ts` (8), `onboarding.service.spec.ts` (13), `auth-magic-link.spec.ts` (11),
`auth-bypass-guard.spec.ts` (4→5), `route-policy.spec.ts` (8), `auth-session-storage.spec.ts` (7),
`migration.spec.ts` (13→16), `bcdr-recovery.spec.ts` (replay now 13 migrations).

Exact command results (final run, after formatting):

```
$ (cd apps/api && npx vitest run)          Test Files  59 passed (59)   Tests  557 passed (557)
$ (cd apps/web && npx vitest run)          Test Files  29 passed (29)   Tests  163 passed (163)
$ (cd packages/database && npx vitest run) Test Files   4 passed (4)    Tests   31 passed (31)
```

No test was deleted, skipped or weakened. Two assertions were updated because they encoded the behaviour
being fixed:

- `auth-bypass-guard.spec.ts` previously asserted that `ALLOW_TEST_AUTH_BYPASS=true` re-enables the bypass in
  production (**true**). That assertion encoded SEC-1 and is now split into an explicit SEC-1 regression test
  asserting **false** in production and **true** for a non-production harness.
- `bcdr-recovery.spec.ts` expected 12 replayed migrations; it now expects the 13 that exist (new migration).

## 9. Typecheck, lint, build results

```
$ pnpm typecheck                       Tasks: 6 successful, 6 total          (pass)
$ (cd apps/api && npx oxlint src test --deny-warnings)      Found 0 warnings and 0 errors   (pass)
$ (cd apps/web && npx oxlint src test e2e)                  Found 100 warnings and 0 errors (pre-existing failure, F-1)
$ pnpm --filter @ogroniedu/web build   ✓ Compiled successfully in 11.6s       (pass; /onboarding, /forgot-password, /magic-link emitted)
$ pnpm build                           Tasks: 4 successful, 4 total          (pass)
$ pnpm docs:validate                   Documentation Validation PASSED — 179 files    (pass)
```

**Lint caveat (measured, not assumed):** `apps/web` lint is red on a pre-existing baseline of **100**
warnings (unused imports in dashboard/tutor pages etc., `docs/engineering/README.md` F-1). This change adds
**0** net new warnings: the files created here report none, and the one warning introduced during
development (an unused `router` binding) was fixed rather than suppressed. API lint is clean.

## 10. Manual verification steps (executed against the live API + PostgreSQL)

Server: `node dist/main.js` on port 4123 against `ogroniedu_dev` with migration 013 applied. All steps below
were executed and their output observed.

| #   | Step                                                                                                | Observed result                                                                                                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Boot the API with the new global `AuthSecurityModule`                                               | Application started, 132 routes mapped including the 4 new auth/onboarding routes — DI resolution confirmed                                                                                                                                                                                    |
| 2   | `POST /auth/register` with `role: "admin"`                                                          | `400` — `role must be one of: student, guardian, tutor`                                                                                                                                                                                                                                        |
| 3   | `POST /auth/register` as student                                                                    | `201`, `user.status = pending_verification`, `roles=["student"]`                                                                                                                                                                                                                               |
| 4   | `GET /onboarding/me` with the new token                                                             | `200` — `status: in_progress`, `nextStep: profile`, steps `contact_verification:pending, profile:pending, learning_preferences:pending`                                                                                                                                                        |
| 5   | `POST /onboarding/steps/profile`                                                                    | `200` — `in_progress`, `nextStep: learning_preferences`                                                                                                                                                                                                                                        |
| 6   | `POST /onboarding/steps/learning_preferences` with `preferredLocale: "fr"`                          | `400` — `Invalid learning_preferences payload: preferredLocale must be one of: bn, en`                                                                                                                                                                                                         |
| 7   | `POST /onboarding/steps/learning_preferences` with `bn`                                             | `200` — track still `in_progress`, `isComplete: false`, contact step still `pending` (mandatory verification cannot be skipped)                                                                                                                                                                |
| 8   | `POST /auth/request-code` (contact_verification)                                                    | `200`, `expiresInSeconds: 600`, `debugCode` present (non-production), `degraded: false` (delivered via the provider chain)                                                                                                                                                                     |
| 9   | `POST /auth/verify-code` with that code                                                             | `200` — verification successful                                                                                                                                                                                                                                                                |
| 10  | Repeat step 9 with the same code                                                                    | `400` — `Invalid or expired verification code` (single-use)                                                                                                                                                                                                                                    |
| 11  | `GET /onboarding/me` after verification                                                             | `200` — `status: completed`, `isComplete: true`; `GET /auth/me` shows `status: active`, `email_verified_at` set                                                                                                                                                                                |
| 12  | `POST /auth/magic-link/request` for a known account with `redirectPath: "https://evil.example.com"` | `200` generic message; response has no token; DB row stores a 64-char hash and a `null` redirect_path                                                                                                                                                                                          |
| 13  | `POST /auth/magic-link/request` for an unknown account                                              | `200` — byte-identical message to step 12 (no enumeration)                                                                                                                                                                                                                                     |
| 14  | `POST /auth/magic-link/consume` with a valid token                                                  | `200` — user id, `redirectPath: /dashboard/student`, access + refresh tokens issued                                                                                                                                                                                                            |
| 15  | Repeat step 14                                                                                      | `400` — `This sign-in link has already been used`                                                                                                                                                                                                                                              |
| 16  | Login, confirm `GET /auth/me` → `200`, then set `users.status='suspended'`, reuse the same token    | `401` — `Account is not permitted to access the platform` (D-1 fixed live)                                                                                                                                                                                                                     |
| 17  | Login while suspended                                                                               | `401` — `Account is suspended. Please contact platform support.`                                                                                                                                                                                                                               |
| 18  | Query `audit_logs`                                                                                  | `auth.register x2`, `auth.login.succeeded`, `auth.login.blocked`, `auth.otp.requested`, `auth.contact.verified`, `auth.onboarding.step_completed x2`, `auth.magic_link.requested/consumed/reuse_blocked`; **0** `auth.*` rows contain a 6-digit code, token-like string or the word "password" |
| 19  | Query `auth_magic_links` / `auth_verification_codes`                                                | 0 rows where the stored column is not a 64-char hash                                                                                                                                                                                                                                           |

Playwright e2e (`apps/web/e2e`) was **not** run: it requires the dev stack plus seeded data and is a
long-running interactive suite. It is listed as unverified in §12.

## 11. Required environment variables and provider setup

Added to `.env.example` (root) and `apps/api/.env.example`:

```
OTP_SMS_PRIMARY_PROVIDER=http_gateway        OTP_SMS_FALLBACK_PROVIDER=dev
OTP_EMAIL_PRIMARY_PROVIDER=http_gateway      OTP_EMAIL_FALLBACK_PROVIDER=dev
OTP_HTTP_GATEWAY_NAME=http_gateway
OTP_HTTP_GATEWAY_SMS_URL=                    OTP_HTTP_GATEWAY_EMAIL_URL=
OTP_HTTP_GATEWAY_API_KEY=                    OTP_HTTP_GATEWAY_SENDER_ID=
OTP_HTTP_GATEWAY_FALLBACK_NAME=http_gateway_fallback
OTP_HTTP_GATEWAY_FALLBACK_SMS_URL=           OTP_HTTP_GATEWAY_FALLBACK_EMAIL_URL=
OTP_HTTP_GATEWAY_FALLBACK_API_KEY=           OTP_HTTP_GATEWAY_FALLBACK_SENDER_ID=
OTP_DELIVERY_TIMEOUT_MS=5000                 OTP_DELIVERY_MAX_ATTEMPTS=2
```

Setup: set the SMS/email URLs and API key for the contracted provider, set the primary name to that
provider's configured name, and optionally point the fallback at a second aggregator. No vendor endpoint was
invented — delivery uses the documented portable payload `{ to, channel, sender, message, template }` over
`POST` with `Authorization: Bearer <key>`. The `dev` provider records deliveries in memory and is refused in
production, so an incomplete configuration fails closed rather than silently "succeeding".

## 12. Known limitations and unverified integrations

| Area                                                | Status                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Real SMS/email delivery**                         | **External, unverified.** No provider credentials or account are available; the abstraction, configuration-driven selection, fallback eligibility, timeouts, bounded retries and error classification are implemented and unit-tested. Only the `dev` provider was exercised end-to-end. |
| **Playwright e2e**                                  | **Unverified.** Not run this session (needs a running web dev server + seeded data).                                                                                                                                                                                                     |
| Token issuer/audience for legacy tokens             | New tokens carry `iss`/`aud`; tokens without those claims are still accepted for backward compatibility (see §13 D-10b).                                                                                                                                                                 |
| Access token in `localStorage`                      | The refresh token is no longer persisted, but the short-lived access token still is. Moving it to memory-only (rehydrate via the refresh cookie) is the documented next hardening step.                                                                                                  |
| Distributed rate limiting                           | The existing in-memory limiter is unchanged; behaviour under multi-instance load is untested (pre-existing gap).                                                                                                                                                                         |
| Organization membership / ownership                 | `organization_staff.membership` and `organization_owner.ownership_verification` are approval-gated and report `pending` because the organization tables belong to a later phase.                                                                                                         |
| Route-level onboarding gating outside role surfaces | Onboarding state is authoritative and enforced on the onboarding API; feature routes (e.g. bookings) are not yet gated on onboarding completion — the client gate plus server-side onboarding state is the current boundary.                                                             |
| Swagger exposure                                    | `/api/docs` remains mounted unconditionally (pre-existing SEC-6, out of this phase's scope).                                                                                                                                                                                             |

## 13. Remaining defects, classified by severity

| ID  | Severity      | Defect                                                                          | Notes                                                                                                                          |
| --- | ------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| R-1 | Low           | Web lint baseline is red (100 pre-existing warnings)                            | Pre-existing F-1; unchanged by this phase                                                                                      |
| R-2 | Low           | Hardcoded JWT secret fallback remains in `auth.guard.ts` / `auth.service.ts` (` |                                                                                                                                | 'ogroniedu-…'`) instead of failing closed when `JWT_SECRET` is unset | Pre-existing SEC-2; production env validation still rejects the documented placeholder. Deferred because changing the fallback behaviour can break local boots and is a config-policy decision. |
| R-3 | Low           | Legacy tokens without `iss`/`aud` are accepted (migration path)                 | Intentional to avoid invalidating every existing session at deploy; tighten after the access-token TTL has elapsed post-deploy |
| R-4 | Low           | Admin-family nav items vs `/dashboard/admin/*` role gate mismatch (F-7)         | Backend and the new route policy agree on the admin family; the remaining nav filtering refactor is UI-only and deferred       |
| R-5 | Informational | Access token is persisted in `localStorage`                                     | Short-lived (15 min) and now revocable server-side via `auth_epoch`; memory-only storage is the next step                      |
| R-6 | Informational | `degraded: true` is returned (and audited) when no provider accepted an OTP     | Intentional fail-visible behaviour; no OTP is ever fabricated                                                                  |

No High or Medium defects remain open from the audit list. D-10 is partially fixed (algorithm pinning +
`iss`/`aud` issuance/validation); its two residual sub-items are R-2 and R-3.

## 14. Acceptance status per completion criterion

| Criterion                                                            | Status                                                      | Evidence                                                                                                                                                                                                                               |
| -------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing authentication flows audited                                | **Done**                                                    | `AUDIT.md` with file-level findings D-1…D-11, M-1…M-6                                                                                                                                                                                  |
| Supported registration and login flows work against the real backend | **Done**                                                    | §10 steps 2–3, 16–17; `auth.service.spec`, `auth.controller.spec`                                                                                                                                                                      |
| Session refresh and logout follow the documented policy              | **Done**                                                    | Rotation + replay detection (unchanged, tested), refresh cookie-only on the web, `auth_epoch` invalidation, logout/revoke audited                                                                                                      |
| All nine roles have documented and tested access boundaries          | **Documented + partially tested**                           | `ROUTE_AND_PERMISSION_MATRIX.md`; `route-policy.spec` covers the policy for all nine; server guard boundaries covered by `auth.authorization.spec`. Full per-role HTTP matrix across every protected route is not automated (see §12). |
| Role-specific onboarding persisted and enforced server-side          | **Done**                                                    | §10 steps 4–7, 11; `onboarding.service.spec` (13 tests)                                                                                                                                                                                |
| Relevant frontend pages use real API integration                     | **Done**                                                    | `/onboarding`, `/forgot-password`, `/magic-link` call the real endpoints; build succeeds; no mock/fake success paths                                                                                                                   |
| Required database migrations and API documentation updated           | **Done**                                                    | Migration 013 applied on `ogroniedu_test` + `ogroniedu_dev`; Swagger tag/params added; contracts updated                                                                                                                               |
| OTP delivery fallback implemented and tested where configured        | **Implemented + automated-tested; not externally verified** | `otp-delivery.spec` (8 tests); live provider delivery untested (§12)                                                                                                                                                                   |
| Magic-link login securely implemented or documented as blocked       | **Implemented + manually verified**                         | §10 steps 12–15                                                                                                                                                                                                                        |
| Sensitive authentication data not exposed                            | **Done**                                                    | §10 step 18–19; `security-and-privacy-hardening.spec`                                                                                                                                                                                  |
| Automated tests cover critical success and failure paths             | **Done**                                                    | 751 tests passing across the three packages (557 + 163 + 31)                                                                                                                                                                           |
| Type checking, linting and applicable builds run                     | **Done**                                                    | §9 (web lint failure is pre-existing, quantified)                                                                                                                                                                                      |
| Existing unrelated features remain intact                            | **Done**                                                    | All pre-existing suites pass; no unrelated module refactored; notification system untouched                                                                                                                                            |

**Phase 01 is complete to the extent expressible here.** The two items that are not fully satisfied are
external delivery verification (no provider credentials available) and the exhaustive per-role HTTP route
matrix; both are documented rather than claimed. Work stops here pending approval before the next phase.
