# Authentication & Role-Based Onboarding — Audit (Phase 01)

**Date:** 2026-10-16
**Scope:** registration, login, session/token security, RBAC, onboarding, OTP delivery, passwordless login.
**Method:** repository inspection of the actual implementation at the current commit (no assumptions from
generic templates). Evidence is `file:line`-level and every claim was re-checked against the running
test suites and a real PostgreSQL instance where applicable.

Stack discovered (do not assume — verified in the repo):

| Concern             | Actual implementation                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Frontend            | Next.js 16 App Router (`apps/web`), Redux Toolkit + RTK Query, `next-intl`, Tailwind          |
| Backend             | NestJS 12 on Express (`apps/api`), global `ValidationPipe`, `AllExceptionsFilter`             |
| Database / ORM      | PostgreSQL 18, TypeORM 1.1.2 (raw parameterised SQL for auth), forward-only `.sql` migrations |
| Auth implementation | Hand-rolled JWT access tokens (`jsonwebtoken`) + opaque refresh tokens in `auth_sessions`     |
| Password hashing    | `bcryptjs`, cost factor 12 (`auth.service.ts`)                                                |
| Test frameworks     | Vitest (api/web/database) + Playwright (web e2e)                                              |
| Package manager     | pnpm workspaces + Turborepo                                                                   |

---

## 1. What already exists and is reused (NOT rebuilt)

| Capability                             | Where                                                                                        | Verdict                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Registration + login                   | `apps/api/src/modules/auth/{auth.controller,auth.service}.ts`                                | Reused and hardened                                         |
| Centralised API client / auth state    | `apps/web/src/store/base-api.ts`, `store/slices/auth-slice.ts`, `store/services/auth-api.ts` | Reused, hardened (SEC-5)                                    |
| Route guards + role guard + ABAC guard | `apps/api/src/common/guards/{auth,roles,guardian-student}.guard.ts`                          | Reused, hardened                                            |
| Sliding-window rate limiter            | `apps/api/src/modules/auth/rate-limiter.service.ts`                                          | Reused as-is                                                |
| Refresh-token rotation + replay detect | `auth.service.ts#refresh`                                                                    | Reused as-is                                                |
| Session revocation / logout            | `auth.service.ts#{logout,revokeAllSessions}`                                                 | Reused, extended                                            |
| OTP storage + expiry + attempt cap     | `auth_verification_codes` (migration 002) + `auth.service.ts`                                | Reused, hardened                                            |
| Password reset                         | `auth.service.ts#resetPassword`                                                              | Reused, fixed (see D-4)                                     |
| Audit log architecture                 | `apps/api/src/modules/audit/*` (`@Global`)                                                   | Reused for auth security events                             |
| Centralised notifications              | `apps/api/src/modules/notifications/*` + `@ogroniedu/contracts` registry                     | Preserved; no notification changes were required this phase |
| Frontend route guards                  | `RequireAuth`, `RequireRole`, `layouts/*`                                                    | Reused; policy centralised                                  |
| Role catalogue (nine roles)            | `packages/database/src/seeds/initial_seed.ts`, `packages/contracts/src/identity.ts`          | Reused                                                      |
| Tutor verification state               | `tutor_profiles.verification_status`                                                         | Reused as the authoritative tutor gate                      |
| Guardian↔student relationship          | `guardian_student_links` + `GuardianStudentGuard`                                            | Reused as the authoritative relationship gate               |

## 2. Actual defects found

