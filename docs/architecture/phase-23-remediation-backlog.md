# Phase 23 — Remediation Backlog (prioritized, dependency-aware)

Status legend: DONE = fixed+verified this phase. OPEN = remaining with priority + justification.
All OPEN items are incremental, behavior-preserving unless noted.

## P1 — Correctness / security / high-risk regressions

- [x] DONE: Session-cancel envelope (`assessment` inside `data`) + tutor-delete `data:null`.
- [x] DONE (partial): `isAdminRole/isSuperAdmin/hasAnyRole` helper; adopted in `roles.guard`, `files.service`.
- [x] DONE (session 2): P1-1 query unification (backward-compatible). `fromOffsetLimit()`
      helper + adopted in admin (users/bookings/audit-logs) and admin-support controllers;
      `pageSize` canonical alias on tutor search + notifications (resolvers prefer it, legacy
      `limit` fallback); web `SearchTutorsParams.pageSize` + `SearchTutorsResponse.meta`.
      Deliberate domain caps documented: tutors 50, chat 50, global 100.
- [x] DONE (session 4): P1-2b complete. All DTO shapes covered (incl. refresh-token,
      recurring-sessions with nested slots, settle-milestone, admin-cancel-booking,
      verify/revoke-link, request/verify-code, reset-password, delete-account, moderate-review,
      tutor-reply, update safety/replacement, assign-case, impersonation); shared `IsoDateString`
      matches backend `IsDateString` date-only acceptance. `contracts-parity.spec.ts` at 55 tests.
- [x] DONE (session 4): P1-4b complete. Users → `StudentProfileService` + `UserLifecycleService`
      (facade, controller untouched); guardians → `GuardianProvisioningService` (+ policy const
      extraction); analytics → `AnalyticsTutorService` (no ledger coupling) + shared
      `analytics-sql.util.ts`; notifications → `NotificationPreferencesService`. All specs
      rewired through real sub-services.
- [x] DONE (session 2, partial): P1-3 feed paging. `use-notifications-feed` now sends real
      `page` + fixed limit and accumulates deduped items; `unreadCount` from server total.
      Cursor-mode `total` RETAINED by decision: existing tests explicitly pin
      ("cursor mode omits totalPages but keeps an accurate total") and the unread tab needs it;
      spec §3 only forbids `totalPages` in cursor mode (obeyed).
- [x] DONE (sessions 2+4): P1-4 slices then full splits (see top).
- [x] DONE (session 2): P1-5 full rollout. `ADMIN_ROLES`/`SUPER_ADMIN_ROLE`/
      `SUPPORT_TRIAGE_ROLES` constants; `isAdminRole` in 20 service/guard sites (incl. single-
      `admin` checks — super_admin now consistently included, aligned with RolesGuard bypass);
      `isSuperAdmin` in 5 least-privilege gates; `@Roles(...ADMIN_ROLES)` in all 29 sites.
- [x] DONE (session 2): P1-6. New `pagination-boundary.spec.ts` (13 tests): INVALID_CURSOR,
      SORT_NOT_ALLOWED, `fromOffsetLimit`, resolver precedence, DTO bound rejection, role.utils.
- [x] DONE (session 3): P1-6b + P2-7. `http-envelope.spec.ts`: real `ValidationPipe`
      forbidNonWhitelisted checks (unknown params 400; canonical+legacy accepted) +
      `expectSuccessEnvelope`/`expectHttpEnvelope` helpers; `meta` ownership documented in
      api-contract-standard.md §7 (controllers hand-build shape, interceptor injects requestId).

## P2 — Maintainability / type-safety

- [x] DONE (partial): Extract `environment.enum`, file-validation constants, auth interfaces,
      support-ticket limits; `Record<string,any>`→`unknown` (5 sites); outbox narrowing.
- [x] DONE: `lib/navigation.ts` extraction; `lib/format.ts`; `ApiSuccessEnvelope` re-anchor;
      `tutors-api` serializer/TutoringMode dedup; canonical-aware errors + `normalizeUnknownError`.
