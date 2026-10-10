# Changelog

## 1.10.0 — Phase 10 Learning Management (Attendance, Homework, and Progress)

- Implemented authorized, attributable, and auditable Learning Management System in `apps/api/src/modules/learning/`:
  - Definition of Done enforced: Records are authorized, attributable and auditable with strict role-based and attribute-based access control (ABAC).
  - Database migration `003_learning_management.sql` creating `assignments`, `assignment_submissions`, and `progress_reports` tables with indexes and check constraints.
  - Entities created: `SessionAttendanceEntity`, `AssignmentEntity`, `AssignmentSubmissionEntity`, `ProgressReportEntity`.
  - Attendance recording (`POST /api/v1/learning/attendance`): tutor-scoped, immutable actor ID, automatic notification to student and active linked guardians.
  - Assignment lifecycle (`POST /api/v1/learning/assignments`, `POST /api/v1/learning/assignments/:id/submissions`): tutor creates homework, only assigned student can submit, late submissions tagged automatically based on due date.
  - Grading & Score Revision Auditing (`POST /api/v1/learning/submissions/:id/grade`): tutors review submissions with max score validation; revising an already graded score strictly requires a `revisionReason` and logs previous score, new score, actor ID, and reason in `audit_logs`.
  - Auditable Progress Reports (`POST /api/v1/learning/progress-reports`): computes observable metrics (attendance %, assignments completed, average score) directly from database records, preventing unsupported mastery claims.
  - Guardian oversight: only active linked guardians (`guardian_student_links`) can access student learning records and progress reports; unlinked/revoked users receive `403 Forbidden`.
  - Built frontend UI [`LearningManagementView`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/src/components/learning/LearningManagementView.tsx) and page at `apps/web/src/app/[locale]/learning/page.tsx` with attendance cards, homework submission modal, grading modal, and progress reports dashboard.
  - Added bilingual namespace `"learning"` (36 keys) to `messages/en.json` and `messages/bn.json` with 100% key parity and Bengali digit localization.
  - Added 34 new tests across `learning.service.spec.ts`, `learning.controller.spec.ts`, `learning.spec.ts`, and `migration.spec.ts`.
  - Expanded monorepo test suite from 206 to **240 passing tests, 0 failures, 0 skipped**.
  - Published audit report `docs/audits/learning-management-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.9.0 — Phase 09 Booking and Scheduling

- Implemented state machine and conflict-safe session scheduling in `apps/api/src/modules/bookings/`:
  - `BookingSessionEntity` mapped to `booking_sessions` table with UTC `TIMESTAMPTZ` and `Asia/Dhaka` timezone intent.
  - Definition of Done enforced: At most one overlapping active session per tutor under approved rule via application overlap validation and PostgreSQL GiST exclusion constraint `ex_tutor_session_overlap`.
  - Concurrency conflict handling: SQL state `23P01` exclusion errors caught and translated into client-friendly `ConflictException`.
  - Cancelled slot reuse invariant: Cancelled sessions immediately release their time slot for subsequent booking without collision.
  - One-off session scheduling (`POST /api/v1/sessions`) with past date prevention and booking duration matching.
  - Recurring weekly session generator (`POST /api/v1/sessions/recurring`) creating sequential classes across specified weekdays and time slots with internal batch collision prevention.
  - Reschedule workflow (`POST /api/v1/sessions/:id/reschedule`) validating participant authorization, zero overlap, and reason tracking.
  - Bangladesh cancellation & operational refund policy matrix (`POST /api/v1/sessions/:id/cancel`):
    - Student/guardian $>24\text{h}$: 100% refund, 0% compensation.
    - Student/guardian $4\text{h}-24\text{h}$: 80% refund, 20% tutor compensation.
    - Student/guardian $<4\text{h}$: 0% refund, 80% tutor compensation.
    - Tutor cancellations deduct reliability points and process 100% refund to learner.
  - Privacy-safe public calendar endpoint (`GET /api/v1/tutors/:tutorId/calendar`) returning only busy intervals with learner PII completely excluded.
  - Transactional Outbox pattern implemented via `OutboxEventEntity` (`outbox_events` table) emitting `session.scheduled`, `session.rescheduled`, and `session.cancelled`.
  - Asynchronous, non-blocking notification dispatch outside critical transaction locks.
- Built accessible frontend `SessionScheduleCalendar` component in `apps/web/src/components/scheduling/SessionScheduleCalendar.tsx` with class cards, status badges, meeting links, reschedule dialog, and cancellation refund preview modal.
- Configured route at `apps/web/src/app/[locale]/sessions/page.tsx`.
- Updated bilingual translation catalogs `messages/bn.json` and `messages/en.json` with `scheduling` namespace while maintaining 100% key parity and localized Bengali numeral support.
- Authored 33 new automated unit, conflict-safety, and invariant tests across `scheduling.service.spec.ts`, `sessions.controller.spec.ts`, and `scheduling.spec.ts`.
- Expanded monorepo test suite from 173 to **206 passing tests, 0 failures, 0 skipped**.
- Published Phase 09 audit report `docs/audits/booking-and-scheduling-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.8.0 — Phase 08 Tutor Discovery and Requests

