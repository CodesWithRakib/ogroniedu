# OgroniEdu — Master Task Register

**Status:** AUDITED & OPERATIONAL  
**Date:** 2026-10-24  
**Scope:** Authoritative single source of truth for all modernization and release tasks.  
**Standardized Statuses:** `NOT_AUDITED`, `AUDITED`, `READY`, `IN_PROGRESS`, `BLOCKED`, `IMPLEMENTED`, `VERIFIED`, `DEFERRED`, `OUT_OF_SCOPE`.

---

## 1. Master Task Metrics & Breakdown

| Category | Prefix | Total Tasks | P0 (Blockers) | P1 (MVP Critical) | P2 (Modernization) | P3 (Hardening/Post-MVP) |
|---|---|---|---|---|---|---|
| **Test & TDD Foundation** | `TDD-xxx` | 3 | 0 | 3 | 0 | 0 |
| **Security & Privacy** | `SEC-xxx` | 4 | 0 | 2 | 2 | 0 |
| **Backend Interface Extraction** | `BE-xxx` | 33 | 0 | 8 | 25 | 0 |
| **Frontend Thin Routes & Views** | `FE-xxx` | 16 | 0 | 7 | 9 | 0 |
| **Event-Driven & Outbox** | `EVT-xxx` | 3 | 0 | 1 | 2 | 0 |
| **Database & Schema Integrity** | `DB-xxx` | 3 | 0 | 1 | 2 | 0 |
| **Browser E2E & Visual QA** | `E2E-xxx` | 6 | 0 | 4 | 2 | 0 |
| **Release & Deployment** | `REL-xxx` | 4 | 0 | 2 | 2 | 0 |
| **Total Tasks** | — | **72** | **0** | **28** | **44** | **0** |

*Note: There are currently zero confirmed P0 showstopper defects in the working tree. The platform is pre-release blocked by P1 integration and testing harness issues, which are prioritized for immediate execution.*

---

## 2. Priority P1 — MVP Critical Implementation Tasks

