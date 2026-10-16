# Phase 23 — Strict Architecture, Maintainability & Code Quality Audit Report

Date: 2026-10-14. Auditor: Staff Engineer (post-Phase-22 verification).
Scope: actual source in `apps/api/src`, `apps/web/src`, `packages/contracts/src`,
`apps/api/test` (47 files), `apps/web/test` (23 files), `apps/web/e2e` (8 specs).
Method: full-tree inspection via parallel subagent audits + direct file reads +
strict `tsc --noEmit`, `vitest run` (both apps), `next build` / `tsc -p tsconfig.build.json`,
prettier checks. No reliance on changelogs or prior agent reports.

## 1. Baseline (before remediation)

- API typecheck: PASS (`tsc --noEmit`, exit 0).
- Web typecheck: PASS after fixes (2 errors found and fixed during phase — see §3).
- API tests: 47 files / 414 tests PASS. Web tests: 23 files / 109 tests PASS.
- API build (`tsc -p tsconfig.build.json`): PASS. Web build (`next build`): PASS (26 routes).
- Prettier: 2 files needed reformatting (`lib/navigation.ts`, `DashboardShell.tsx`); fixed.
- No eslint config in either app (`package.json` has no lint script) — lint step N/A, noted as gap.
- E2E (playwright): NOT run — requires live staging + seeded credentials
  (`E2E_ADMIN_EMAIL/PASSWORD`, `E2E_STUDENT_*`, `E2E_TUTOR_*`); environmental blocker, documented.
- `any` count: API 5 real annotations (all in admin JSONB + outbox cast); web 0 real
  annotations (only prose hits). Web instead has 20+ `err as never` casts (any-equivalent).

## 2. Findings by severity

### HIGH

1. **API envelope violations (contract breakage).**
   - `SessionsController.cancelSession` returned `{ success, message, data: session, assessment }` —
     extra top-level `assessment` outside `SuccessEnvelope<T>`. Only an undocumented web mapper knew.
   - `TutorsController.deleteQualification/deleteSubject` returned `{ success, message }` with no
     `data` — violates `SuccessEnvelope<T>` (`data` required); `parseItem` consumers break.
   - Severity HIGH: silent client/server disagreement. **FIXED** (§3.1).
2. **Duplicated query-param dialects (silent 400s).**
   - Canonical: `page/pageSize/search/sortBy/sortOrder`; tutor search uses `page/limit/sort/mode`;
     notifications mixes `limit` (offset) + `pageSize` (cursor); messages default 50 vs global 20;
     admin/support use legacy `offset/limit`. `ValidationPipe(forbidNonWhitelisted)` rejects wrong
     names with 400 — untested at HTTP layer. **Partially fixed** (single `toQueryString`, docs);
     full unification is backlog P1 (needs migration + versioning).
3. **Contracts package covers notifications only.**
   - All other domains (auth/bookings/sessions/tutors/learning/payments/guardians/trust/support/
     admin/analytics/taxonomy/files) duplicate DTOs in API (class-validator) and web (interfaces)
     with no single source. Any rename breaks silently. Backlog P1.
4. **Scattered admin-role checks (10+ copies).**
   - String literals `'admin'/'super_admin'` in `roles.guard`, `guardian-student.guard`,
     `files.service`, `session-queries.service`, `bookings.service`, `admin-users.service`,
     `admin-platform.service` + 15× `@Roles('admin','super_admin')`. Typo/divergence risk.
     **Central helper created and adopted in 2 high-risk sites** (§3.2); full rollout is backlog P1.

### MEDIUM

5. **Oversized multi-responsibility services (API).**
   `auth.service` 547 lines (register+login+JWT rotation+OTP+reset), `notification.service` 530,
   `analytics.service` 439 (5 domains + direct LedgerService import), `guardians.service` 419,
   `bookings.service` 381, `assignments.service` 351, `tutor-profile.service` 344, `users.service`
   327 (5 injected repos across auth/guardians/bookings). Facades (`learning.service`,
   `tutors.service`, `admin-operations.service`) hide `forwardRef` cycles. **Interfaces/constants
   extracted** (§3.3); full service splits are backlog P1 (behavior-preserving, need per-domain tests).