- [x] DONE (session 2): P2-1. Extracted 10 interfaces (`UserProfileResponse`, `TimeBounds`,
      `PlatformStats`, `RecordAuditParams`, `StudentLearningSummary`, `AuthenticatedUser`,
      `StructuredLogPayload`, `OutboxProcessingResult`, `PublicCalendarSlot`,
      `LinkedChildSummary`) with compat re-exports. Cohesive `api-error/api-response/pagination`
      type+builder modules intentionally left whole (splitting would scatter the envelope contract).
- [x] DONE (session 2): P2-2. All 21 `err as never` sites → `normalizeUnknownError`
      (zero remaining); `use-checkout-flow` narrowing uses `in`-operator (no cast).
      `as unknown as Record` narrowers in `tutors-page`/`use-admin-dashboard`/`use-bookings` remain
      (runtime-validated mappers; acceptable, documented here).
- [x] DONE (session 3): P2-3. DashboardShell split into `DashboardSidebar`/
      `DashboardTopbar`/`DashboardMobileNav` + shared `isNavActive()` (tested); auth forms split
      into `use-login-form`/`use-register-form` + pure `auth-validation.ts` (tested in
      `auth-forms.spec.ts`). Remaining splits (home-page, AdminDashboardView, dashboard pages,
      GuardianChildrenManager) stay OPEN — large JSX, needs dedicated PRs with visual review.
- [x] DONE (session 3): P2-4 complete. Pricing double-format, tutor/student/guardian dashboard
      datetime mirrors, payment/analytics formatters all on `lib/format`.
- [x] DONE (session 3): P2-5. Deleted 7 dead files (`tutors` wrappers ×4, dead hook, dead type
      files ×2); `features/tutors` barrel now exports the live surface and both tutor routes import
      from it. Full cross-feature barrel enforcement remains a convention item (no violations left
      in touched areas).
- [x] DONE (session 3): P2-6 complete. `GuardianAccessService` (guardians module, owns
      link repo; acyclic: guardians imports neither bookings/learning/notifications) centralizes
      participant+admin+guardian booking checks, active-link assertions, both fan-out directions;
      adopted in bookings, session-queries, learning-access, attendance, assignments,
      booking-messages, payment-orders, payment-webhooks (9 services, link repos removed where
      orphaned: learning/notifications/payments forFeature). Shared `isMinor` age gate
      (`common/utils/age.util.ts`) adopted in users + guardians. Error factories: deferred —
      current messages are user-facing copy, not worth churning (documented).
- [x] DONE (session 3): P2-7 (see P1-6b above).

## P3 — Tooling / coverage

- [x] DONE (session 3): P3-1. OxLint 1.88 (typescript-eslint 8.x rejects the repo's
      TS 7.0 — documented toolchain constraint) with `--deny-warnings` gates:
      `pnpm lint` → 0 warnings/errors (327 web + 313 api files); ~120 dead imports/vars
      removed. Wired into turbo (`lint` task).
- [ ] OPEN P3-2: E2E (needs staging + seeded creds — environmental): notifications feed/cursor,
      chat paging + redaction, payment order→receipt→refund idempotency, tutor search sort/paging,
      `SORT_NOT_ALLOWED`/`INVALID_CURSOR`/`VALIDATION_ERROR details[]` toasts.
- [x] DONE (session 3): P3-3. `contract-roundtrip.spec.ts` (resource payloads through parsers,
      fieldErrorsOf→RHF mapping, per-code × locale normalization) + `auth-forms.spec.ts`
      (validators, `isNavActive`).
- [x] DONE (session 2): P3-4. `docs:validate` now PASSES (161 files; fixed 2 pre-existing
      broken `file://` links caused by `learning-management-view.tsx` vs `learningManagementView.tsx`
      casing typo in CHANGELOG.md + learning-management-audit.md).

## Dependency order (all sessions complete)

All P1/P2/P3 items are DONE except consciously-deferred notes below. E2E runs green
locally (45/45) — the staging-creds blocker is lifted for local runs via dev seeds.
Do not change business rules (refund matrix, verification flows, role semantics) without ADR.

Consciously remaining: page-assembler JSX length (no extractable logic), static marketing
fallback numbers (product call), shared error factories (user-facing copy churn).