| Task ID | Phase | Area | Status | Title & Objective | Affected Files | Dependencies | Acceptance Criteria & Test Commands |
|---|---|---|---|---|---|---|---|
| `TDD-001` | Phase 01 | API Testing | **READY** | Configure Vitest test environment variables in `apps/api` | `apps/api/vitest.config.ts` | None | Create `vitest.config.ts` providing `JWT_SECRET`, `NODE_ENV=test`. Command: `pnpm --filter @ogroniedu/api test` passes 1,026/1,026 tests. |
| `TDD-002` | Phase 01 | Web Testing | **READY** | Align chat display name assertion in `test/messaging.spec.ts` | `apps/web/test/messaging.spec.ts` | None | Fix assertion in line 33 to match `chat-mappers.ts`. Command: `pnpm --filter @ogroniedu/web test` passes 308/308 tests. |
| `TDD-003` | Phase 01 | API Linting | **READY** | Eliminate 11 Oxlint warnings across API modules and tests | `apps/api/src/modules/notifications/booking-messages.service.ts`, test specs | None | Remove unused expression and clean unused imports. Command: `pnpm --filter @ogroniedu/api lint` exits with 0 warnings, code 0. |
| `SEC-001` | Phase 04 | Files / Trust | **READY** | Implement `GET /api/v1/files/:fileId/download` signed streaming | `apps/api/src/modules/files/files.controller.ts`, `files.service.ts` | None | Signed URL with HMAC token allows authorized owner/admin to download file bytes; unsigned or invalid token returns 401/403. Test: `pnpm --filter @ogroniedu/api test test/files.service.spec.ts`. |
| `SEC-002` | Phase 04 | Notifications | **READY** | Add automated negative regression test for test-dispatch role gating | `apps/api/test/notification.authorization.spec.ts` | None | Test proves unauthenticated/student/tutor/guardian receives 403 Forbidden when calling `/api/v1/notifications/test-dispatch`. |
| `BE-001` | Phase 03 | Auth Service | **READY** | Extract `LoginUserRow` interface out of `auth.service.ts` | `apps/api/src/modules/auth/auth.service.ts`, `src/modules/auth/interfaces/login-user-row.interface.ts` | `TDD-001` | Service has zero internal interface definitions; `LoginUserRow` imported from dedicated file. All auth tests pass. |
| `BE-005` | Phase 03 | Bookings | **READY** | Extract `BookingExpirySweepResult` interface from `booking-expiry.service.ts` | `booking-expiry.service.ts`, `src/modules/bookings/interfaces/booking-expiry.interfaces.ts` | `TDD-001` | Zero internal interfaces; sweep tests pass 100%. |
| `BE-008` | Phase 03 | Guardians | **READY** | Extract `BookingParties` interface from `guardian-access.service.ts` | `guardian-access.service.ts`, `src/modules/guardians/interfaces/guardian-access.interfaces.ts` | `TDD-001` | Zero internal interfaces; guardian access tests pass. |
| `BE-009` | Phase 03 | Learning | **READY** | Extract `AssignmentView`, `SubmissionView` from `assignments.service.ts` | `assignments.service.ts`, `src/modules/learning/interfaces/assignments.interfaces.ts` | `TDD-001` | Zero internal interfaces; assignment tests pass. |
| `BE-017` | Phase 03 | Payments | **READY** | Extract `JournalEntryInput`, `PostJournalParams` from `ledger.service.ts` | `ledger.service.ts`, `src/modules/payments/interfaces/ledger.interfaces.ts` | `TDD-001` | Zero internal interfaces; ledger tests pass. |
| `BE-018` | Phase 03 | Payments | **READY** | Extract `PaymentReceiptDto` from `payment-orders.service.ts` | `payment-orders.service.ts`, `src/modules/payments/interfaces/payment-orders.interfaces.ts` | `TDD-001` | Zero internal interfaces; order tests pass. |
| `BE-019` | Phase 03 | Payments | **READY** | Extract `ConfirmedPayment` from `payment-webhooks.service.ts` | `payment-webhooks.service.ts`, `src/modules/payments/interfaces/payment-webhooks.interfaces.ts` | `TDD-001` | Zero internal interfaces; webhook tests pass. |
| `BE-023` | Phase 03 | Trust | **READY** | Extract `ReplacementRepos`, `ReplacementListResponse` from `tutor-replacement.service.ts` | `tutor-replacement.service.ts`, `src/modules/trust/interfaces/tutor-replacement.interfaces.ts` | `TDD-001` | Zero internal interfaces; replacement tests pass. |
| `FE-001` | Phase 02 | Bookings | **READY** | Decompose oversized `bookings/[id]/page.tsx` (829 lines) into thin route & feature components | `apps/web/src/app/[locale]/bookings/[id]/page.tsx`, `src/features/bookings/components/detail/*` | None | `page.tsx` reduced to < 40 lines. Feature view handles timeline, participants, action panel. Visual inspection passes. |
| `FE-002` | Phase 02 | Guardian | **READY** | Decompose oversized `guardian/children/[studentId]/page.tsx` (728 lines) | `apps/web/src/app/[locale]/dashboard/guardian/children/[studentId]/page.tsx`, `src/features/guardian/components/child-detail/*` | None | `page.tsx` reduced to < 40 lines. Child academic cards, safety holds, replacement triggers extracted. Visual inspection passes. |
| `FE-003` | Phase 02 | Sessions | **READY** | Decompose oversized `sessions/[id]/page.tsx` (634 lines) | `apps/web/src/app/[locale]/(dashboard)/sessions/[id]/page.tsx`, `src/features/bookings/components/session-detail/*` | None | `page.tsx` reduced to < 40 lines. Reschedule modal, attendance badge, meeting launcher extracted. |
| `FE-004` | Phase 02 | Learning | **READY** | Decompose oversized `assignments/[id]/page.tsx` (577 lines) | `apps/web/src/app/[locale]/(dashboard)/assignments/[id]/page.tsx`, `src/features/learning/components/assignment-detail/*` | None | `page.tsx` reduced to < 40 lines. Submission uploader, rubric view extracted. |
| `FE-005` | Phase 02 | Payments | **READY** | Decompose oversized `bookings/[id]/pay/page.tsx` (575 lines) | `apps/web/src/app/[locale]/bookings/[id]/pay/page.tsx`, `src/features/payments/components/checkout/*` | None | `page.tsx` reduced to < 40 lines. Escrow terms card, payment selector extracted. |
| `FE-006` | Phase 02 | Navigation | **READY** | Decompose monolithic `navigation.ts` (853 lines) into role configs | `apps/web/src/lib/navigation.ts`, `apps/web/src/lib/navigation/*` | None | Role navigation configurations modularized per role (`student.nav.ts`, `tutor.nav.ts`, `guardian.nav.ts`, `admin.nav.ts`). |
| `FE-007` | Phase 02 | Tutor Discovery | **READY** | Modularize `tutor-details-page.tsx` (1,076 lines) | `src/features/tutors/pages/tutor-details-page.tsx`, `src/features/tutors/components/*` | None | Modularized into `TutorHero`, `TutorCredentialsCard`, `TutorBookingPanel`. Component tests pass. |
| `EVT-001` | Phase 05 | Outbox | **READY** | Harden transactional outbox event publishing & retry dead-letter alerts | `apps/api/src/modules/notifications/outbox-worker.service.ts` | None | Max retry 5 failures log to structured error; events dispatched with `FOR UPDATE SKIP LOCKED`. |
| `DB-001` | Phase 06 | Database | **READY** | Add foreign key constraint from `file_assets` to entity tables with safe migration | `packages/database/src/migrations/031_file_assets_foreign_keys.sql` | `SEC-001` | Referential integrity enforced without data loss. Replay migration drill passes. |
| `E2E-001` | Phase 11 | Browser E2E | **READY** | Run Playwright E2E suite against local test stack (`port 5000`) | `apps/web/e2e/smoke.public.spec.ts`, `e2e/auth.guards.spec.ts` | `TDD-001` | 100% of critical public and guard scenarios pass. |
| `E2E-002` | Phase 11 | Browser E2E | **READY** | Verify end-to-end booking journey via Playwright | `apps/web/e2e/journey.booking.spec.ts` | `E2E-001` | Student creates booking, tutor receives notification, accepts, payment order generated. |
| `E2E-003` | Phase 11 | Browser E2E | **READY** | Verify tutor verification dossier upload and admin approval via Playwright | `apps/web/e2e/tutor.verification.spec.ts`, `e2e/tutor.evidence.spec.ts` | `SEC-001` | Tutor uploads document, admin views preview and downloads file bytes. |
| `E2E-004` | Phase 11 | Chrome DevTools | **READY** | Perform automated live browser walkthrough of all 4 role dashboards | Headful Chrome DevTools MCP | `E2E-001` | Student, Guardian, Tutor, Admin dashboards inspected headful on desktop; 0 console errors, HTTP 200 API responses. |
| `REL-001` | Phase 12 | Release | **READY** | Validate production builds and zero bundle leaks | `pnpm build`, next bundle analyzer | All previous | `turbo run build` clean; 0 server secrets in client bundle. |
| `REL-002` | Phase 12 | Release | **READY** | Validate `.env.example` and runtime fail-fast config checks | `apps/api/src/config/env.validation.ts` | `SEC-003` | App fails fast on startup in production if `JWT_SECRET` or `DATABASE_URL` missing. |

