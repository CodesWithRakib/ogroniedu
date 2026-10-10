# Changelog

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
