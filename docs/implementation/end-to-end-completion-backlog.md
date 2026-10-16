# E2E Completion Backlog — Phase 21 Stage B

Ordered by dependency. Each task states reuse + acceptance + verification. Statuses update as batches land.

## P0 — Auth, session, routing (unblocks all)

- **E2E-01 Auth API + session persistence [DONE in this phase]**
  Problem: mock guardian in `auth-slice`, no login/register/me/refresh, token lost on refresh.
  Reuse: `POST /api/v1/auth/*`, `GET me`, backend JWT + HttpOnly refresh cookie; `base-api.ts`, `auth-slice.ts`.
  Changes: new `auth-api.ts` RTK Query; `base-api` credentials+reauth; `auth-slice` logged-out initial + persist access/refresh + hydrate; `lib/auth.ts` role→dashboard map; `RequireAuth/RequireRole` guards; login/register pages with bn/en validation matching `RegisterDto/LoginDto` (email OR phone, password ≥8 + upper/lower/digit).
  Tests: update `store.spec.ts` (logged-out initial), new `auth-flow.spec.ts` (slice persistence, validation, role routing).
  Accept: register→auto-login→`me`→role dashboard; refresh keeps session; 401 clears + redirects to login; no mock user.
  Verify: `pnpm --filter @ogroniedu/web typecheck && pnpm --filter @ogroniedu/web test -- auth-flow store`; browser: register/login/logout/refresh per role.
  Evidence: files listed in final report.

- **E2E-02 Role dashboard shells + navigation**
  Problem: generic dashboard nav, no per-role landing, dead links, no mobile nav.
  Reuse: `(dashboard)` + `(admin)` layouts, Navbar/Footer, shadcn ui.
  Changes: `DashboardShell` (sidebar + breadcrumbs + mobile bottom nav w/ safe-area), role-aware items; `dashboard/page.tsx` role router; `dashboard/student|guardian|tutor` pages; Navbar shows real user + Dashboard/Login/Logout; admin layout guarded `admin/super_admin`.
  Tests: `role-dashboards.spec.ts` (nav items per role, restricted route denial).
  Accept: each role lands on correct dashboard; every nav item opens a working route; no cross-role data; refresh preserves view; empty accounts show next steps.
  Verify: typecheck + test + browser matrix 360/390/768/1280/1440.

## P1 — Data layer + discovery → request (first visible lifecycle)

- **E2E-03 Shared RTK Query domains**
  Problem: only `notifications-api` exists; everything else uses props/fake data.
  Reuse: `base-api.ts` tagTypes; backend controllers/DTOs §A2.
  Changes: `tutors-api, bookings-api(requests), sessions-api, learning-api, payments-api, guardians-api, trust-api, admin-api, analytics-api, taxonomy-api, users-api, booking-messages-api` with strict TS (no `any`), shared response envelopes `{success,data,total?}`, error normalization `lib/api-error.ts`, cache tags + invalidation map.
  Tests: endpoint-definition specs per domain.
  Accept: every user-facing backend module has a typed hook; no second fetch system; no `any`.
  Verify: `typecheck && test`.

- **E2E-04 Tutor discovery + booking request (real)**
  Problem: `DEFAULT_CATALOG` + fake success modal (hardcoded studentId/level).
  Reuse: `GET tutors/search`, `POST requests`, taxonomy endpoints, `TutorSearchCatalog` UI.
  Changes: `tutors/page.tsx` container uses `useSearchTutorsQuery` (debounced q/mode/price/sort/page → server); taxonomy dropdowns from real API; `TutorSearchContainer` handles loading/error/empty; booking modal selects REAL student (self or linked child) + REAL subject/level from tutor profile + mode/days/notes → `useCreateBookingRequestMutation` → invalidates requests + notifications; remove `DEFAULT_CATALOG` default (empty initial, keep optional prop for tests).
  Tests: extend `tutor-discovery.spec.ts` (server-param mapping, empty state, mutation payload).
  Accept: filters/pagination change server query; cards render API data; request persists + appears in requests list; second user (tutor) sees it.
  Verify: unit + browser search→request.

