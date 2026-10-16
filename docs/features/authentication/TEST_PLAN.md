# Authentication & Role-Based Onboarding — Test Plan (Phase 01)

Frameworks: **Vitest** (API / web / database) and **Playwright** (web e2e). All new automated tests use
deterministic mocks for external delivery — no live SMS/email credentials are required.

## 1. New automated coverage delivered

| Area                             | Spec                                                     | Key cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Account status & token hardening | `apps/api/test/auth-guard-account-status.spec.ts`        | active account accepted; suspended/deactivated rejected; stale credential epoch rejected; deleted account rejected; HS512 token rejected; mismatched `iss` rejected; synchronous no-DI path preserved                                                                                                                                                                                                                                                                          |
| Token & policy utilities         | `apps/api/test/auth-hardening.utils.spec.ts`             | HS256 + `iss`/`aud` + `authEpoch` issued; epoch default 0; only student/guardian/tutor self-signup; privileged roles are never self-signup; locale normalisation; magic-link entropy/hash; internal-redirect allow-list; open-redirect rejections                                                                                                                                                                                                                              |
| OTP delivery & fallback          | `apps/api/test/otp-delivery.spec.ts`                     | primary success; fallback on retryable failure; **no** fallback on invalid destination; not-configured result; HTTP status classification; destination masking; dev adapter records deliveries; dev adapter refuses production                                                                                                                                                                                                                                                 |
| Onboarding                       | `apps/api/test/onboarding.service.spec.ts`               | all nine role tracks exist; most-constrained role resolution; status derived from trusted records; contact step only from a verified timestamp; invalid payload rejected; system-verified step not user-submittable; cross-role step rejected; valid step advances `nextStep`; track completes when required steps are satisfied; approval-gated step → `pending_review`; tutor never marked verified from onboarding; security acknowledgement required; no-roles empty track |
| Magic link & OTP flow            | `apps/api/test/auth-magic-link.spec.ts`                  | unknown account → generic response, nothing stored; hashed token stored, raw token delivered out-of-band, untrusted redirect dropped, no token in the response; suspended account not revealed; successful consume issues a session and consumes atomically; reused/expired/unknown tokens rejected; concurrent-consumption race rejected; OTP delivered via the provider chain; outstanding codes invalidated; recovery code checked but not consumed                         |
| Bypass hardening                 | `apps/api/test/auth-bypass-guard.spec.ts` (updated)      | production cannot enable `ALLOW_TEST_AUTH_BYPASS`; opt-in still works for non-production harnesses                                                                                                                                                                                                                                                                                                                                                                             |
| Web credential storage           | `apps/web/test/auth-session-storage.spec.ts`             | refresh token never persisted, legacy key purged; no JS-readable access cookie; magic-link + onboarding endpoints exist; onboarding step payload builders                                                                                                                                                                                                                                                                                                                      |
| Web route policy                 | `apps/web/test/route-policy.spec.ts`                     | locale stripping; longest-prefix match; per-prefix role allow-list; admin-family boundaries; onboarding-gated vs self-service prefixes; nine-role primary-role ordering and dashboard destinations                                                                                                                                                                                                                                                                             |
| Migration integrity              | `packages/database/test/migration.spec.ts` (updated)     | new tables present; `users.auth_epoch` present; new indexes present; duplicate onboarding track rejected; invalid onboarding status rejected                                                                                                                                                                                                                                                                                                                                   |
| BCDR replay                      | `packages/database/test/bcdr-recovery.spec.ts` (updated) | cold-start replay now expects 13 ordered migrations                                                                                                                                                                                                                                                                                                                                                                                                                            |

## 2. Pre-existing coverage that continues to guard this phase

`auth.service.spec.ts` (registration/login/rotation/replay/OTP), `auth.authorization.spec.ts` (RolesGuard,
GuardianStudentGuard, rate limiter, AuthGuard JWT verify), `auth.controller.spec.ts`,
`validation-boundary.spec.ts` (DTO metatype tripwire), `env.validation.spec.ts`,
`security-and-privacy-hardening.spec.ts` (log masking, error sanitisation), web `auth-flow.spec.ts`,
`auth-forms.spec.ts`, `store.spec.ts`, `session-mappers.spec.ts`.

## 3. Requirement → test traceability

| Requirement                                                         | Covered by                                                                                                                           |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Duplicate registration safe                                         | DB unique indexes (`migration.spec`) + `auth.service.spec` duplicate email + `23505` mapping (code path exercised by register tests) |
| Privileged-role self-assignment blocked                             | `auth-hardening.utils.spec` (policy) + register policy branch                                                                        |
| Invalid payloads rejected                                           | `validation-boundary.spec` (HTTP 400) + `onboarding.service.spec` (per-step validators)                                              |
| Suspended/unverified behaviour                                      | `auth-guard-account-status.spec`, `auth.service.spec` (suspended login), `auth-magic-link.spec` (suspended not revealed)             |
| OTP success/incorrect/expired/reuse/limits/rate limit               | `auth.service.spec`, `auth.authorization.spec` (rate limiter), `auth-magic-link.spec`                                                |
| OTP delivery failure + fallback                                     | `otp-delivery.spec`                                                                                                                  |
| Valid/expired/malformed/invalid-signature/rejected-algorithm tokens | `auth.authorization.spec`, `auth-guard-account-status.spec`                                                                          |
| Refresh rotation + reuse detection                                  | `auth.service.spec`                                                                                                                  |
| Logout + server-side revocation                                     | `auth.controller.spec`, `auth.service.spec`                                                                                          |
| Role boundaries for nine roles                                      | `route-policy.spec` (policy) + `auth.authorization.spec` (server guard)                                                              |
| Onboarding resume / mandatory step / approval gates                 | `onboarding.service.spec`                                                                                                            |
| Magic link invalid/expired/reused/wrong-purpose/open-redirect       | `auth-magic-link.spec`, `auth-hardening.utils.spec`                                                                                  |

## 4. Manual / e2e verification steps

1. `pnpm --filter @ogroniedu/database db:migrate` → applies `013_…` (13 migrations total).
2. Register a student at `/bn/register`; confirm redirect to `/bn/onboarding` and that the API returns
   `status: in_progress` from `GET /api/v1/onboarding/me`.
3. Complete `profile` and `learning_preferences`; confirm the track flips to `completed` and
   `/bn/dashboard/student` is reachable.
4. `POST /api/v1/auth/magic-link/request` for the seeded student; capture the link from the `dev` provider
   (no live email configured) and confirm `/bn/magic-link?token=…` requires an explicit click and is
   single-use.
5. Promote an account to `suspended` in the database and confirm an existing access token is rejected
   (`401 Session credentials are no longer valid` / account-not-permitted) on the next request.
6. Playwright: `pnpm --filter @ogroniedu/web e2e` (requires the dev stack + seeded data).

## 5. Explicit non-goals for automated tests

- Live SMS/email provider delivery (no contractual credentials available) — the abstraction and its failure
  classification are unit-tested; real delivery remains **unverified** (report §12).
- Distributed (Redis-backed) rate limiting under load — out of scope; the existing in-memory limiter is
  unchanged.