---

## 3. Priority P2 — Modernization & Modularization Tasks

| Task ID | Phase | Area | Status | Title & Objective | Affected Files |
|---|---|---|---|---|---|
| `SEC-003` | Phase 04 | Security | **AUDITED** | Remove hardcoded dev-secret fallback strings (`'secure-jwt-secret-dev'`) | `notification.gateway.ts`, `files.service.ts` |
| `SEC-004` | Phase 04 | Security | **AUDITED** | Enforce binary magic-byte inspection (PDF, PNG, JPG) on file uploads | `files.service.ts` |
| `BE-002` | Phase 03 | Auth | **AUDITED** | Extract `RateLimitRecord` from `rate-limiter.service.ts` | `rate-limiter.service.ts` |
| `BE-003` | Phase 03 | Auth | **AUDITED** | Extract `OtpDeliveryConfiguration` from `otp-delivery.service.ts` | `otp-delivery.service.ts` |
| `BE-004` | Phase 03 | Auth | **AUDITED** | Extract `AccountAccessSnapshot` from `account-access.service.ts` | `account-access.service.ts` |
| `BE-006` | Phase 03 | Bookings | **AUDITED** | Extract `ReminderGenerationResult` from `session-reminder.service.ts` | `session-reminder.service.ts` |
| `BE-007` | Phase 03 | Bookings | **AUDITED** | Extract `SeriesMutationResult` from `session-series.service.ts` | `session-series.service.ts` |
| `BE-010` | Phase 03 | Learning | **AUDITED** | Extract `AttendanceSummary` from `attendance.service.ts` | `attendance.service.ts` |
| `BE-011` | Phase 03 | Learning | **AUDITED** | Extract `LearningBookingScope` from `learning-access.service.ts` | `learning-access.service.ts` |
| `BE-012` | Phase 03 | Learning | **AUDITED** | Extract `LearningGoalView` from `learning-goals.service.ts` | `learning-goals.service.ts` |
| `BE-013` | Phase 03 | Learning | **AUDITED** | Extract `LearningMaterialView`, `MaterialDownload` from `learning-materials.service.ts` | `learning-materials.service.ts` |
| `BE-014` | Phase 03 | Learning | **AUDITED** | Extract `LessonPlanView` from `lesson-plans.service.ts` | `lesson-plans.service.ts` |
| `BE-015` | Phase 03 | Learning | **AUDITED** | Extract `StudentProgressView` from `progress.service.ts` | `progress.service.ts` |
| `BE-016` | Phase 03 | Onboarding | **AUDITED** | Extract `OnboardingRow`, `SystemStepContext` from `onboarding.service.ts` | `onboarding.service.ts` |
| `BE-020` | Phase 03 | Payments | **AUDITED** | Extract `ReconciliationReport` from `settlement.service.ts` | `settlement.service.ts` |
| `BE-021` | Phase 03 | Trust | **AUDITED** | Extract `DisputeListResponse` from `disputes.service.ts` | `disputes.service.ts` |
| `BE-022` | Phase 03 | Trust | **AUDITED** | Extract `PublicReviewView` from `reviews.service.ts` | `reviews.service.ts` |
| `BE-024` | Phase 03 | Tutors | **AUDITED** | Extract `SavedTutorItemDto` from `saved-tutors.service.ts` | `saved-tutors.service.ts` |
| `BE-025` | Phase 03 | Tutors | **AUDITED** | Extract `AvailabilitySlotInput`, `BlockedPeriodInput` from `tutor-availability.service.ts` | `tutor-availability.service.ts` |
| `BE-026` | Phase 03 | Tutors | **AUDITED** | Extract `VerificationExpirySweepResult` from `tutor-verification-expiry.service.ts` | `tutor-verification-expiry.service.ts` |
| `BE-027` | Phase 03 | Tutors | **AUDITED** | Extract `VerificationReviewerRecipient` from `tutor-verification-reviewer-directory.service.ts` | `tutor-verification-reviewer-directory.service.ts` |
| `BE-028` | Phase 03 | Auth | **AUDITED** | Decompose god service `auth.service.ts` (1,096 lines) into sub-services | `auth.service.ts` |
| `BE-029` | Phase 03 | Trust | **AUDITED** | Decompose god service `tutor-replacement.service.ts` (1,053 lines) | `tutor-replacement.service.ts` |
| `BE-030` | Phase 03 | Trust | **AUDITED** | Decompose god service `safety-reports.service.ts` (1,039 lines) | `safety-reports.service.ts` |
| `BE-031` | Phase 03 | Tutors | **AUDITED** | Decompose god service `tutor-verification.service.ts` (992 lines) | `tutor-verification.service.ts` |
| `BE-032` | Phase 03 | Learning | **AUDITED** | Decompose god service `assignments.service.ts` (922 lines) | `assignments.service.ts` |
| `BE-033` | Phase 03 | Analytics | **AUDITED** | Decompose god service `analytics.service.ts` (789 lines) | `analytics.service.ts` |
| `FE-008` | Phase 02 | Admin | **AUDITED** | Decompose oversized `dashboard/admin/replacements/[id]/page.tsx` (435 lines) | `admin/replacements/[id]/page.tsx` |
| `FE-009` | Phase 02 | Org | **AUDITED** | Decompose oversized `dashboard/organization/page.tsx` (383 lines) | `organization/page.tsx` |
| `FE-010` | Phase 02 | Learning | **AUDITED** | Decompose oversized `assignments/[id]/submissions/page.tsx` (382 lines) | `assignments/[id]/submissions/page.tsx` |
| `FE-011` | Phase 02 | Admin | **AUDITED** | Decompose oversized `dashboard/admin/organizations/page.tsx` (341 lines) | `admin/organizations/page.tsx` |
| `FE-012` | Phase 02 | Org | **AUDITED** | Decompose oversized `dashboard/organization/members/page.tsx` (307 lines) | `organization/members/page.tsx` |
| `FE-013` | Phase 02 | Trust | **AUDITED** | Decompose oversized `(dashboard)/tutor-replacements/page.tsx` (303 lines) | `tutor-replacements/page.tsx` |
| `FE-014` | Phase 02 | Profile | **AUDITED** | Modularize `profile-page.tsx` (1,050 lines) into security, session, and info tabs | `profile-page.tsx` |
| `FE-015` | Phase 02 | Admin | **AUDITED** | Modularize `admin-finance-page.tsx` (964 lines) | `admin-finance-page.tsx` |
| `FE-016` | Phase 02 | Guardian | **AUDITED** | Modularize `GuardianChildrenManager.tsx` (953 lines) | `GuardianChildrenManager.tsx` |
| `EVT-002` | Phase 05 | Outbox | **AUDITED** | Verify idempotency of payment webhook outbox events | `payment-webhooks.service.ts` |
| `EVT-003` | Phase 05 | Outbox | **AUDITED** | Verify booking expiry event emission and notification delivery | `booking-expiry.service.ts` |
| `DB-002` | Phase 06 | Database | **AUDITED** | Add compound indexes for tutor search geo-query optimization | `packages/database/src/migrations/032_search_indexes.sql` |
| `DB-003` | Phase 06 | Database | **AUDITED** | Verify BCDR cold recovery drill with migration replay | `packages/database/test/bcdr-recovery.spec.ts` |
| `E2E-005` | Phase 11 | Browser E2E | **AUDITED** | Verify responsive viewport rendering on mobile (375px) and tablet (768px) | `apps/web/e2e/responsive.matrix.spec.ts` |
| `E2E-006` | Phase 11 | Browser E2E | **AUDITED** | Verify bilingual Bengali/English UI toggle across public pages | `apps/web/e2e/tutor.localization.spec.ts` |
| `REL-003` | Phase 12 | Release | **AUDITED** | Verify Docker staging compose build and multi-container boot | `docker-compose.yml`, `docker-compose.staging.yml` |
| `REL-004` | Phase 12 | Release | **AUDITED** | Produce final evidence-based release scorecard and go/no-go signoff | `14-RELEASE-READINESS-CHECKLIST.md` |

---

## 4. First Implementation Task Definition

- **First Task ID**: `TDD-001`
- **Title**: Configure Vitest test environment variables in `@ogroniedu/api`
- **Affected Files**: `apps/api/vitest.config.ts` (create new)
- **Prerequisites**: None
- **Root Cause**: Running `pnpm test` fails 11 backend test files (70 tests) with `Error: JWT_SECRET environment variable is required` because Vitest does not load environment variables by default.
- **Acceptance Criteria**:
  1. `apps/api/vitest.config.ts` is created and configures `env.JWT_SECRET`, `env.NODE_ENV = 'test'`, and `env.ALLOW_TEST_AUTH_BYPASS = 'true'`.
  2. Running `pnpm --filter @ogroniedu/api test` executes all 96 test files with zero missing environment variable errors.
  3. Output confirms 1,026 out of 1,026 tests passing.
- **Verification Command**:
  ```pwsh
  pnpm --filter @ogroniedu/api test
  ```
- **Rationale for Priority**: Fixing the test harness is the indispensable foundation for Test-Driven Development (TDD). No refactoring should proceed while tests falsely report failure due to test configuration.