## P2 — Booking lifecycle

- **E2E-05 Requests inbox (accept/decline/withdraw) + booking detail + messages**
  Problem: no requests page, no detail, `BookingChatView` unmounted.
  Reuse: `GET/POST requests`, messages endpoints, NotificationProvider.
  Changes: `requests/page.tsx` (role-filtered list, withdraw/respond mutations), `bookings/[id]/page.tsx` (detail + sessions + messages + payments link), `booking-messages-api` wiring in `BookingChatView` + container.
  Tests: state-transition + negative auth tests.
  Accept: student/guardian creates → tutor accepts/declines → both see consistent status after refresh.
  Verify: unit + browser.

- **E2E-06 Scheduling (conflict-aware) + notifications**
  Problem: `DEFAULT_SESSIONS` + local-only reschedule/cancel.
  Reuse: `sessions-api`, `SessionScheduleCalendar`.
  Changes: `sessions/page.tsx` container (`useGetSessionsQuery` w/ booking/date filters); schedule/reschedule/cancel mutations with server policy assessment render; conflict errors localized; invalidate sessions+notifications.
  Fix `NotificationProvider`: Bearer socket auth + RTK Query hooks, no `x-user-id`, reconnect refetch, dedupe by id, deep-link handling; DELETE public test-dispatch UI from homepage (keep dev-only endpoint).
  Tests: scheduling + notification specs.
  Accept: overlapping schedule rejected by server message; reschedule/cancel persist + notify participants.
  Verify: unit + browser.

## P3 — Learning, payments, trust

- **E2E-07 Learning (attendance/homework/grade/progress)**
  Problem: sample data + local-only submit/grade.
  Reuse: `learning-api`, `LearningManagementView`.
  Changes: `learning/page.tsx` (+ `learning/bookings/[id]`) loads booking records/student summary by role; attendance/submit/grade/report mutations; guardian sees only linked child; revision reason enforced; empty states until records exist.
  Tests: grading-revision + privacy negative tests.
  Accept: tutor marks attendance/grades → student/guardian see after refresh.
  Verify: unit + browser.

- **E2E-08 Payments (orders/receipts/refunds) + financial history**
  Problem: fake order + local receipt + fake ledger badges.
  Reuse: `payments-api`, `PaymentCheckoutView`.
  Changes: `payments/page.tsx` create order from booking (idempotency key) → provider redirect/sandbox → receipt from `GET receipt` ONLY (no local receipt); refunds + history list; reconciliation badges from `GET reconciliation`/ledger (admin) else hide; never claim live money (sandbox labels preserved).
  Tests: idempotency + ledger invariant specs (backend) + receipt-render spec.
  Accept: order→webhook(sandbox)→receipt round-trip; refresh preserves; refund posts reversal.
  Verify: unit + sandbox webhook test; BLOCKED: live provider (document).

- **E2E-09 Trust (reviews/safety/replacement) + tutor verification queue**
  Problem: modals unwired; no verification queue UI.
  Reuse: trust endpoints, admin tutors endpoints, existing modals.
  Changes: `tutors/[id]/page.tsx` (public profile + reviews list + review/reply/safety/replacement actions gated by completed booking); tutor dashboard verification card wired (profile/subjects/availability/publication w/ server gating); admin verification queue tab wired (approve/reject).
  Tests: anti-self-review + eligibility negative tests.
  Accept: only eligible users review; tutor replies; admin moderates; unverified tutor cannot publish.
  Verify: unit + browser.

## P4 — Admin, guardians, polish