6. **Mixed co-location (types + logic in one file).**
   `env.validation.ts` (enum+class+fn), `auth.service.ts` (2 interfaces), `users/analytics/learning/
public/audit/outbox/files/support` (interfaces/constants inline), `api-error.ts`/`api-response.ts`/
   `pagination.ts` (types+builders), `current-user.decorator.ts` (`AuthenticatedUser`),
   `structured-logger.service.ts`. **Extracted the highest-value 6** (§3.3); remainder is backlog P2.
7. **Web: duplicated types/formatters.**
   `TutoringMode` ×2 (+ inline mirror), `SessionStatus` re-alias, tutor-search stack triplicated
   (`TutorSearchItem` vs `TutorCardData` vs `TutorSearchFilterParams`), 3 parallel formatter systems
   (canonical `formatLocalizedNumber` vs per-file `toLocaleDateString`/`toLocaleString`+BDT),
   `ApiSuccessEnvelope` (weak `{success:boolean,total?}`) vs canonical `contract.ts`,
   per-service `toQueryString` duplicate. **Fixed**: canonical `TutoringMode` import, removed
   `tutors-api` duplicate serializer, `ApiSuccessEnvelope` re-anchored to `SuccessEnvelope<T>`,
   new `lib/format.ts`, widened shared `toQueryString` (§3.4–3.5).
8. **Web: `as never` error casts (20+ sites) + `as unknown as Record` narrowings.**
   Root cause: `normalizeApiError` typed as `FetchBaseQueryError | SerializedError | undefined`
   while catch variables are `unknown`. **Fixed at boundary**: new `normalizeUnknownError(unknown)`
   - canonical-envelope-aware `messageFromData`; migrated `use-sessions-calendar.ts` (2 sites) as
     pattern. Remaining 18+ sites are backlog P2 (mechanical migration).
9. **Web: 563-line `DashboardShell` (nav map + presets + shell).**
   **Fixed**: nav/presets extracted to `lib/navigation.ts`; shell keeps compat re-exports (§3.6).
   Remaining shell (~450 lines post-extract) still mixes topbar/sidebar/drawer/bottom-bar — P2 split
   into `DashboardTopbar/Sidebar/MobileNav` proposed.
10. **Frontend legacy parsing crutches.**
    `parseOffsetCollection` legacy fallback, hybrid `NotificationsListResponseDto`
    (legacy `items/total/...` + canonical `success/data/meta`), cursor mode still sends `total`,
    `use-notifications-feed` grows window (`limit = PAGE*page`, `page:1` fixed) instead of paging,
    `normalizeApiError` previously dropped `error.details[]`/canonical `error.message`/legacy
    `statusCode[]`. **Partially fixed** (error path now canonical-aware, §3.7); notification DTO
    dedup + feed paging are backlog P1.

### LOW

11. Duplicated guardian-consent message, guardian-link lookups, learning access triple-checks,
    `NotFoundException('User not found')` ×4 — candidates for shared `GuardianAccessService` /
    error factories (backlog P2).
12. Deep cross-feature imports bypassing barrels (`components/*` → `features/*` internals,
    `features/tutors` ↔ `features/tutor-discovery` wrapper cluster, relative `../../lib/i18n`).
    Convention documented (backlog P2); no runtime breakage found.
13. `meta?` optional on web vs required on API; `ResponseMetaInterceptor` reliance means direct
    service unit tests never see `requestId`. Documented; no change (interceptor is the enforcer).
14. No hardcoded mock data found — verified (only `EMPTY_CATALOG` empty-state + enum lists).
    Role dashboards/layouts/routes/permissions verified wired to real RTK Query endpoints.

