# 02 — Routing & UX: Route Inventory, Guards, Role↔Navigation Matrix

All statements here were verified against code and/or the live E2E run on 2026-10-16.

## 1. Route inventory — 44 `page.tsx` (43 localized + root redirect)

**Public `(public)` group** — no guard:
`/` (home) · `/tutors` · `/tutors/[id]` · `/pricing` · `/faq` · `/how-it-works` · `/safety` · `/contact` · `/terms` · `/privacy`

**Auth pages** — no guard:
`/login` · `/register`

**Locale-level dashboards group `(dashboard)`** — `RequireAuth` each:
`/learning` · `/payments` · `/sessions`

**Locale-level shared** — `RequireAuth` each:
`/requests` · `/notifications` · `/profile`

**Dashboard tree** — role-guarded per layout (see §2):
`/dashboard` (root role router) · `/dashboard/student{,/learning,/payments,/requests,/sessions}` · `/dashboard/guardian{,/children,/learning,/payments,/requests,/sessions}` · `/dashboard/tutor{,/learning,/payments,/requests,/sessions,/verification}` · `/dashboard/admin{,/analytics,/disputes,/users,/verification}`

**Admin group `(admin)`**:
`/admin` (console) → guarded via `AdminLayout` · `/analytics` → `RequireRole allow=['admin','super_admin']`

Root `page.tsx` = redirect/landing dispatcher (non-localized).

> Note: `/dashboard/admin/*` and `/analytics` are **two different analytics surfaces**; see §4 finding R-2.

## 2. Guard architecture (all client-side)

| Layer         | File                                                           | Behavior                                                                                      |
| ------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `RequireAuth` | `apps/web/src/components/auth/RequireAuth.tsx`                 | Redirects unauthenticated users to `/login` after hydration                                   |
| `RequireRole` | `apps/web/src/components/auth/RequireRole.tsx:29-40`           | Redirects to `fallbackPath` (default `/dashboard`) unless `user.roles ∩ allow ≠ ∅`            |
| Role layouts  | `[locale]/dashboard/{student,guardian,tutor,admin}/layout.tsx` | Wrap `RoleDashboardLayout role=…` → `RequireRole allow=[role]` (`RoleDashboardLayout.tsx:27`) |
| Admin console | `layouts/admin/AdminLayout.tsx:23`                             | `allow=['admin','super_admin','support_agent','compliance_reviewer']`                         |
| Role router   | `[locale]/dashboard/page.tsx` + `auth-slice.ts:150-167`        | `primaryRole` (privilege order) → dashboard path; admin-family → `/admin`                     |

**Important:** every guard is client-side (renders shell HTML, then redirects). This is consistent with the "S2 client-guarded" posture of prior phases, but it means: unauthenticated visitors receive HTTP 200 HTML shells for guarded routes, and API authorization is the real boundary (see `03-backend-and-api.md` / `07-security-findings.md`).

## 3. Role ↔ navigation matrix (source of truth: `apps/web/src/lib/navigation.ts`)

| Nav item (testId)                     | student                       | guardian                       | tutor                           | admin-family¹                   |
| ------------------------------------- | ----------------------------- | ------------------------------ | ------------------------------- | ------------------------------- |
| Role dashboard (`nav-dashboard`)      | `/dashboard/student`          | `/dashboard/guardian`          | `/dashboard/tutor`              | — (starts with Control Center)  |
| Control Center (`nav-admin`)          | —                             | —                              | —                               | `/dashboard/admin`              |
| Analytics (`nav-analytics`)           | —                             | —                              | —                               | `/dashboard/admin/analytics`    |
| Tutor verification (`nav-tutors`)     | —                             | —                              | `/dashboard/tutor/verification` | `/dashboard/admin/verification` |
| Reconciliation (`nav-reconciliation`) | —                             | —                              | —                               | `/dashboard/admin/disputes`     |
| User manager (`nav-users`)            | —                             | —                              | —                               | `/dashboard/admin/users`        |
| Audit logs (`nav-audit`)              | —                             | —                              | —                               | `/admin?tab=audit`              |
| Platform settings (`nav-settings`)    | —                             | —                              | —                               | `/admin?tab=settings`           |
| Find tutors (`nav-tutors`)            | `/tutors`                     | `/tutors`                      | —                               | —                               |
| Requests (`nav-requests`)             | `/dashboard/student/requests` | `/dashboard/guardian/requests` | `/dashboard/tutor/requests`     | —                               |
| Sessions (`nav-sessions`)             | `/dashboard/student/sessions` | `/dashboard/guardian/sessions` | `/dashboard/tutor/sessions`     | —                               |
| Learning (`nav-learning`)             | `/dashboard/student/learning` | `/dashboard/guardian/learning` | `/dashboard/tutor/learning`     | —                               |
| Payments (`nav-payments`)             | `/dashboard/student/payments` | `/dashboard/guardian/payments` | `/dashboard/tutor/payments`     | —                               |
| Children (`nav-children`)             | —                             | `/dashboard/guardian/children` | —                               | —                               |
| Alerts (`nav-notifications`)          | `/notifications`              | `/notifications`               | `/notifications`                | —                               |
| Profile (`nav-profile`)               | `/profile`                    | `/profile`                     | `/profile`                      | —                               |

