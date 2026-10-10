# Changelog

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