- Implemented real DB-backed discovery search engine (`TutorsService.searchTutors`) exposed at `GET /api/v1/tutors/search`:
  - Strictly excluded unpublished, draft, unapproved, or suspended tutor profiles.
  - Multi-dimensional filters: text search `q`, subject, education level, curriculum, teaching mode, location (district/upazila), and price range.
  - Explainable, deterministic ranking algorithm (Base 100 + NID 20 + Degree 20 + Experience up to 50 + Fast response 10) with transparent scoring breakdown and zero unbacked AI claims.
  - Deterministic pagination (`total`, `page`, `limit`, `totalPages`).
  - Strict privacy isolation: public search results redact national IDs, phone numbers, emails, and internal reviewer notes.
- Created `BookingsModule` and `BookingsService` in `apps/api/src/modules/bookings/`:
  - `BookingEntity` mapped to `bookings` relational schema.
  - Request creation workflow (`POST /api/v1/requests`) verifying active guardian-student relationships for minors and preventing self-requests.
  - Server-side anti-spam invariant: Simultaneous duplicate active requests for the same student, tutor, and subject throw `409 Conflict`.
  - Request withdrawal workflow (`POST /api/v1/requests/:id/withdraw`) restricted strictly to the requester.
  - Tutor response workflow (`POST /api/v1/requests/:id/respond`) allowing accept and decline with audit logging.
  - Real-time notification dispatch via `NotificationService` across all lifecycle events (`booking.requested`, `booking.accepted`, `booking.declined`, `booking.cancelled`).
  - Ownership guard on `GET /api/v1/requests/:id` ensuring third parties cannot inspect private booking records.