## 3. Remediation applied (verified)

### 3.1 API envelope contract (HIGH #1) — FIXED

- `apps/api/src/modules/tutors/tutors.controller.ts`: `deleteQualification` + `deleteSubject`
  now return `{ success:true, message, data:null }`.
- `apps/api/src/modules/bookings/sessions.controller.ts`: `cancelSession` now returns
  `{ success:true, message, data:{ session, policyAssessment } }` — assessment inside `data`.
- `apps/web/src/store/services/sessions-api.ts`: `cancelSession` type changed from
  `ApiSuccessEnvelope<SessionItem> & { assessment?: unknown }` to
  `ApiSuccessEnvelope<{ session: SessionItem; policyAssessment: unknown }>`.
- `apps/web/src/features/bookings/hooks/use-sessions-calendar.ts`: reads
  `data.policyAssessment` with legacy `assessment` fallback.
- Regression tests: `apps/api/test/sessions.controller.spec.ts` (canonical shape + asserts NO
  top-level `assessment`), `apps/api/test/tutors.controller.spec.ts` (`data:null` on both deletes).

### 3.2 Central admin-role helper (HIGH #4, partial)

- New `apps/api/src/common/auth/role.utils.ts`: `isAdminRole` / `isSuperAdmin` / `hasAnyRole`.
- `common/guards/roles.guard.ts` uses `isSuperAdmin`; `modules/files/files.service.ts` uses
  `isAdminRole` (replaces inline `roles.includes` chain).

### 3.3 API type/structure extraction (MED #5–6, partial)

- `Record<string, any>` → `Record<string, unknown>`: `system-setting.entity.ts`,
  `feature-flag.entity.ts`, `update-system-setting.dto.ts`, `update-feature-flag.dto.ts`.
- `outbox-worker.service.ts`: `(event.payload||{}) as Record<string,any>` → runtime-narrowed
  `Record<string, unknown>`.
- New `config/environment.enum.ts` (re-exported from `env.validation.ts` for compat).
- New `modules/files/constants/file-validation.constants.ts` (service re-exports for compat).
- New `modules/auth/interfaces/auth-response.interface.ts` (`TokenPayload/AuthUserSummary/
AuthResponse/AuthMeta`; service re-exports types).
- New `modules/support/constants/support-ticket-limits.constants.ts` (service re-exports cap).

### 3.4 Web envelope/type dedup (MED #7)

- `store/base-api.ts`: `ApiSuccessEnvelope<T>` re-anchored to
  `SuccessEnvelope<T> & { total?: number }` with `@deprecated` pointer to canonical contract.
- `store/services/tutors-api.ts`: imports canonical `TutoringMode` from
  `features/bookings/types/booking.types`; deleted local `toQueryString` duplicate (uses
  `lib/api/query`).
- `lib/api/query.ts`: signature widened to `toQueryString(params: object)` with runtime
  scalar-narrowing (accepts feature param interfaces without index signatures, skips non-scalars).

### 3.5 Central formatters (MED #7)

- New `apps/web/src/lib/format.ts`: `formatDate/formatDateTime/formatLocalizedNumber/
formatBDTMinor` (null/NaN-safe, locale-aware). Adoption beyond tests is backlog P2.

### 3.6 Navigation extraction (MED #9)

- New `apps/web/src/lib/navigation.ts`: `NavItem/RoleWidget/RoleConfig`, `navForRole`,
  `ROLE_PRESETS` (moved verbatim). `DashboardShell.tsx` slimmed 563→~450 lines, keeps
  `export { navForRole, ROLE_PRESETS }` + type re-exports for compat.

### 3.7 Canonical error handling (MED #8, #10 partial)

- `lib/api-error.ts`: `messageFromData` now understands canonical
  `error.{message,details[0].message}` first, then legacy `message[]`/`errors[]`;
  added `normalizeUnknownError(error: unknown, locale)` (no `as never` needed).
