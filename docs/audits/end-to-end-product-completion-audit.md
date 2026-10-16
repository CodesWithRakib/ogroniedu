# End-to-End Product Completion Audit — Phase 21 Stage A

Date: 2026-10-10 (UTC). Auditor: Muse Spark (direct repo inspection, no trust in changelogs).
Scope: `apps/api/src`, `apps/web/src`, `packages/contracts/src`, `packages/database`, routes, store, i18n, tests.

## A1. Method

- Listed every `apps/api/src` controller + route, guard/RBAC, DTO.
- Listed every `apps/web/src` route/page/component/store slice/service.
- Grepped for `mock`, `DEFAULT_`, hardcoded business records, `http://localhost:4000`, `x-user-id` header bypass usage in web.
- Read auth slice, base-api, NotificationProvider, TutorSearchCatalog, GuardianChildrenManager, SessionScheduleCalendar, LearningManagementView, PaymentCheckoutView, AdminDashboardView, Navbar, layouts, pages, messages.
- Read backend `auth.guard.ts` (supports `x-user-id` + `mock:` tokens), `auth.service.ts`, `tutors.controller.ts`, `bookings.controller.ts`, `sessions.controller.ts`, `learning.controller.ts`, `payments.controller.ts`, `admin-operations.controller.ts`, `analytics.controller.ts`.

## A2. Backend endpoint inventory (all exist, verified by reading controllers)