- Built accessible frontend `TutorSearchCatalog` in `apps/web/src/components/discovery/TutorSearchCatalog.tsx` with dynamic filters, explainable match breakdown modal, booking request dialog, and route at `apps/web/src/app/[locale]/tutors/page.tsx`.
- Updated bilingual localization catalogs `messages/bn.json` and `messages/en.json` with `discovery` and `bookingRequest` namespaces, maintaining 100% key parity and localized Bengali numeral formatting.
- Authored 27 new automated unit and invariant tests across `discovery.search.spec.ts`, `bookings.service.spec.ts`, `bookings.controller.spec.ts`, and `tutor-discovery.spec.ts`.
- Expanded monorepo test suite from 146 to **173 passing tests, 0 failures, 0 skipped**.
- Published Phase 08 audit report `docs/audits/tutor-discovery-and-requests-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.7.0 — Phase 07 Tutor Onboarding and Verification

- Established canonical tutor verification, credential review, and trust policy in `docs/policies/tutor-verification-and-credential-policy.md` (policy version `v1.0-bd-tutor-verification`) under statutory Bangladesh laws.
- Implemented `TutorsModule` in `apps/api/src/modules/tutors/`:
  - `TutorProfileEntity` mapped to `tutor_profiles` relational schema.
  - `TutorQualificationEntity` mapped to `tutor_qualifications` relational table.
  - `TutorVerificationReviewEntity` mapped to `tutor_verification_reviews` relational table.
  - `TutorSubjectEntity` mapped to `tutor_subjects` relational table.
  - `TutorServiceAreaEntity` mapped to `tutor_service_areas` relational table.
  - `TutorAvailabilityEntity` mapped to `tutor_availability` relational table.
  - Strict Self-Approval Denial: Server rejects tutors attempting to approve or alter their own verification status.
  - Publication eligibility gate: Tutors cannot transition to `published` unless verified, with active subjects and availability slots.
  - Dynamic verification badges: Platform trust marks reflect only checks actually performed (`verified_identity`, `verified_academic`, `verified_tutor`).
  - Automated depublication on suspension/rejection: Suspended tutors are automatically unpublished.
  - Public profile data redaction: Sanitized public profile endpoint redacts contact PII, raw document paths, and reviewer internal notes.
- Implemented `FilesModule` in `apps/api/src/modules/files/`:
  - `FileAssetEntity` mapped to `file_assets` table.
  - Private evidence upload with 10MB limit and mime type validation (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`).
  - Server-side ownership guard: Evidence files restricted strictly to owner and compliance reviewers (`admin`, `super_admin`).
- Implemented `TaxonomyModule` in `apps/api/src/modules/taxonomy/`:
  - `SubjectEntity`, `EducationLevelEntity`, `CurriculumEntity` providing reference catalogs.
- Built accessible frontend `TutorVerificationStatusCard` in `apps/web/src/components/tutor/TutorVerificationStatusCard.tsx` with dynamic badge rendering, publication toggles, qualification list, and bilingual support.
- Updated bilingual dictionaries `messages/bn.json` and `messages/en.json` with tutor verification namespace, maintaining 100% key parity.
- Authored 32 new unit and security tests across `tutors.service.spec.ts`, `files.service.spec.ts`, `tutors.controller.spec.ts`, and `tutor-verification.spec.ts`.
- Expanded monorepo test suite from 114 to **146 passing tests, 0 failures, 0 skipped**.
- Published Phase 07 audit report `docs/audits/tutor-onboarding-and-verification-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.6.0 — Phase 06 Users, Students, Guardians and Consent

- Formalized Bangladeshi minor statutory consent policy in `docs/policies/guardian-consent-and-minor-safety-policy.md` (policy version `v1.0-bd-minor-consent`) under The Children Act 2013 and Contract Act 1872.
- Created `AuditModule` and `AuditService` with `audit_logs` entity to provide global, immutable audit tracking across all sensitive and privileged platform operations.
- Implemented `UsersModule` in `apps/api/src/modules/users/`:
  - `StudentProfileEntity` mapped to `student_profiles` relational schema.
  - Profile retrieval with dynamic minor age calculation (DOB < 18 years threshold).
  - Student academic profile management (education levels, curricula, stream, institution, learning goals, visibility).
  - Self-service data export (`GET /api/v1/users/me/export`) and GDPR/privacy account deletion request (`POST /api/v1/users/me/delete-account`) transitioning user to `deletion_pending` status and revoking active sessions.
- Implemented `GuardiansModule` in `apps/api/src/modules/guardians/`:
  - `GuardianStudentLinkEntity` mapped to `guardian_student_links` relational table.
  - Multi-child guardian management (`GET /api/v1/guardians/children`).
  - Link request creation with mandatory `v1.0-bd-minor-consent` agreement and audit logging.
  - Direct child registration onboarding under parent account.
  - Student approval/rejection verification workflow.
  - Relationship revocation with immediate termination of guardian record visibility.
  - Minimal child PII protection (child email and phone shielded from unlinked third parties).
  - Attribute-Based Access Control (ABAC) verified: Unrelated guardians denied access via `GuardianStudentGuard`.
- Built frontend `GuardianChildrenManager` component in `apps/web/src/components/guardian/GuardianChildrenManager.tsx` featuring multi-child cards, minor badges, interactive link modal with consent affirmation checkbox, and revocation triggers.
- Updated bilingual dictionary catalogs `messages/bn.json` and `messages/en.json` with guardian management namespaces while maintaining 100% key parity.
- Authored 26 new automated unit tests across `guardians.service.spec.ts`, `guardians.controller.spec.ts`, `users.service.spec.ts`, and `guardian-children.spec.ts`.
- Expanded monorepo test suite from 88 to **114 passing tests, 0 failures, 0 skipped**.
- Published Phase 06 audit report `docs/audits/user-and-guardian-management-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.5.0 — Phase 05 Authentication and Authorization

