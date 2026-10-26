# OgroniEdu — Verified Current State Baseline

**Status:** AUDITED & VERIFIED  
**Date:** 2026-10-24  
**Baseline Commit:** `32712a9` (on branch `main`)  
**Methodology:** Full repository static analysis, fresh package-by-package build, typecheck, lint, and unit/integration test execution.

---

## 1. Executive Verdict

The OgroniEdu (অগ্রণী এডু) tutoring SaaS platform has completed 15 previous implementation phases and contains substantial, sophisticated business logic covering the entire tutoring lifecycle in Bangladesh.

However, before the 7-day MVP launch, the system is blocked by:

1. **Test Environment Flaw (API)**: Missing `JWT_SECRET` in Vitest test execution environment causing 11 test files (70 tests) in `@ogroniedu/api` to fail when run via `pnpm test` or `turbo run test`. (Setting `JWT_SECRET` results in 100% pass: 1,026/1,026 tests).
2. **Frontend Test Assertion Mismatch**: 1 test failure in `@ogroniedu/web` (`test/messaging.spec.ts`: expects `'Me'` instead of default `'You'`).
3. **Linter Warning Failures**: 11 Oxlint warnings in `@ogroniedu/api` (1 unused expression in `booking-messages.service.ts:221`, 10 unused imports/variables in test files), failing `pnpm lint` due to `--deny-warnings`.
4. **Backend Architecture Violation (User Non-Negotiable)**: 27 backend services in `apps/api/src/modules/` declare interfaces directly inside `*.service.ts` files instead of separate module folders (`interfaces/`, `enums/`, `types/`, `contracts/`, `dto/`).
5. **Frontend Architecture Violation (Thin Route Policy)**: 11 Next.js App Router route pages contain oversized implementations (300 to 829 lines) directly in `page.tsx` instead of delegating to thin feature views.
6. **Oversized Files**: 106 application-owned TypeScript/TSX source files have $\ge 300$ lines, including 7 files $\ge 900$ lines.
7. **P1 Security Defect (RLD-001)**: `POST /api/v1/files/upload-evidence` stores file metadata and issues signed URLs targeting `GET /api/v1/files/:fileId/download`, but that download endpoint does not exist in `FilesController`.
8. **Security Gating Verification (RLD-002)**: `POST /api/v1/notifications/test-dispatch` has runtime checks in `notification.controller.ts`, but lacks dedicated negative test cases verifying that non-admin/unauthenticated callers are rejected with 403.

---

## 2. Verified Monorepo Shape and Topology

| Workspace Package      | Type                      | Directory            | Responsibilities                                                        | Status                                          |
| ---------------------- | ------------------------- | -------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| `@ogroniedu/web`       | Next.js 16.4.2 (React 19) | `apps/web`           | Bilingual UI (`/bn`, `/en`), App Router, Redux Toolkit, Tailwind CSS v4 | Build: PASS, Typecheck: PASS, Test: 307/308     |
| `@ogroniedu/api`       | NestJS 12.1.2             | `apps/api`           | Modular monolith, 20 domain modules, 36 controllers, Socket.IO, TypeORM | Build: PASS, Typecheck: PASS, Lint: 11 warnings |
| `@ogroniedu/contracts` | TypeScript Shared         | `packages/contracts` | DTOs, Zod schemas, notification registry, event contracts               | Build: PASS, Typecheck: PASS                    |
| `@ogroniedu/database`  | TypeORM & Migrations      | `packages/database`  | 80 tables/views, 30 migrations, initial seed, BCDR drills               | Build: PASS, Typecheck: PASS, Test: 33/33 PASS  |
| `@ogroniedu/tsconfig`  | Shared Config             | `packages/tsconfig`  | TypeScript compiler configurations                                      | Clean                                           |

### Port and Network Allocation

- **Frontend App**: Port `5000` (`http://localhost:5000`)
- **Backend API**: Port `4000` (`http://localhost:4000/api/v1`)
- **Database**: PostgreSQL 18 on Port `5432` (database: `ogroniedu_dev`)
- **In-Memory Cache**: Redis 7 on Port `6379` (`ogroni_redis`)

---

## 3. Verified Baseline Metrics (Measured 2026-10-24)