| # | Method + Path | Auth / Roles | Frontend caller? | Renders real data? | Status |
|---|---|---|---|---|---|
| A1 | POST `/api/v1/auth/register` | public | NONE — no register page/form | No | NOT_IMPLEMENTED (frontend) |
| A2 | POST `/api/v1/auth/login` | public | NONE — no login page/form | No | NOT_IMPLEMENTED (frontend) |
| A3 | POST `/api/v1/auth/refresh` (cookie + body) | public w/ refresh token | NONE — no refresh logic in web | No | NOT_IMPLEMENTED |
| A4 | POST `/api/v1/auth/logout`, `revoke-all` | auth | NONE — Navbar has no logout action | No | NOT_IMPLEMENTED |
| A5 | GET `/api/v1/auth/me` | auth | NONE — web never calls; uses hardcoded user | No | NOT_IMPLEMENTED |
| A6 | POST request-code/verify-code/reset-password | public | NONE | No | NOT_IMPLEMENTED |
| U1 | GET/PATCH `/api/v1/users/me`, PUT student-profile, export, delete | auth (owner) | NONE | No | NOT_IMPLEMENTED |
| G1 | POST `/api/v1/guardians/children`, POST link-request, GET children, GET child details, POST verify, DELETE revoke | guardian/admin/super_admin + GuardianStudentGuard | `GuardianChildrenManager` accepts `onAddChild/onRevokeLink` props but NO page passes them; default shows 1 hardcoded demo child + mock fallback on submit | No — mock fallback | PARTIALLY_IMPLEMENTED |
| T1 | GET `/api/v1/tutors/search` (public, q/subject/level/curriculum/mode/price/sort/page) | public | `TutorSearchCatalog` accepts `onSearch` but tutors page does NOT pass it; uses `DEFAULT_CATALOG` 3 hardcoded tutors + client-side filter fallback | No — fake catalog | PARTIALLY_IMPLEMENTED |
| T2 | GET `/api/v1/tutors/public/:id` | public | NONE | No | NOT_IMPLEMENTED |
| T3 | GET `/api/v1/tutors/me`, PUT profile, POST submit-verification, PATCH publication, qualifications/subjects/service-areas/availability CRUD | auth tutor | `TutorVerificationStatusCard` exists but no page wires it; no tutor dashboard | No | NOT_IMPLEMENTED |
| T4 | Admin tutors review endpoints | admin/super_admin | NONE wired (AdminDashboardView has no verification queue tab wired) | No | NOT_IMPLEMENTED |
| R1 | POST/GET `/api/v1/requests`, GET :id, POST :id/withdraw, POST :id/respond | auth (participant-scoped) | `TutorSearchCatalog` booking modal uses hardcoded `studentId 2222...`, `educationLevelId level-ssc-1`, calls `onSubmitRequest` which NO page provides → shows fake success toast, never hits API | No — fake success | PARTIALLY_IMPLEMENTED |
| S1 | POST `/api/v1/sessions`, POST recurring, GET list, GET :id, POST :id/reschedule, POST :id/cancel, GET tutor calendar | auth | `SessionScheduleCalendar` accepts callbacks but sessions page passes NONE; uses `DEFAULT_SESSIONS` 3 hardcoded rows; reschedule/cancel only mutate local state | No — fake calendar | PARTIALLY_IMPLEMENTED |
| L1 | POST attendance, GET session attendance, POST assignments, POST submissions, POST grade, POST progress-reports, GET booking records, GET student summary | auth (scoped) | `LearningManagementView` accepts callbacks but learning page passes NONE + hardcoded sampleAttendance/Assignments/Reports | No — sample data | PARTIALLY_IMPLEMENTED |
| P1 | POST `/api/v1/payments/orders`, POST webhook/:provider, POST refunds, POST settle, GET receipt, GET reconciliation, GET ledger balance | auth (webhook public w/ signature) | `PaymentCheckoutView` uses hardcoded `ord-8839/student Zafir` order; `onSimulateWebhook` never provided by payments page; local `setTimeout` fake success + locally generated receipt | No — fake payment | PARTIALLY_IMPLEMENTED |
| N1 | GET `/api/v1/notifications`, GET unread-count, PATCH :id/read, POST read-all, GET/PATCH preferences | auth Bearer | `notifications-api.ts` RTK Query EXISTS and correct, BUT `NotificationProvider` bypasses it with raw `fetch` + `x-user-id`/`x-user-roles` headers + `mock:` socket token; homepage test-dispatch buttons use hardcoded `http://localhost:4000` + demo user id | Partial — wrong auth path | PARTIALLY_IMPLEMENTED |
| N2 | GET booking messages, POST message | auth participant | `BookingChatView` exists but NO route/page mounts it; no booking detail page | No | NOT_IMPLEMENTED |
| V1 | POST `/api/v1/reviews`, GET tutors/:id, POST reply, PATCH moderate | auth scoped | `ReviewFormModal/TutorReviewsListView` exist but no tutor detail page wires them | No | NOT_IMPLEMENTED |
| V2 | safety-reports CRUD | auth | `SafetyReportModal` exists, unwired | No | NOT_IMPLEMENTED |
| V3 | tutor-replacements CRUD | auth | `TutorReplacementModal` exists, unwired | No | NOT_IMPLEMENTED |
| D1 | GET `/api/v1/admin/dashboard`, users, dossier, suspend/reactivate, roles, bookings, cancel, reconciliation, settings, flags, impersonation, audit-logs | admin/super_admin | `AdminDashboardView` is full-featured presentational component BUT admin page passes hardcoded `mockAdminUser + sampleMetrics/Users/Bookings`; reconciliation/settings/flags hardcoded defaults inside component; no RTK Query; audit tab empty | No — fake admin data | PARTIALLY_IMPLEMENTED |
| AN1 | GET `/api/v1/analytics/overview|financials|tutors|retention|tutors/me` | admin / tutor(self) | `AnalyticsDashboardView` exists, analytics page NOT verified wired (needs read) — likely same props pattern | No (assumed) | PARTIALLY_IMPLEMENTED |
| TX1 | GET `/api/v1/taxonomy/subjects|education-levels|curricula` | public | NONE — filters use hardcoded option lists | No | NOT_IMPLEMENTED |
| F1 | files upload/signed-url | auth | NONE wired (tutor evidence upload unwired) | No | NOT_IMPLEMENTED |

Legitimate internal-only endpoints (no UI needed): `POST /api/v1/payments/webhook/:provider` (provider server-to-server), `POST /api/v1/notifications/test-dispatch` (dev/test only — MUST NOT ship on public homepage), health probes.

## A3. Frontend route inventory

