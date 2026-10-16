# Architecture Audit — OgroniEdu Monorepo (Phase 22, Batch A)

Date: 2026-10-11. Source: direct inspection of `apps/api/src`, `apps/web/src`, `packages/*`, docs/00–30.

## 1. Actual stack

- Monorepo: pnpm workspaces + Turborepo. Apps: `@ogroniedu/api` (NestJS 12 + TypeORM + Postgres, Swagger at `/api/docs`), `@ogroniedu/web` (Next.js 16, React 19, next-intl `bn|en`, Redux Toolkit + RTK Query, Tailwind v4, Radix/shadcn new-york, next-themes installed but unused, sonner, socket.io-client).
- Shared: `@ogroniedu/contracts` (notification DTOs only), `@ogroniedu/database` (SQL migrations 001–011 + seed runner), `@ogroniedu/tsconfig`.
- Roles (canonical, from `auth-slice.ts` + docs/05): `student`, `guardian`, `tutor`, `support_agent`, `compliance_reviewer`, `admin`, `super_admin` (+ `guest` unauthenticated). `primaryRole()` order: super_admin > admin > support_agent > compliance_reviewer > tutor > guardian > student.

## 2. Oversized files (measured)

Backend (`apps/api/src`, 190 files):

- `modules/tutors/tutors.service.ts` — 915 lines (profile CRUD + qualifications + subjects + areas + availability + public profile + search + admin verification). Highest risk.
- `modules/learning/learning.service.ts` — 748 lines.
- `modules/payments/payments.service.ts` — 689 lines.
- `modules/admin/admin-operations.service.ts` — 682 lines (dashboard + users + bookings + reconciliation + settings + flags + impersonation + audit).
- `modules/bookings/scheduling.service.ts` — 628 lines; `auth.service.ts` — 547; `analytics.service.ts` — 430; `guardians.service.ts` — 419; `bookings.service.ts` — 381; `notifications/notification.service.ts` — 372.

Frontend (`apps/web/src`, 112 files):

- `components/admin/AdminDashboardView.tsx` — 1077 lines (7 tabs + 4 modals + metrics + tables in one client component; uses `Record<string, any>` twice).
- `components/discovery/TutorSearchCatalog.tsx` — 918 lines.
- `components/learning/LearningManagementView.tsx` — 762 lines.
- `components/scheduling/SessionScheduleCalendar.tsx`, `components/analytics/AnalyticsDashboardView.tsx` — ~503 lines each.
- `components/payments/PaymentCheckoutView.tsx` — 469 lines.

## 3. Mixed responsibilities

- `bookings/entities/booking.entity.ts` (90 lines): entity + `BookingStatus` + `TutoringMode` + `ServiceAgreementSnapshot` in one file.
- `tutors-api.ts`: `TutorOwnProfile` has `[key: string]: unknown` index signature; `Record<string, unknown>` bodies on 4 mutations.
- `AdminDashboardView.tsx`: interfaces + state + filtering + 7 mutations + 4 modals + tables.
- `auth/dto/index.ts`, `bookings/dto/index.ts`, `tutors/dto/index.ts` barrel-re-export DTOs (conceals dependencies).
- `store/services/*`: each file hand-rolls `toQueryString`/`toQuery` (duplicated in tutors, admin, 5+ others).
- `app.module.ts` (159 lines): imports + all 37 entity registrations in one file (acceptable for Nest root, but entity list should come from feature modules).
- No `common/api-response`, `common/pagination`, `common/api-error` modules exist. `common/` has only decorators/guards/filters/middleware/logger.

## 4. API contract inconsistencies