- Implemented comprehensive IAM `AuthModule` in `apps/api/src/modules/auth/` featuring registration, login, logout, refresh, revocation, contact verification, and password reset.
- Configured password hashing using `bcryptjs` with cost factor 12 and strict password strength validation (uppercase, lowercase, number, 8+ characters).
- Designed single-use rotating refresh token lifecycle with cryptographic replay attack detection:
  - Refresh tokens stored as SHA-256 hashes in `auth_sessions`.
  - Re-use of previously rotated or revoked refresh tokens triggers blanket session invalidation across all active devices for the affected user.
- Added dual transport for refresh tokens: HTTP-only secure cookies (`ogroni_rt`) for web security and DTO body for mobile clients.
- Built sliding-window anti-abuse rate limiter (`RateLimiterService`) protecting authentication endpoints against brute-force attacks with HTTP 429 status codes.
- Created `auth_verification_codes` table via database migration `002_auth_verification_codes.sql` for 6-digit OTP contact verification and self-service password reset.
- Implemented server-side authorization guards:
  - `AuthGuard` validating JWT bearer tokens with `@Public()` decorator bypass.
  - `RolesGuard` enforcing RBAC via `@Roles(...)` metadata with `super_admin` privilege escalation bypass.
  - `GuardianStudentGuard` providing ABAC relationship checks via database lookup against `guardian_student_links`.