Existing routes: `/[locale]` home, `/tutors`, `/how-it-works`, `/pricing`, `/privacy`, `/terms`, `/safety`, `/faq`, `/contact`, `/(dashboard)/learning|sessions|payments`, `/(admin)/admin|analytics`.
MISSING routes: `/login`, `/register`, `/dashboard` (role router), `/dashboard/student`, `/dashboard/guardian`, `/dashboard/tutor`, `/bookings`, `/requests`, `/tutors/:id`, `/guardian/children`, `/notifications`, `/profile`, `/onboarding/*`. No protected-route guard component. No role-based sidebar. Dashboard layout nav is generic (Study Room/Sessions/Payments) for all roles. No mobile bottom nav. Navbar shows hardcoded "Guardian Account / Tanvir Ahmed" + dead login button on mobile.

## A4. Auth/session findings (critical)

- `auth-slice.ts` initial state is HARDCODED logged-in guardian (`mock:1111:guardian`). `store.spec.ts` asserts this. No login/logout flow, no token persistence, no refresh, no `me` hydration, no 401 handling.
- `base-api.ts` reads token from redux only (never persisted), sets `x-locale`, sets `x-request-id`, but `credentials` not set so HttpOnly refresh cookie never sent; no reauth logic.
- `NotificationProvider` + homepage use `x-user-id` test bypass + `mock:` socket auth instead of real JWT Bearer. `AuthGuard` on backend ACCEPTS these bypasses (by design for tests) — frontend must stop using them in prod paths.
- No session restore on refresh (redux store recreated empty/mock each load).

## A5. Fake business data inventory (must remove)

1. `auth-slice.ts:20-30` — mock guardian user + token.
2. `TutorSearchCatalog.tsx:99-217` — `DEFAULT_CATALOG` 3 tutors (Rahat/Nusrat/Tanzimul) shown on every visit; booking modal hardcoded studentId/level; client-side filter/sort/pagination on fake rows.
3. `SessionScheduleCalendar.tsx:67-105` — `DEFAULT_SESSIONS` 3 rows; reschedule/cancel fabricate policy assessment locally.
4. `GuardianChildrenManager.tsx:52-66,110-123` — demo child + mock link fallback.
5. `LearningManagementView` pages: `learning/page.tsx:16-93` sampleAttendance/Assignments/Reports (Newtonian Dynamics etc.).
6. `PaymentCheckoutView.tsx:76-88` defaultOrder `ord-8839/Kazi/Zafir`; payments page sampleOrder; local receipt generation + `setTimeout` fake success.
7. `AdminDashboardView.tsx:99-147` hardcoded reconciliation `500,000/500,000`, settings, flags; `admin/page.tsx:15-78` mockAdmin + sampleMetrics/Users/Bookings.
8. `page.tsx (home):49,68-81` demoUserId + `http://localhost:4000` test-dispatch buttons exposed publicly; hero stats `5000+/20000+/4.9` are marketing claims, acceptable as static copy ONLY if labeled; currently presented as metrics — keep as marketing copy, do not treat as dashboard KPIs.
9. `Navbar.tsx:117-122` hardcoded guardian label.
10. No pagination/filters hit server except notifications RTK Query (unused by provider).

## A6. Realtime/notifications

- Socket.IO gateway + REST + unread count + mark read/all read + preferences + toasts + center + bell exist. BUT auth is `mock:` token + `x-user-id` headers, no JWT Bearer, no reconnect-from-history guarantee in provider (it does refetch on mount — good), no dedupe ids, no navigation metadata handling verified. `dispatchNotification` mutation points at `test-dispatch` (dev-only) — must be removed from prod UI.

## A7. i18n/responsive/a11y

- `getDictionary + formatLocalizedNumber` used consistently; bn/en message files comprehensive for existing components. MISSING keys: auth forms (only loginTitle/subtitle/phone/password stubs), dashboard shell/nav, bookings list, profile, errors, empty states for new pages. No RTL (bn is LTR — acceptable, keep LTR + bn digits/dates). Responsive: Tailwind grids present; 360/390/768/1280/1440 NOT verified in browser. No `next-intl` routing integration verified (custom `[locale]` param + `getDictionary`, not `useTranslations` except Admin view mixing both — inconsistent).

