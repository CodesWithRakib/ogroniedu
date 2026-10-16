# Authentication & Role-Based Onboarding — Implementation Plan (Phase 01)

Companion to `AUDIT.md` (findings D-1…D-11, M-1…M-6). Work is ordered by security value and by
"does this change the trust boundary".

## Guiding decisions

1. **Do not fork the auth architecture.** The existing JWT + `auth_sessions` refresh design, rate limiter,
   audit log and notification system are kept. Every change is additive or a targeted fix.
2. **Backend is authoritative.** Onboarding state, account status, role eligibility and token validity are
   all decided server-side. Frontend guards/gates are UX only.
3. **Least privilege by default.** Privileged roles cannot be self-registered; onboarding tracks for
   privileged roles require an explicit security acknowledgement; approval-gated steps are never completable
   by the user.
4. **Small, focused files.** One responsibility per file; DTOs, config, validators, providers and services
   separated along the existing conventions.

## Step 1 — Persistence (done)

Migration `013_auth_onboarding_and_magic_links.sql`.

## Step 2 — Token & guard hardening (done)

- `utils/token.utils.ts`: pin `HS256`, issue `iss`/`aud`, embed `authEpoch`.
- `services/account-access.service.ts`: authoritative `status` + `auth_epoch` lookup.
- `common/guards/auth.guard.ts`: algorithm pinning, conditional `iss`/`aud` validation, account-state and
  epoch enforcement. Kept `boolean | Promise<boolean>` so the direct-construction unit path stays synchronous.
- `auth-security.module.ts` (`@Global`) so the guard resolves `AccountAccessService` everywhere.
- `common/auth/test-auth.ts`: production can never enable the impersonation bypass (SEC-1).

## Step 3 — OTP delivery + lifecycle (done)

- `delivery/otp-delivery.types.ts`: provider contract, failure classification, log masking.
- `delivery/providers/{dev,http-gateway}-otp.provider.ts`.
- `delivery/otp-provider.factory.ts`: configuration-driven chain + Nest token.
- `delivery/otp-delivery.service.ts`: primary → eligible fallback, bounded retries, timeouts, no OTP logging.
- `auth.service.ts#requestCode`: invalidate outstanding codes → insert → deliver → audit.
- `auth.service.ts#verifyCode`: atomic single-use consumption for contact verification; recovery codes are
  checked only.

## Step 4 — Registration & account lifecycle (done)

- `utils/registration-policy.ts` (self-signup vs privileged provisioning, locale normalisation).
- `auth.service.ts#register`: policy check, transactional insert of user + role + tutor profile + onboarding
  row + session, `23505` → `409`, audit `auth.register`.
- Account lifecycle unchanged and now enforced: `pending_verification` may sign in but is gated by the
  onboarding track; `suspended`/`deactivated`/`deletion_pending` cannot sign in, refresh **or** use an
  existing access token.

## Step 5 — Onboarding (done)

- `modules/onboarding/onboarding.config.ts`: per-role step tracks for all nine roles; `submittable`,
  `approvalGated`, `systemVerified` flags; role priority resolution.
- `modules/onboarding/onboarding-validators.ts`: pure payload validators.
- `modules/onboarding/onboarding.service.ts`: derived status from trusted records, atomic-ish upsert of
  progress, step completion with validation, audit `auth.onboarding.step_completed`.
- `modules/onboarding/onboarding.controller.ts` + `onboarding.module.ts`:
  `GET /api/v1/onboarding/me`, `POST /api/v1/onboarding/steps/:stepKey`.

## Step 6 — Passwordless magic link (done)

- `utils/magic-link.utils.ts`: token generation/hash + allow-listed internal redirect guard.
- `auth.service.ts#{requestMagicLink,consumeMagicLink}`: enumeration-safe request, invalidate previous links,
  atomic single-use consumption, session issuance, audit.
- `auth.controller.ts`: `POST /api/v1/auth/magic-link/{request,consume}`.

## Step 7 — Frontend (done)

- `store/slices/auth-slice.ts`: refresh token memory-only, legacy key purged, nine-role model.
- `store/base-api.ts`: single-flight refresh, no persisted refresh token, no refresh loop.
- `store/services/{auth-api,onboarding-api}.ts`.
- `lib/route-policy.ts`: centralized route → role/onboarding mapping.
- `components/auth/OnboardingGate.tsx`, `features/onboarding/*`, `features/auth/pages/*`,
  routes `/onboarding`, `/forgot-password`, `/magic-link`.
- `LoginForm`: real passwordless email-link flow; fake Google button removed; forgot-password now links to
  the real page.
- `authShell`: demo quick-fill gated to non-production builds.

## Step 8 — Contracts & docs (done)

- `packages/contracts/src/identity.ts`: magic-link + onboarding schemas.
- This document set; environment variables added to both `.env.example` files.

## Explicitly out of scope (later phases)

Tutor verification workflow, discovery, bookings, escrow payments, LMS, disputes, organization management.
Where those features own state that onboarding must not fake (`membership`, `ownership_verification`,
`verification`), the step is approval-gated and reported as pending.

## Verification plan

See `TEST_PLAN.md`. Completion requires: typecheck, lint (no new warnings), API/web/database suites, and the
production web build, with results recorded in `IMPLEMENTATION_REPORT.md`.