- `use-sessions-calendar.ts`: 2× `err as never` → `normalizeUnknownError`.
- `parse.ts: normalizeEnvelopeError` now inherits canonical awareness via `baseNormalize`.

## 4. Verification results (actual)

| Check         | Command                                                             | Result                                                                                     |
| ------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| API typecheck | `pnpm --filter @ogroniedu/api exec tsc --noEmit -p tsconfig.json`   | PASS (after fixing 1 test-typed regression during phase)                                   |
| Web typecheck | `pnpm --filter @ogroniedu/web exec tsc --noEmit -p tsconfig.json`   | PASS (2 errors found+fixed: missing `Search` icon import, `toQueryString` index-signature) |
| API tests     | `pnpm --filter @ogroniedu/api exec vitest run`                      | **47 files / 414 tests PASS**                                                              |
| Web tests     | `pnpm --filter @ogroniedu/web exec vitest run`                      | **23 files / 109 tests PASS**                                                              |
| API build     | `pnpm --filter @ogroniedu/api build` (`tsc -p tsconfig.build.json`) | PASS                                                                                       |
| Web build     | `pnpm --filter @ogroniedu/web build` (`next build`)                 | PASS — 26 routes                                                                           |
| Prettier      | `prettier --check/--write` on 17 touched files                      | PASS after write (2 reformatted)                                                           |
| Lint          | —                                                                   | N/A — no eslint config/script in repo (gap, backlog P3)                                    |
| E2E           | `playwright test`                                                   | NOT RUN — needs live staging + seeded creds (environmental blocker)                        |

Regressions caught by verification (proves the loop works):

1. `test/sessions.controller.spec.ts` failed typecheck after controller fix (asserted old
   `data.status`/`assessment` shape) → test updated to canonical shape.
2. Web typecheck caught `Search` icon removal overreach + `SearchTutorsParams` vs
   `Record<string, QueryValue>` mismatch → both fixed.

## 5. Role & feature integrity

- Layouts/routes/nav per role (`student/guardian/tutor/admin/super_admin/support_agent/
compliance_reviewer`) verified in centralized `lib/navigation.ts` + `RoleLayout`/`RequireAuth`/
  `RequireRole` wrappers; dashboards (`student/guardian/tutor/admin/analytics` pages) consume real
  RTK Query hooks (no mock datasets found).
- No feature disconnected by this phase: changed surfaces are `cancelSession` (hook updated with
  legacy fallback), tutor deletes (additive `data:null`), tutors search (same query string output),
  `DashboardShell` (verbatim move + re-exports), error messages (superset behavior).

## 6. Remaining issues → see `phase-23-remediation-backlog.md`

P1 (correctness/security/architecture): query-dialect unification, contracts-package expansion,
notification DTO/feed dedup, service splits (auth/notification/analytics/guardians/users),
role-helper rollout, HTTP-layer invalid-cursor/sort tests.
P2 (maintainability): shell splits, `as never` migration, formatter adoption, barrel convention,
guardian-access service, error factories. P3: eslint setup, E2E coverage, docs validation.

## 7. Session 2 addendum (2026-10-14, continued)

Executed the backlog in dependency order. All changes behavior-preserving except two
documented consistency fixes (role bypass alignment, bn-digit grouping on analytics figures).

**Fixed:**

- P1-1: `fromOffsetLimit()` + adopted in 4 controllers; `pageSize` alias on tutor search +
  notifications with shared precedence resolvers; web `pageSize`/`meta` types.
- P1-2 slice: `packages/contracts/src/pagination.ts` (offset/cursor/messages/search zod
  schemas + shared `resolveTutorSearchPageSize` imported by the API — zero duplication);
  `contracts-parity.spec.ts` (8 tests). Contracts package rebuilt (`dist`).
- P1-3: `use-notifications-feed` real paging (page + fixed limit, deduped accumulation,
  server `unreadCount`, stale-flag reset after mutations). Cursor `total` retained by
  decision (pinned by existing tests; spec only forbids `totalPages`).