| Metric                                | Measured Value                | Verification Command                     | Notes / Root Cause                                                                                                                      |
| ------------------------------------- | ----------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **TypeScript Typecheck**              | **0 errors (100% PASS)**      | `pnpm typecheck`                         | 6 tasks successful across all 5 workspaces                                                                                              |
| **Production Build**                  | **100% PASS**                 | `pnpm build`                             | `@ogroniedu/web` compiles 88 routes; `@ogroniedu/api` compiles via `tsc -p tsconfig.build.json`                                         |
| **Linting (Web)**                     | **0 errors, 0 warnings**      | `pnpm --filter @ogroniedu/web lint`      | 527 files checked in 205ms                                                                                                              |
| **Linting (API)**                     | **11 warnings (Exit 1)**      | `pnpm --filter @ogroniedu/api lint`      | 1 in `booking-messages.service.ts:221` (unused expression), 10 in `test/` specs (unused imports)                                        |
| **Database Unit/Drill Tests**         | **33 / 33 PASS (100%)**       | `pnpm --filter @ogroniedu/database test` | 4 test files: migrations, seeds, BCDR wipe drill, performance                                                                           |
| **Web Frontend Unit Tests**           | **307 / 308 PASS (99.7%)**    | `pnpm --filter @ogroniedu/web test`      | 48 test files: 1 failure in `test/messaging.spec.ts` (expected `'You'` to be `'Me'`)                                                    |
| **Backend API Unit Tests**            | **952 / 1026 PASS (92.8%)**   | `pnpm --filter @ogroniedu/api test`      | 85 files passed, 11 failed due to missing `JWT_SECRET` in Vitest process. When `$env:JWT_SECRET` is set, **1,026 / 1,026 PASS (100%)**! |
| **Total Automated Tests**             | **1,367 tests**               | `pnpm test`                              | Database (33) + Web (308) + API (1,026)                                                                                                 |
| **E2E Playwright Specs**              | **11 spec files**             | `pnpm --filter @ogroniedu/web e2e`       | Located in `apps/web/e2e/`, targeting `http://localhost:5000`                                                                           |
| **Total Source Files**                | **1,105 files**               | Directory discovery                      | 468 web src, 48 web test, 12 e2e; 424 api src, 96 api test; 39 database; 18 contracts                                                   |
| **Compiled Web Routes**               | **88 routes**                 | Next.js build output                     | 10 public, 7 student, 7 guardian, 7 tutor, 15 admin, 15 shared, 8 auth/onboarding                                                       |
| **Backend Controllers**               | **36 controllers**            | AST controller scan                      | Spanning 20 registered NestJS modules                                                                                                   |
| **API Endpoints**                     | **227 endpoints**             | Controller route scan                    | All prefixed under `/api/v1` (except `/health`)                                                                                         |
| **Database Tables & Views**           | **80 (78 tables, 2 views)**   | PostgreSQL schema                        | Managed via 30 versioned migrations                                                                                                     |
| **Canonical User Roles**              | **9 roles**                   | Security matrix                          | student, guardian, tutor, admin, super_admin, support_agent, compliance_reviewer, organization_owner, organization_staff                |
| **Oversized Source Files**            | **106 files $\ge$ 300 lines** | Line count audit                         | 51 in `apps/web`, 52 in `apps/api`, 2 in `packages/contracts`, 1 in `packages/database`                                                 |
| **Services Violating Interface Rule** | **27 services**               | Regex AST scan                           | Declaring `interface` inside `*.service.ts`                                                                                             |

---

## 4. Key Architectural Weaknesses Identified

### 4.1 Backend: Service Files Polluted with Interfaces/Enums

The user has established a non-negotiable architectural rule:

> _"backend er o enum , interface kokhonoi service er vitore thakbe na alada folder kore module e thakbe"_

27 services currently violate this:

- `auth.service.ts` (`LoginUserRow`)
- `rate-limiter.service.ts` (`RateLimitRecord`)
- `otp-delivery.service.ts` (`OtpDeliveryConfiguration`)
- `account-access.service.ts` (`AccountAccessSnapshot`)
- `booking-expiry.service.ts` (`BookingExpirySweepResult`)
- `session-reminder.service.ts` (`ReminderGenerationResult`)
- `session-series.service.ts` (`SeriesMutationResult`)
- `guardian-access.service.ts` (`BookingParties`)
- `assignments.service.ts` (`AssignmentView`, `SubmissionView`)
- `attendance.service.ts` (`AttendanceSummary`)
- `learning-access.service.ts` (`LearningBookingScope`)
- `learning-goals.service.ts` (`LearningGoalView`)
- `learning-materials.service.ts` (`LearningMaterialView`, `MaterialDownload`)
- `lesson-plans.service.ts` (`LessonPlanView`)
- `progress.service.ts` (`StudentProgressView`)
- `onboarding.service.ts` (`OnboardingRow`, `SystemStepContext`)
- `ledger.service.ts` (`JournalEntryInput`, `PostJournalParams`, `LedgerIntegrityCheckResult`)
- `payment-orders.service.ts` (`PaymentReceiptDto`)
- `payment-webhooks.service.ts` (`ConfirmedPayment`)
- `settlement.service.ts` (`ReconciliationReport`)
- `disputes.service.ts` (`DisputeListResponse`)
- `reviews.service.ts` (`PublicReviewView`)
- `tutor-replacement.service.ts` (`ReplacementRepos`, `ReplacementListResponse`)
- `saved-tutors.service.ts` (`SavedTutorItemDto`)
- `tutor-availability.service.ts` (`AvailabilitySlotInput`, `BlockedPeriodInput`)
- `tutor-verification-expiry.service.ts` (`VerificationExpirySweepResult`)
- `tutor-verification-reviewer-directory.service.ts` (`VerificationReviewerRecipient`)