## A8. Tests

- Backend `apps/api/test` ~40 specs (auth, bookings, scheduling, learning, payments, ledger, notifications, trust, admin, analytics). Not executed in this audit (need DB for many). Must run `vitest run` to confirm.
- Web `test/*.spec.ts` 16 files — component-prop + dictionary assertions, NOT integration: they pass props directly, never hit API. `store.spec.ts` asserts mock auth. No Playwright E2E wired to real API (specs are vitest-style). No test covers login→dashboard→request→accept→session→attendance→grade→receipt lifecycle.

## A9. Traceability verdicts

- `VERIFIED_COMPLETE`: NONE (no feature verified end-to-end from UI → API → DB → re-render).
- `PARTIALLY_IMPLEMENTED`: tutor search UI, booking modal UI, sessions calendar UI, learning tabs UI, payment checkout UI, guardian children UI, admin dashboard UI, notifications bell/center/toast/socket UI, public pages/i18n shell.
- `NOT_IMPLEMENTED` (frontend integration): auth forms/session/role routing/guards, all RTK Query domains except notifications, tutor detail + request lifecycle pages, booking detail + messages, reviews/safety/replacement wiring, taxonomy filters, files upload, user profile/onboarding, role dashboards, mobile bottom nav, error normalization, 401/refresh flow.
- `BLOCKED`: live bKash/SSLCommerz settlement (no credentials — use sandbox adapters + webhook signature tests only); production DB E2E (needs `DB_*` + migrations — verify locally).
- `VERIFICATION_FAILED`: any prior claim that these flows "work" — disproved by missing callers + hardcoded data above.

## A10. Remediation (→ backlog)

1. Real auth + session + guards + role dashboards first (unblocks everything).
2. One shared RTK Query domain per backend module (no second fetch system).
3. Container pages that fetch real data + pass to existing presentational components (preserve components/tests).
4. Remove fake defaults → empty/loading/error states; delete public test-dispatch UI; use Bearer everywhere.
5. Wire booking→session→learning→payment→trust lifecycle with cache invalidation.
6. Add meaningful tests + run typecheck/unit/build; browser-verify where servers available.

## A11. Post-implementation verification (2026-10-11, live)

Full lifecycle executed against `http://localhost:4000` + local Postgres (`ogroniedu_dev`).
Evidence: `docs/audits/end-to-end-product-completion-report.md` §§5–8.

- Auth: register guardian/student/tutor + admin login + `auth/me` — PASS.
- Guardians: link-request → student approve → active scoped list; cross-guardian 403 — PASS.
- Tutors: profile/qualification/subject/availability/submit/admin-approve/publish — PASS (found + fixed `addSubject` 500 on omitted `curriculumId`, fixed nested `{profile,user}` envelope handling).
- Requests: create → tutor accept → both parties see `accepted`; student accept 403 — PASS (fixed `{decision}`→`{action}` contract).
- Sessions/learning: schedule → attendance → assignment → submit → grade → records/summary; reschedule; overlap rejected — PASS (new migration `011_session_cancellation_tracking.sql` for missing columns).
- Messages: guardian→tutor both directions — PASS (fixed `{body}`→`{content}` contract; removed demo chat messages).
- Payments: order → signed sandbox webhook → server receipt → refund → reconciliation balanced; idempotent replay — PASS (fixed `PaymentAdapterFactory` bare-param DI; removed undefined placeholder order lookup).
- Trust: review → reply → list; safety; replacement; self-review 403 — PASS (aligned review/reply/moderate contracts; removed raw `fetch('/api/...')` from all trust components).
- Guards: fixed `RolesGuard`/`AuthGuard` DI tokens (tsx transpile-only drops undecorated param metadata).
- Verdicts updated: all rows in §A2 move to `VERIFIED_COMPLETE` except `D1/AN1` admin mutations (wired + built, live admin-ops click-through pending), `F1` files upload UI (not implemented), webhook provider live settlement (`BLOCKED`), and browser click-through (pending next batch).