- P1-4 slice: `auth/utils/token.utils.ts` (pure, tested) + `AuthMeta` reuse;
  `guardian-consent.util.ts` dedupes both consent flows. `auth-tokens.spec.ts` (5 tests).
- P1-5: `ADMIN_ROLES`/`SUPER_ADMIN_ROLE`/`SUPPORT_TRIAGE_ROLES`; `isAdminRole` in 20 sites
  (single-`admin` checks now include super_admin — aligns with RolesGuard bypass; intentional),
  `isSuperAdmin` in 5 gates, `@Roles(...ADMIN_ROLES)` in all 29 sites.
- P1-6: `pagination-boundary.spec.ts` (13 tests). Also found + fixed a test-isolation gap:
  DTO specs need explicit `import 'reflect-metadata'` (added to both new specs).
- P2-1: 10 interfaces extracted with compat re-exports.
- P2-2: all 21 `err as never` → `normalizeUnknownError` (zero remaining).
- P2-4: sessionCard/adminVerificationTab/analytics cards/paymentReceipt on `lib/format`;
  resolved `formatLocalizedNumber` name collision (i18n digit-mapper vs new `formatGroupedNumber`).
- P2-5 partial: Navbar/Footer → `@/lib/i18n`.
- P3-4: `docs:validate` PASSES (fixed 2 pre-existing broken links — filename casing typo).

**Verification (actual, session 2):**
API `tsc` PASS · Web `tsc` PASS · API vitest **50 files / 439 tests PASS** (was 47/414:
+13 pagination-boundary, +8 contracts-parity, +4 auth-tokens) ·
Web vitest **23 files / 109 PASS** · API build PASS · Web `next build` PASS (26 routes;
first attempt hit a transient worker timeout, retry green) · Prettier PASS ·
`docs:validate` PASS · E2E still NOT RUN (staging creds blocker, unchanged).

**Deliberately deferred (with justification):** full per-domain service splits (P1-4b),
full contracts expansion (P1-2b), `GuardianAccessService` (needs ownership ADR), DashboardShell
and dashboard-page splits (P2-3), `features/tutors`↔`tutor-discovery` merge (P2-5),
eslint setup (P3-1), E2E (P3-2), web round-trip tests (P3-3) — all recorded as OPEN with
priority in the backlog. No business rules changed.

## 8. Session 3 addendum (2026-10-15)

Closed the remaining backlog except P3-2 (environmental: live staging creds) and
explicitly-deferred slices. All changes behavior-preserving except two documented display
normalizations (analytics bn-digit grouping, dashboard date ordering via `lib/format`).

**Fixed:**

- P2-6: new `GuardianAccessService` (+`guardian-access.spec.ts`, 3 tests) adopted in 9
  services; orphaned link-entity registrations removed from learning/notifications/payments
  modules; shared `isMinor` age gate in users + guardians.
- P1-6b/P2-7: `http-envelope.spec.ts` (real ValidationPipe 400s + envelope helpers) and
  contract §7 (meta ownership/interceptor reliance).
- P1-2b: contracts cover all major domains (identity/bookings/learning/payments/guardians/
  trust/support/admin/analytics-files); `contracts-parity.spec.ts` at 51 tests.
- P1-4b slice: `NotificationPreferencesService` extracted; `NotificationService` delegates
  (constructor backward-compatible; prefs spec rewired through the real service).
- P2-3: shell split (Sidebar/Topbar/MobileNav + `isNavActive`) and auth-form hooks
  (`auth-validation.ts` pure + tested); new `auth-forms.spec.ts`.
- P2-4: pricing + all three dashboards on `lib/format`.
- P2-5: 7 dead files deleted; tutors barrel = live surface; routes import from barrel.
- P3-1: OxLint gates (`pnpm lint`, turbo task) — 0 warnings/errors on 640 files; ~120 dead
  imports/vars removed. typescript-eslint unusable (rejects TS 7.0).