¹ `admin`, `super_admin`, `support_agent`, `compliance_reviewer` share one identical nav list (`navigation.ts:266-323`).

### Access checks derived from guards

| Role                                  | `/dashboard/admin/*` (allow=`admin`) | `/admin` console (allow=4 roles) | `/analytics` (allow=`admin`,`super_admin`) |
| ------------------------------------- | ------------------------------------ | -------------------------------- | ------------------------------------------ |
| `admin` (seed also has `super_admin`) | ✅                                   | ✅                               | ✅                                         |
| `super_admin` **without** `admin`     | ❌ redirect                          | ✅                               | ✅                                         |
| `support_agent`                       | ❌ redirect                          | ✅                               | ❌ redirect                                |
| `compliance_reviewer`                 | ❌ redirect                          | ✅                               | ❌ redirect                                |

## 4. Findings (routing/UX)

- **R-1 (Medium) — Dead nav links for 3 of 4 admin-family roles.** `super_admin`/`support_agent`/`compliance_reviewer` receive nav items under `/dashboard/admin/*`, but those routes require the literal `admin` role (`RoleDashboardLayout.tsx:27`). They are silently bounced to `/dashboard` → `/admin`. Either widen `allow` for admin subroutes or filter the nav by `allow`.
- **R-2 (Low) — Duplicate analytics surfaces with divergent gates.** `/dashboard/admin/analytics` (admin-only) vs `/analytics` (admin+super_admin). Consolidate or align.
- **R-3 (Medium, UX) — Curated fake tutors flash on `/tutors` before the real search resolves**, and their "Request tutoring" button submits non-existent IDs. Live reproduction: first card `tutor-card-tutor-buet-1` right after load; after settle only the real tutor card `tutor-card-22222222-…` remains; modal for the stale card held "Tanvir Hasan". Root cause: `resultSnapshot` falls back to `CURATED_SAMPLE_TUTORS` whenever `items.length === 0` — which is also true while the search is still loading (`tutors-page.tsx:360-407`); the catalog keeps its `initialData` snapshot until the effect at `tutorSearchCatalog.tsx:81-83` syncs. See `05-static-data-audit.md` §S-1 and `06-quality-baseline.md` §E2E for the incident.
- **R-4 (Medium, UX) — React hydration mismatches in `BottomNavbar`.** Server renders the signed-out variant (`href="/bn/login"`, `User` icon) while the client hydrates the signed-in variant (`href="/bn/dashboard/…"`, `LayoutDashboard` icon) because auth state is read from the store during first render; logged in every page load while authenticated. Evidence: web dev-server log (`[browser] Uncaught Error: Hydration failed … at BottomNavbar (src/components/shell/BottomNavbar.tsx:139:15)`) across `/bn`, `/bn/tutors`, `/en/profile`, etc. React recovers by regenerating the tree, but it costs CLS/console noise and is user-visible in slow devices. Also logged: "Encountered a script tag while rendering React component. Scripts inside React components are never executed…" (repeated).
- **R-5 (Info) — `/dashboard/admin/verification` nav label** is "Tutor Verification" (`nav-tutors` testId reused across roles); two nav entries share the same testId (`nav-tutors` appears for student find-tutors AND admin verification). Harmless today; avoid in tests that key on testId per role.
- **R-6 (Verified good)** — Keyboard skip-link E2E passes in bn+en; responsive matrix (360/390/768/1280/1440 across 4 public pages) = 20/20 green. `locale` default is `bn-BD`.