- Success: controllers return ad-hoc `{success:true, data, message?, total?}` or spread (`tutors/search` returns `{success:true, ...results}` where results = `{data,total,page,limit,totalPages}`). `total` is top-level, no `meta`, no `requestId` in body (only `x-request-id` header via middleware).
- Errors: `AllExceptionsFilter` returns Nest-style `{statusCode, error, message, timestamp, path, requestId, details?}` — different shape from success envelope, exposes `stack` in non-production, no stable `code` (e.g. `VALIDATION_ERROR`), no field-level `details[]` contract. Frontend `normalizeApiError` reads `message`/`errors` but backend never sends `errors`.
- Pagination: three dialects — `limit/offset` (admin users/bookings), `page/limit` + `total/totalPages` (tutor search), unpaginated `GET /requests` (bookings list returns full array). No max-page-size enforcement in most controllers, no cursor pagination anywhere (chat `booking-messages`, notifications, audit logs are append-heavy and should be cursor-based).
- Frontend `ApiSuccessEnvelope<T> = {success, message?, data, total?}` matches only half the backend; no `meta` parsing, no cursor support.

## 5. Frontend architecture

- No `features/` directory. Domain components live in `components/{admin,discovery,learning,...}` (14 folders) with business logic + API hooks + tables inline.
- No `hooks/`, `providers/`, `layouts/`, `styles/` directories (aliases in components.json point at non-existent `@/hooks`). `lib/` has only 4 files (`api-error`, `auth`, `i18n`, `utils`).
- Route pages: `[locale]/dashboard/page.tsx` is thin (34 lines, composes redirect). Other route files not yet measured for fat; `DashboardShell` (165 lines) already provides role-aware nav but uses `user.roles[0]` instead of `primaryRole()`, and admin/support/compliance share one nav.
- State: RTK Query `baseApi` with 37 tag types is well designed; `ui-slice` theme is `'light'|'dark'|'system'` but `next-themes` is never wired and `globals.css` only has one teal theme + `prefers-color-scheme` dark override (no switchable themes).
- Forms: no centralized RHF+Zod pattern found; `RegisterForm`/`LoginForm` (~100–147 lines) are self-contained.
- i18n: `messages/` + next-intl; `RootLayout` hardcodes `<html lang="bn" dir="ltr">` and Google-Fonts `<link>` (no `next/font`, no Bangla fallback audit).

## 6. Auth / access control

- Backend: `AuthGuard` + `RolesGuard` + `@Roles()` on admin/trust routes; `guardian-student.guard.ts` exists. Must verify every sensitive controller uses them (tutors public search correctly public; `tutors/me/*` correctly guarded).
- Frontend: `dashboardPathForRoles()` + `canAccessAdmin()` helpers exist, but no centralized `<RequireRole>` guard component; direct-URL access relies on per-page checks.

## 7. Tests

- `apps/api/test`, `apps/web/test`, `packages/database/test` exist — coverage not yet measured. No contract tests for envelope/pagination found.

## 8. Highest risks

1. Splitting `TutorsService`/`AdminOperationsService` wrong breaks verification/audit invariants (self-approval denial, depublication on reject).
2. Changing error envelope without updating `normalizeApiError` + all callers breaks user-facing errors.
3. Tutor search currently loads all published profiles into memory then filters/slices — must move toward indexed DB queries (documented as follow-up; standard contract first).
4. Theme switch must avoid hydration mismatch (next-themes + `suppressHydrationWarning` pattern).

## 9. Post-audit resolutions (implemented in Phase 22)

- **CRITICAL auth bypass (fixed):** `common/guards/auth.guard.ts` unconditionally trusted an `x-user-id`/`x-user-roles` header pair and `mock:` bearer tokens, and `notifications/notification.gateway.ts` accepted an unsigned base64-decoded socket token (or `?userId=`) as identity. All four paths are now gated behind `common/auth/test-auth.ts` (`NODE_ENV=test|development` or explicit `ALLOW_TEST_AUTH_BYPASS=true`) and the socket handshake verifies JWT signatures with `jwt.verify`. Regression coverage: `apps/api/test/auth-bypass-guard.spec.ts`.
- **Oversized frontend views (fixed):** `AdminDashboardView` 1122→310, `TutorSearchCatalog` 968→feature module, `LearningManagementView` 814→feature module (see `frontend-feature-map.md`).
- **`any` in application source (fixed):** zero `any` remaining under `apps/api/src` and `apps/web/src`; unknown/narrowing + typed boundary helpers used instead.
- **Still open:** the backend composition-root entity list (`app.module.ts`) and the 9 public content routes remain to be reorganized (tracked in `refactoring-backlog.md`).