| ID   | Severity   | Defect                                                                                                                                                                                                                | Evidence                                                                            | Resolution                                                                                                                                                                                                                            |
| ---- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1  | **High**   | A valid access token kept working after the account was suspended/deactivated, or after a password change. `AuthGuard` trusted JWT claims only and never consulted the account row.                                   | `common/guards/auth.guard.ts` (pre-change)                                          | Fixed: guard now performs an authoritative status/credential-epoch check via `AccountAccessService`; `users.auth_epoch` is bumped on password reset.                                                                                  |
| D-2  | **High**   | **No OTP was ever delivered.** `requestCode` generated a code, stored a hash, and returned it only as a dev `debugCode`; there was no SMS/email provider, no fallback, no delivery status.                            | `auth.service.ts#requestCode` (pre-change)                                          | Fixed: `OtpDeliveryService` + provider chain (`http_gateway` primary, configured fallback, `dev` adapter refused in production).                                                                                                      |
| D-3  | Medium     | OTP verification had a check-then-use race: the code was read, then marked verified in a separate statement, so two concurrent requests could both succeed.                                                           | `auth.service.ts#verifyCode` (pre-change)                                           | Fixed: single atomic `UPDATE … WHERE verified_at IS NULL AND expires_at > now() RETURNING id`; a lost race is rejected.                                                                                                               |
| D-4  | Medium     | Password-recovery flow was self-contradicting: `verify-code` consumed the recovery code (`verified_at`), so a subsequent `reset-password` with the same code always failed.                                           | `auth.service.ts` (pre-change)                                                      | Fixed: `verify-code` only _checks_ a `password_recovery` code; `reset-password` is the atomic consumer and now bumps `auth_epoch` + revokes sessions.                                                                                 |
| D-5  | Medium     | Previously issued OTPs for the same contact/purpose stayed valid after a resend, so several codes could be usable at once.                                                                                            | `auth.service.ts#requestCode` (pre-change)                                          | Fixed: request invalidates outstanding codes for that contact/purpose before inserting the new one.                                                                                                                                   |
| D-6  | Medium     | Registration assigned `dto.role` without a server-side eligibility policy statement and created no onboarding record; duplicate handling relied only on a pre-check (a concurrent race produced a raw 500).           | `auth.service.ts#register` (pre-change)                                             | Fixed: `registration-policy.ts` (self-signup vs privileged provisioning), onboarding row created in the same transaction, PG `23505` mapped to `409 Conflict`.                                                                        |
| D-7  | Medium     | SEC-1 (previously documented): `ALLOW_TEST_AUTH_BYPASS=true` re-enabled `x-user-id`/`mock:` impersonation **in production**.                                                                                          | `common/auth/test-auth.ts` (pre-change), `docs/engineering/07-security-findings.md` | Fixed: production is now unconditionally denied.                                                                                                                                                                                      |
| D-8  | Medium     | SEC-5 (previously documented): the web client persisted the **refresh token in `localStorage`** and also wrote a JS-readable `access_token` cookie, defeating the API's `HttpOnly` cookie design.                     | `store/slices/auth-slice.ts` (pre-change)                                           | Fixed: the refresh token is memory-only, the legacy key is purged on boot, and the JS cookie write is removed.                                                                                                                        |
| D-9  | Low–Medium | SEC-4 (previously documented): the login page rendered the seeded dev password in a 1-click demo strip in every build, and a non-OAuth "Sign in with Google" button that merely filled demo credentials.              | `components/auth/authShell.tsx`, `LoginForm.tsx` (pre-change)                       | Fixed: the demo strip is gated to non-production builds; the fake provider button is removed and replaced with the real passwordless email-link flow.                                                                                 |
| D-10 | Low        | SEC-2 (previously documented): the guard/service fell back to a shared hardcoded JWT secret, and token verification did not pin the algorithm (no `alg` confusion protection) and did not validate `iss`/`aud`.       | `common/guards/auth.guard.ts`, `auth.service.ts`                                    | Partially fixed: algorithm is pinned to `HS256` and `iss`/`aud` are issued and validated when present. Findings D-10a (fail-closed on unset secret) and D-10b (mandatory `iss`/`aud` for legacy tokens) remain open — see report §13. |
| D-11 | Low        | F-7 (previously documented): the `/dashboard/admin/*` nav is shown to `support_agent` / `compliance_reviewer` / `super_admin` while some admin subroutes gate on the literal `admin` role only, producing dead links. | `lib/navigation.ts`, `docs/engineering/01-product-discovery.md`                     | Backend and the new route policy already treat the admin family as `admin ∪ super_admin ∪ support_agent ∪ compliance_reviewer`; the remaining nav-vs-layout filter is a web-nav refactor left for a later pass (report §13).          |