- **E2E-10 Admin operations + analytics (real)**
  Problem: fake metrics/users/bookings/reconciliation/settings/flags.
  Reuse: `admin-api`, `analytics-api`, `AdminDashboardView`, `AnalyticsDashboardView`.
  Changes: `admin/page.tsx` + `analytics/page.tsx` containers fetch dashboard/users/bookings/reconciliation/settings/flags/audit/analytics with server pagination/search; mutations suspend/reactivate/roles/cancel/settings/flags/impersonation(audit-logged, super_admin only); remove hardcoded defaults (empty until loaded).
  Tests: RBAC negative (admin vs super_admin) + audit-log specs.
  Accept: suspend/reactivate/role/booking-cancel persist + audited; flags only super_admin.
  Verify: unit + browser (admin + super_admin).

- **E2E-11 Guardian children + student profiles + privacy**
  Problem: demo child + mock fallback; no verification workflow UI.
  Reuse: `guardians-api`, `users-api`, `GuardianChildrenManager`.
  Changes: guardian dashboard children tab wired (link-request/register/verify/revoke with consent v1.0); child switcher scoping bookings/sessions/learning/payments; student profile onboarding form; privacy: guardian sees only linked active children (negative tests).
  Tests: link/verify/revoke + cross-guardian isolation.
  Accept: add→pending→verify→active→scoped views; revoke hides data.
  Verify: unit + browser.

- **E2E-12 UI polish, responsive, a11y, i18n completeness**
  Problem: inconsistent `useTranslations` vs `getDictionary`; missing auth/dashboard keys; no focus/ARIA audit; no viewport verification.
  Reuse: theme tokens, shadcn ui, messages files.
  Changes: centralize strings (no hardcoded English in components), add missing bn/en keys, visible focus + keyboard + ARIA + reduced-motion, viewport pass 360/390/768/1280/1440, print receipt styles.
  Tests: `i18n.spec.ts` (no missing keys), a11y spec.
  Accept: zero untranslated UI; no overflow; all buttons act.
  Verify: `i18n` + a11y tests + browser matrix.

## P5 — Verification

- **E2E-13 Lifecycle E2E + final report**
  Scenario (§H steps 1–19) on seeded dev DB; Playwright/vitest coverage per role; `typecheck + test + build` per package; report `docs/audits/end-to-end-product-completion-report.md` with pass/fail counts + blockers + next batch.
  BLOCKED notes: live payments, production demo seeding, external email/SMS (keep channel abstraction).

Dependency order: E2E-01 → E2E-02 → E2E-03 → E2E-04 → E2E-05/06 → E2E-07/08/09 → E2E-10/11 → E2E-12 → E2E-13. Never skip auth/data deps to polish UI first.

## Status (2026-10-11, updated 2026-10-14)

DONE + live-verified: E2E-01, E2E-03, E2E-04, E2E-05, E2E-06, E2E-07, E2E-08 (sandbox), E2E-09, E2E-11.
DONE (built, live admin-ops click-through pending): E2E-02, E2E-10.
BROWSER-VERIFIED 2026-10-13: smoke (8), auth guards (8), booking journey (2),
evidence upload + session revocation (2), responsive matrix 360/390/768/1280/1440 (20),
diag (1) — 41/41 Playwright, plus API 413/413 and web 102/102 unit.
Session-revocation UI and tutor evidence-upload UI (former E2E-13 gaps) implemented
and browser-verified. Remaining a11y deep-pass is the only open E2E-12 item.
2026-10-14 UI/UX + structure pass: last fake-data fabrication removed (learning
hook), 2 dead compat shims deleted, bilingual gaps closed (footer/card/modals/
pagination/chips/nav/support/ledger), fabricated ledger rows replaced with
order-derived facts, skip-link + single-main landmarks, tutor route guarded,
login/register overflow fixed (matrix 20/20), conventions codified in
`apps/web/ARCHITECTURE.md`. Verified: web typecheck + build, API 413/413, web
102/102, Playwright 41/41.
2026-10-14 admin + a11y pass: tutor verification queue tab (list/dossier/
decisions) + suspend/reactivate journey browser-verified; admin user search now
server-side; keyboard skip-link coverage; 11 new message keys. Verified: web
typecheck + build, API 413/413, web 105/105, Playwright 45/45.
BLOCKED (unchanged): live provider settlement, production demo seeding, external email/SMS.