- P3-3: `contract-roundtrip.spec.ts` + `auth-forms.spec.ts`.
- Caught during lint: 3 live `as any` casts + 1 dead-but-wired query hook call and unused
  router/dict in tutor-details-page — all fixed or removed (verified unused).
- Two regex cleanups (`[\s\-]` → `[\s-]`); semantics verified identical (hyphen literal
  at class end), content-safety specs green.

**Verification (actual, session 3):**
API `tsc` PASS · Web `tsc` PASS · API vitest **52 files / 490 PASS** · Web vitest
**25 files / 124 PASS** · API build PASS · Web `next build` PASS (27 routes) ·
`pnpm lint` PASS (0 warnings/errors) · `docs:validate` PASS · E2E NOT RUN (blocker unchanged).

**Remaining OPEN:** secondary contract DTOs (refresh-token, admin-cancel-booking,
settle-milestone, recurring-sessions), full analytics/guardians-provisioning/users-export
splits, home-page/AdminDashboardView/dashboard-page/GuardianChildrenManager splits,
cross-feature barrel enforcement, error factories (deferred: user-facing copy), E2E.

## 9. Session 4 addendum (2026-10-15, continued)

Closed all remaining code items. E2E now runs green against a local stack
(Postgres service + migrate + seed + API tsx + web dev) — the former
"environmental blocker" is lifted for local runs.

**Fixed:**

- Contracts: all DTO shapes incl. secondary (refresh-token, recurring-sessions with
  nested slots, settle-milestone, admin-cancel-booking, verify/revoke-link,
  request/verify-code, reset-password, delete-account, moderate-review, tutor-reply,
  update safety/replacement, assign-case, impersonation). New shared `IsoDateString`
  exactly matches backend `IsDateString` date-only acceptance (caught by parity test).
- Splits: users → StudentProfile + UserLifecycle facades; guardians →
  GuardianProvisioning (+ policy const); analytics → AnalyticsTutorService (ledger-free)
  - `analytics-sql.util.ts`; notifications → NotificationPreferencesService.
- **DI correctness (caught by live boot, not unit tests):** tsx/esbuild does not emit
  decorator metadata, so all cross-module injections now carry explicit `@Inject(...)`
  — the codebase convention. Unit tests + tsc passed without it; the running container
  did not. Rule recorded: never rely on bare constructor params for providers.
- GuardianChildrenManager → `use-guardian-children` hook + pure validator (tested).
- AdminDashboardView: 15 deep imports → single `@/features/admin` barrel (verification
  tab added to barrel). Tutor routes import from `@/features/tutors` barrel.
- Home/stats E2E drift fixed at the boundary: `platform-metrics-band` testid added;
  keyword-tab testids added (Bengali label matching is Unicode-fragile — documented).
  Fallback marketing numbers ('10,000+') when stats are missing remain a product call.
- Dead-code removal verified by tests, not just lint (tutor-details cleanup removed an
  unused query hook call — fewer requests, same UI).

**Verification (actual, session 4):**
API `tsc` PASS · Web `tsc` PASS · API vitest **52 files / 494 PASS** · Web vitest
**25 files / 126 PASS** · API build PASS · Web `next build` PASS (27 routes) ·
`pnpm lint` PASS (0 warnings/errors, 647 files) · `docs:validate` PASS ·
**Playwright E2E: 45/45 PASS** (smoke bn+en, guards, a11y, responsive matrix, booking
journey, admin console incl. verification + suspend/reactivate, tutor evidence) against
local seeded stack. One cold-start timeout (dev-compile slowness) passed on retry; two
genuine app/spec drifts fixed (see above).

**Remaining (conscious, documented):** home-page/dashboard-page JSX length (assemblers,
no extractable logic — splitting further adds files, not decoupling), static marketing
fallback numbers (product call), shared error factories (user-facing copy churn),
secondary admin-internal DTOs already covered. No business rules changed.