### 4.2 Frontend: Route Pages Violating Thin-Route Policy

11 Next.js `page.tsx` files contain heavy UI, state, and API logic directly inside the route entry point:

- `apps/web/src/app/[locale]/bookings/[id]/page.tsx` (829 lines)
- `apps/web/src/app/[locale]/dashboard/guardian/children/[studentId]/page.tsx` (728 lines)
- `apps/web/src/app/[locale]/(dashboard)/sessions/[id]/page.tsx` (634 lines)
- `apps/web/src/app/[locale]/(dashboard)/assignments/[id]/page.tsx` (577 lines)
- `apps/web/src/app/[locale]/bookings/[id]/pay/page.tsx` (575 lines)
- `apps/web/src/app/[locale]/dashboard/admin/replacements/[id]/page.tsx` (435 lines)
- `apps/web/src/app/[locale]/dashboard/organization/page.tsx` (383 lines)
- `apps/web/src/app/[locale]/(dashboard)/assignments/[id]/submissions/page.tsx` (382 lines)
- `apps/web/src/app/[locale]/dashboard/admin/organizations/page.tsx` (341 lines)
- `apps/web/src/app/[locale]/dashboard/organization/members/page.tsx` (307 lines)
- `apps/web/src/app/[locale]/(dashboard)/tutor-replacements/page.tsx` (303 lines)

These must be refactored into thin Server Component route handlers delegating to feature components under `src/features/<domain>/`.

### 4.3 Missing Vitest Environment Setup in `apps/api`

`apps/api` lacks a dedicated `vitest.config.ts` with `setupFiles` to supply test environment variables (`JWT_SECRET`, `NODE_ENV=test`, `DATABASE_URL`). When running tests without a pre-populated shell environment, services expecting `process.env.JWT_SECRET` throw unhandled configuration errors.

---

## 5. Security & Risk Findings Summary

| ID        | Title                                    | Severity | Component                                     | Finding & Risk                                                                                                                                                 | Status                               |
| --------- | ---------------------------------------- | -------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `RLD-001` | Evidence File Download Endpoint Missing  | **P1**   | `FilesController`                             | Tutors upload verification dossiers; signed download URLs point to `GET /api/v1/files/:fileId/download`, which is not implemented. Admin verification blocked. | Open                                 |
| `RLD-002` | Notification Test Dispatch Role Guarding | **P1**   | `NotificationController`                      | Code has runtime check, but lacks automated negative test coverage proving non-admins receive 403.                                                             | Needs Regression Test                |
| `RLD-003` | Whiteboard Sync Scope Overclaim          | **P2**   | `InteractiveWhiteboard.tsx`                   | Local canvas only; no Socket.IO collaborative synchronization exists. Docs claim collaborative whiteboard.                                                     | Re-scope to local canvas + Meet link |
| `RLD-004` | Phantom Route References in Old Docs     | **P2**   | Documentation                                 | Old docs cited `/dashboard/student/guardian-link`, `/dashboard/guardian/approvals` which never existed.                                                        | Fixed in updated inventories         |
| `RLD-005` | Test Isolation Flake in Database Package | **P2**   | `packages/database`                           | `migration.spec.ts` vs `bcdr-recovery.spec.ts` concurrent execution caused race conditions on shared DB without worker isolation.                              | Mitigate in test config              |
| `RLD-006` | Dev-Secret Fallbacks in Codebase         | **P2**   | `notification.gateway.ts`, `files.service.ts` | Fallback strings (`'secure-jwt-secret-dev'`) used when `JWT_SECRET` undefined. Must fail fast in production.                                                   | Open                                 |

---

## 6. Baseline Conclusion

The repository is fundamentally healthy and near production readiness:

- Zero compiler errors across all TypeScript projects.
- Clean build for both API and Next.js frontend.
- 1,367 automated unit/integration tests with 99.9% pass rate once `JWT_SECRET` is provided.
- Comprehensive database migrations with idempotent seeding.
- The path to a production-ready MVP requires:
  1. Fixing the test environment harness and 1 failed web test.
  2. Cleaning up the 11 Oxlint warnings in API.
  3. Implementing `GET /api/v1/files/:fileId/download` with signed URL verification.
  4. Extracting interfaces from the 27 backend services into modular folders.
  5. Decomposing the 11 oversized frontend route pages into thin routes and feature components.
  6. Running automated Playwright and Chrome DevTools verification across all core user journeys.