## 3. Missing functionality (implemented this phase)

| ID  | Gap                                                                              | Implemented                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-1 | No onboarding state at all (zero occurrences of "onboarding" in the codebase).   | Migration 013 `user_onboarding` + `OnboardingService`/`OnboardingController` (config-driven per-role tracks, server-side derivation and validation), `/onboarding` web page and `OnboardingGate`. |
| M-2 | No passwordless login.                                                           | Migration 013 `auth_magic_links` + `requestMagicLink`/`consumeMagicLink` (hashed, single-use, expiring, throttled, open-redirect-guarded) + `/magic-link` confirmation page.                      |
| M-3 | No OTP delivery abstraction or fallback.                                         | `modules/auth/delivery/*` provider chain + configuration + tests.                                                                                                                                 |
| M-4 | No forgot-password UI (the login page linked to `/contact`).                     | `/forgot-password` page using the real `request-code` / `reset-password` endpoints.                                                                                                               |
| M-5 | `organization_owner` / `organization_staff` were absent from the web role model. | Added to `UserRole`, `primaryRole()` ordering and `dashboardPathForRole()`.                                                                                                                       |
| M-6 | Frontend role/route policy was scattered across layouts.                         | `apps/web/src/lib/route-policy.ts` (single mapping + tests).                                                                                                                                      |

## 4. Security risks confirmed as _correctly_ handled (kept as-is)

- No password hash, OTP, refresh token or magic-link token is logged: the OTP path logs only the masked
  destination/purpose; audit entries carry metadata only (`auth.service.ts`, `StructuredLoggerService` masking tests).
- Refresh-token replay revokes **all** sessions for the user (`auth.service.ts#refresh`, covered by tests).
- Login uses a uniform 401 for unknown account and wrong password; `magic-link/request` and `request-code`
  return identical responses whether or not the contact exists.
- `RolesGuard` + `GuardianStudentGuard` are server-side and authoritative; frontend guards are supplementary.
- Tutor publication remains gated on `tutor_profiles.verification_status` — onboarding completion cannot mark a
  tutor verified.

## 5. Migration requirements (delivered)

`013_auth_onboarding_and_magic_links.sql` (forward-only, idempotent):
`users.auth_epoch`; tables `user_onboarding` and `auth_magic_links` with their check constraints, unique
constraints and indexes. Rollback instructions are documented in
`docs/features/authentication/IMPLEMENTATION_REPORT.md` §4.

## 6. Dependencies on other features

- **Notifications**: no auth-related business event required a notification this phase; the centralized
  notification system is untouched and remains the single delivery mechanism for product events.
- **Tutor verification** (later phase): onboarding step `verification` reads
  `tutor_profiles.verification_status` and never writes it.
- **Organizations** (later phase): the `organization_staff` step `membership` and the owner step
  `ownership_verification` are approval-gated and intentionally report `pending` because no organization
  membership table exists yet — this is a documented gap, not a silent grant.
- **Admin provisioning**: privileged roles continue to be granted exclusively through the existing admin
  surface (`admin/dto/update-user-roles.dto.ts`), which now has a matching registration-policy statement.

## 7. Route/inventory facts used by the plan

- API controllers are opt-in guarded (`@UseGuards(...)`), there is no global guard: `docs/engineering/03-backend-and-api.md`
  §3. The account-status enforcement added to `AuthGuard` therefore applies to every guarded route, and
  `AuthSecurityModule` is `@Global` so the guard resolves its account-state dependency in every module.
- The web app additionally re-validates `roles` from the API on boot (`AuthBootstrap` → `GET /auth/me`), so a
  revoked role is reflected on the next authorization round-trip; the API remains the authority.