- Authored 27 new automated tests across `auth.service.spec.ts`, `auth.authorization.spec.ts`, and `auth.controller.spec.ts` covering success paths, negative inputs, role denials, replay attacks, and guardian ABAC checks.
- Expanded monorepo test coverage to 88 passing tests with 0 failures.
- Published Phase 05 audit report `docs/audits/authentication-and-authorization-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.4.0 — Phase 04 Database and Migrations

- Created dedicated `@ogroniedu/database` workspace package with TypeScript compiler configuration and native ESM support.
- Built transactional `MigrationRunner` supporting sequential SQL migration execution, tracking table `schema_migrations`, idempotency verification, and failure rollback.
- Implemented comprehensive `001_initial_schema.sql` migration containing all 23 core relational tables:
  - Users, Roles, Permissions, User Roles (RBAC)
  - Curricula, Education Levels, Subjects
  - Guardian Student Links, Tutor Profiles, Tutor Subjects, Tutor Availability
  - Bookings, Booking Sessions with GiST exclusion constraint preventing overlapping tutor bookings (`ex_tutor_session_overlap`), Session Attendance
  - Double-Entry Ledger Accounts, Journals, Entries (with check constraints ensuring debits and credits balance)
  - Payment Orders, Payment Transactions
  - Notifications, Notification Deliveries
  - Outbox Events, Idempotency Keys, Audit Logs
- Built `SeedRunner` with idempotent seeding logic for default roles, national curricula, education levels, and foundational subjects.
- Added migration and seeding CLI automation scripts: `pnpm db:migrate` and `pnpm db:seed`.
- Integrated `@ogroniedu/database` into `apps/api` with TypeORM data source configured with `synchronize: false`.
- Authored 8 automated tests in `packages/database/test/` verifying migration execution, idempotency, catalog presence, exclusion constraints (GiST overlap prevention), check constraints (`chk_user_contact_present`), and seed repeatability.
- Expanded automated test suite from 53 to 61 passing tests across the monorepo.

## 1.3.0 — Phase 03 Design System & Localization

- Built bilingual dictionary catalogs (`apps/web/messages/bn.json` & `apps/web/messages/en.json`) with strict key parity and type-safe loader.
- Implemented accessible design system UI primitives in `apps/web/src/components/ui/` (`Button`, `Card`, `Badge`, `Input`, `Tabs`, `EmptyState`, `LoadingSpinner`, `Skeleton`) conforming to WCAG 2.1 AA.
- Developed responsive shells in `apps/web/src/components/shell/` (`Navbar` with interactive language switcher, `Footer`).
- Refactored home landing page to use design system primitives and dictionary strings.
- Added automated unit tests for dictionary key parity and UI component states (expanding test suite to 53 tests).
- Published design system guidelines document `docs/design-system-and-ui-guidelines.md`.

## 1.2.0 — Phase 02 Architecture Foundation & Centralized State Management

- Added centralized state management and resilient API data fetching using **Redux Toolkit 2.x** and **RTK Query** in `apps/web/src/store/`.
- Configured RTK Query `baseApi` with automated correlation token injection (`x-request-id`), `Authorization: Bearer <token>`, and cache tag invalidation (`['Notification', 'UnreadCount', 'User', 'Session']`).
- Built modular slices for authentication (`authSlice`) and UI interactions (`uiSlice`) with typed hooks (`useAppDispatch`, `useAppSelector`).
- Created React 19 / Next.js App Router compatible `StoreProvider` utilizing `useRef` store singleton.
- Implemented backend structured JSON logging (`StructuredLoggerService`) with automated PII masking.
- Implemented `RequestIdMiddleware` for distributed request correlation and `AllExceptionsFilter` for canonical error payload contracts.
- Implemented container health and readiness probes (`/health/live`, `/health/ready`) via `@nestjs/terminus`.
- Added startup environment variable schema validation (`validateEnvironment`).
- Created GitHub Actions CI pipeline (`.github/workflows/ci.yml`) enforcing frozen install, formatting, docs validation, typecheck, tests, and build.
- Recorded ADR-008 for Monorepo Tooling, Architecture Foundation, and Centralized State Management.
- Expanded automated test suite from 26 to 44 passing tests (33 backend + 11 frontend).

## 1.1.0 — Phase 0 Foundation & Phase 01 Repository and Environment Audit

- Established Turborepo monorepo with pnpm 12 workspaces (`apps/api`, `apps/web`, `packages/contracts`, `packages/tsconfig`).
- Configured root `.gitignore`, `.prettierrc`, and `.prettierignore` with automated code formatting.
- Built Centralized Real-time Notification Engine (`NotificationGateway`, `NotificationService`, `NotificationController`).
- Refactored backend DTOs to class-based models decorated with `class-validator` and `class-transformer` (`DispatchNotificationDto`, `GetNotificationsQueryDto`, `MarkAsReadParamDto`).
- Expanded automated test suite to 26 passing tests across unit, socket, DTO validation, cross-user isolation, and UI components.
- Completed comprehensive Phase 01 Repository and Environment Audit report (`docs/audits/repository-and-environment-audit.md`).
- Updated `VERSION-VERIFICATION.md` verifying runtime versions (Node.js v26.8.1, pnpm 12.10.1, PostgreSQL 18, Next.js 16.4.0, NestJS 12.1.2).

## 1.0.0 — Initial package

- Product, architecture, data model, API, security, testing, deployment, business and launch documents added.
- Initial PostgreSQL schema and data dictionary added.
- 24 ordered coding-agent prompts added.
- External versions, legal interpretation, market assumptions, and provider terms require dated verification.
