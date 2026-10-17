# Role & Permission Matrix — UI/UX Refactor

**Date:** 2026-10-17
**Sources:** `apps/web/src/lib/route-policy.ts` (single source of truth), `apps/web/src/store/slices/auth-slice.ts` (`UserRole`, `primaryRole`, `dashboardPathForRole`), role layouts. API-side authorization is authoritative; these rules are UX gating only.

## 1. Roles (9)

| Role | Group | Default landing (`dashboardPathForRole`) |
| :--- | :--- | :--- |
| `student` | learner | `/{locale}/dashboard/student` |
| `guardian` | learner | `/{locale}/dashboard/guardian` |
| `tutor` | provider | `/{locale}/dashboard/tutor` |
| `admin` | admin family | `/{locale}/admin` |
| `super_admin` | admin family | `/{locale}/admin` |
| `support_agent` | admin family | `/{locale}/admin` |
| `compliance_reviewer` | admin family | `/{locale}/admin` |
| `organization_owner` | provider org | `/{locale}/tutor` |
| `organization_staff` | provider org | `/{locale}/tutor` |

`primaryRole()` resolves multi-role users with this priority: `super_admin > admin > support_agent > compliance_reviewer > organization_owner > organization_staff > tutor > guardian > student`.

## 2. Route policies (`ROUTE_POLICIES`)

| Path prefix | Allowed roles | Onboarding required |
| :--- | :--- | :--- |
| `/admin` | `admin`, `super_admin`, `support_agent`, `compliance_reviewer` | yes |
| `/dashboard/tutor` | `tutor` | yes |
| `/dashboard/guardian` | `guardian` | yes |
| `/dashboard/student` | `student` | yes |
| `/dashboard` | all 9 authenticated roles | yes |
| `/bookings` | `student`, `guardian`, `tutor` | yes |
| `/requests` | `student`, `guardian`, `tutor` | yes |
| `/tutor` | `tutor`, `organization_owner`, `organization_staff` | yes |
| `/profile` | all 9 | no |
| `/notifications` | all 9 | no |
| `/onboarding` | all 9 | no |

Matching is **longest-prefix wins** so `/dashboard/tutor` beats `/dashboard`; locale prefixes (`/bn`, `/en`) are stripped before matching. Public routes have no policy entry (accessible to all).

## 3. UI enforcement layers

| Layer | Component/file | Behaviour |
| :--- | :--- | :--- |
| Route policy | `src/lib/route-policy.ts` | `canAccessPath`, `onboardingRequiredForPath` |
| Auth gate | `RequireAuth` | Signed-out users → `/{locale}/login?next=…` |
| Role gate | `RequireRole` | Wrong role → own dashboard |
| Onboarding gate | `OnboardingGate` | Incomplete onboarding → `/{locale}/onboarding` |
| Layout gates | student/tutor/guardian/admin layouts | Server-render the proper chrome; client redirect on role mismatch |
| Navigation | `src/lib/navigation.ts` | Sidebar/bottom-nav items filtered per role |

## 4. Page-level matrix (summary)

| Surface | student | guardian | tutor | admin | super_admin | support_agent | compliance_reviewer | org_owner | org_staff |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Public marketing / auth | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Student dashboard | ✔ | – | – | – | – | – | – | – | – |
| Guardian dashboard | – | ✔ | – | – | – | – | – | – | – |
| Tutor dashboard | – | – | ✔ | – | – | – | – | – | – |
| Shared `/dashboard` + `/requests` + `/bookings` | ✔ | ✔ | ✔ | – | – | – | – | – | – |
| `/tutor/bookings/[id]` | – | – | ✔ | – | – | – | – | ✔ | ✔ |
| Admin dashboard (`/dashboard/admin/*`) | – | – | – | ✔ | ✔ | ⚠ | ⚠ | – | – |
| Admin console (`/admin`, `/analytics`) | – | – | – | ✔ | ✔ | ✔ | ✔ | – | – |
| `/profile`, `/notifications`, `/onboarding` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

⚠ Known issue #1 — the `dashboard/admin/layout.tsx` allow-list omits `support_agent`/`compliance_reviewer`, so those roles can reach `/{locale}/admin` but are redirected away from `/{locale}/dashboard/admin/*`. The route policy already allows them; the layout list should match the policy. Tracked in `KNOWN_ISSUES.md` (not changed in this refactor to avoid unreviewed behaviour changes).

## 5. Differences vs. `docs/USER_ROLES_AND_PERMISSIONS.md`

No role semantics changed in this refactor. The only permission-adjacent delta is documentation of the known layout/policy mismatch above; no role lists were edited in `route-policy.ts`.
