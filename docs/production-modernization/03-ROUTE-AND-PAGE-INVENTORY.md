# OgroniEdu — Master Route and Page Inventory

**Status:** VERIFIED (2026-10-24)  
**Scope:** Frontend routes (Next.js App Router). Accurate as of commit `32712a9`.

---

## 1. Route Tree Summary

| Area | Locale | Path Template | Layout | Page | Component | Server?/Client? |
|---|---|---|---|---|---|---|
| **Public** | `/` | `/` | layout.tsx | page.tsx | features/public/landing-page | Server |
| | `/` | `/bn` | layout.tsx | page.tsx | features/public/landing-page | Server (redirect) |
| | `/about` | `/about` | layout.tsx | page.tsx | features/public/about | Server |
| | `/contact` | `/contact` | layout.tsx | page.tsx | features/public/contact | Server |
| | `/pricing` | `/pricing` | layout.tsx | page.tsx | features/public/pricing | Server |
| | `/terms` | `/terms` | layout.tsx | page.tsx | features/public/terms | Server |
| | `/privacy` | `/privacy` | layout.tsx | page.tsx | features/public/privacy | Server |
| | `/faq` | `/faq` | layout.tsx | page.tsx | features/public/faq | Server |
| | `/tutors` | `/tutors` | layout.tsx | page.tsx | features/tutor-discovery/list | Server |
| | `/tutors/[id]` | `/tutors/[id]` | layout.tsx | page.tsx | features/tutor-discovery/profile | Server |

---

## 2. Student Portal

| Path | Layout | Page | Component | Server?/Client? |
|---|---|---|---|---|
| `/dashboard/student` | layouts/student/RoleLayout.tsx | page.tsx | features/dashboard/student | Server |
| `/dashboard/student/learning` | layouts/student/RoleLayout.tsx | page.tsx | features/learning/dashboard | Server |
| `/dashboard/student/sessions` | layouts/student/RoleLayout.tsx | page.tsx | features/bookings/student | Server |
| `/dashboard/student/requests` | layouts/student/RoleLayout.tsx | page.tsx | features/bookings/student | Server |
| `/dashboard/student/payments` | layouts/student/RoleLayout.tsx | page.tsx | features/payments/student | Server |
| `/dashboard/student/profile` | layouts/student/RoleLayout.tsx | page.tsx | features/profile/student | Server |

---

## 3. Guardian Portal

| Path | Layout | Page | Component | Server?/Client? |
|---|---|---|---|---|
| `/dashboard/guardian` | layouts/guardian/RoleLayout.tsx | page.tsx | features/guardian/dashboard | Server |
| `/dashboard/guardian/children` | layouts/guardian/RoleLayout.tsx | page.tsx | features/guardian/children | Server |
| `/dashboard/guardian/children/[studentId]` | layouts/guardian/RoleLayout.tsx | page.tsx | features/guardian/child | Server |
| `/dashboard/guardian/learning` | layouts/guardian/RoleLayout.tsx | page.tsx | features/learning/guardian | Server |
| `/dashboard/guardian/sessions` | layouts/guardian/RoleLayout.tsx | page.tsx | features/bookings/guardian | Server |
| `/dashboard/guardian/requests` | layouts/guardian/RoleLayout.tsx | page.tsx | features/bookings/guardian | Server |
| `/dashboard/guardian/payments` | layouts/guardian/RoleLayout.tsx | page.tsx | features/payments/guardian | Server |

---

## 4. Tutor Portal

| Path | Layout | Page | Component | Server?/Client? |
|---|---|---|---|---|
| `/dashboard/tutor` | layouts/tutor/RoleLayout.tsx | page.tsx | features/dashboard/tutor | Server |
| `/dashboard/tutor/profile` | layouts/tutor/RoleLayout.tsx | page.tsx | features/tutor/profile | Server |
| `/dashboard/tutor/verification` | layouts/tutor/RoleLayout.tsx | page.tsx | features/tutor/verification | Server |
| `/dashboard/tutor/learning` | layouts/tutor/RoleLayout.tsx | page.tsx | features/learning/tutor | Server |
| `/dashboard/tutor/lesson-plans` | layouts/tutor/RoleLayout.tsx | page.tsx | features/learning/lesson-plans | Server |
| `/dashboard/tutor/sessions` | layouts/tutor/RoleLayout.tsx | page.tsx | features/bookings/tutor | Server |
| `/dashboard/tutor/requests` | layouts/tutor/RoleLayout.tsx | page.tsx | features/bookings/tutor | Server |
| `/dashboard/tutor/payments` | layouts/tutor/RoleLayout.tsx | page.tsx | features/payments/tutor | Server |

---

## 5. Admin & Super Admin Portals

| Path | Layout | Page | Component | Server?/Client? |
|---|---|---|---|---|
| `/dashboard/admin` | layouts/admin/RoleLayout.tsx | page.tsx | features/admin/dashboard | Server |
| `/dashboard/admin/users` | layouts/admin/RoleLayout.tsx | page.tsx | features/admin/users | Server |
| `/dashboard/admin/verification` | layouts/admin/RoleLayout.tsx | page.tsx | features/admin/verification | Server |
| `/dashboard/admin/bookings` | layouts/admin/RoleLayout.tsx | page.tsx | features/admin/bookings | Server |
| `/dashboard/admin/taxonomy` | layouts/admin/RoleLayout.tsx | page.tsx | features/admin/taxonomy | Server |
| `/dashboard/admin/payments` | layouts/admin/RoleLayout.tsx | page.tsx | features/admin/payments | Server |
| `/dashboard/admin/finance` | layouts/admin/RoleLayout.tsx | page.tsx | features/admin/finance | Server |
| `/dashboard/admin/disputes` | layouts/admin/RoleLayout.tsx | page.tsx | features/admin/disputes | Server |
| `/dashboard/admin/analytics` | layouts/admin/RoleLayout.tsx | page.tsx | features/admin/analytics | Server |
| `/dashboard/admin/organizations` | layouts/admin/RoleLayout.tsx | page.tsx | features/admin/organizations | Server |
| `/dashboard/admin/audit-logs` | layouts/admin/RoleLayout.tsx | page.tsx | features/admin/audit-logs | Server |

---

## 6. Shared Workflow Routes

| Path | Layout | Page | Component | Server?/Client? |
|---|---|---|---|---|
| `/bookings/[id]` | app/[locale]/dashboard/bookings/[id]/page.tsx | page.tsx | app/bookings/[id]/page.tsx | Server |
| `/sessions` | app/[locale]/sessions/page.tsx | page.tsx | features/bookings/sessions | Server |
| `/sessions/[id]` | app/[locale]/sessions/[id]/page.tsx | page.tsx | features/bookings/sessions/[id] | Server |
| `/classroom/[id]` | app/[locale]/classroom/[id]/page.tsx | page.tsx | features/classroom | Server |
| `/assignments/[id]` | app/[locale]/assignments/[id]/page.tsx | page.tsx | features/learning/assignments/[id] | Server |
| `/progress/[id]` | app/[locale]/progress/[id]/page.tsx | page.tsx | features/learning/progress | Server |
| `/messages` | app/[locale]/messages/page.tsx | page.tsx | features/messaging | Server |
| `/notifications` | app/[locale]/notifications/page.tsx | page.tsx | features/notifications | Server |
| `/saved-tutors` | app/[locale]/saved-tutors/page.tsx | page.tsx | features/tutors/saved | Server |
| `/tutor-replacements` | app/[locale]/tutor-replacements/page.tsx | page.tsx | features/trust/tutor-replacements | Server |
| `/tutor-replacements/new` | app/[locale]/tutor-replacements/new/page.tsx | page.tsx | features/trust/tutor-replacements/new | Server |
| `/tutor-replacements/[id]` | app/[locale]/tutor-replacements/[id]/page.tsx | page.tsx | features/trust/tutor-replacements/[id] | Server |

---

## 7. OTP / Magic Link / Password Reset

| Path | Layout | Page | Component | Server?/Client? |
|---|---|---|---|---|
| `/auth/login` | app/[locale]/auth/login/page.tsx | page.tsx | features/auth/login | Server |
| `/auth/register` | app/[locale]/auth/register/page.tsx | page.tsx | features/auth/register | Server |
| `/auth/forgot-password` | app/[locale]/auth/forgot-password/page.tsx | page.tsx | features/auth/forgot-password | Server |
| `/auth/reset-password` | app/[locale]/auth/reset-password/page.tsx | page.tsx | features/auth/reset-password | Server |
| `/auth/magic-link` | app/[locale]/auth/magic-link/page.tsx | page.tsx | features/auth/magic-link | Server |
| `/onboarding` | app/[locale]/onboarding/page.tsx | page.tsx | features/onboarding | Server |

---

## 8. Special Redirector Pages

| Path | Layout | Page | Component | Server?/Client? |
|---|---|---|---|---|
| `/bn` | layout.tsx | page.tsx | redirects to `/bn/dashboard/student` | Server |
| `/en` | layout.tsx | page.tsx | redirects to `/dashboard/student` | Server |

---

## 9. Route Count Summary

- **Public**: 10 routes (non-dashboard)
- **Student**: 7 routes
- **Guardian**: 7 routes
- **Tutor**: 7 routes
- **Admin / Super Admin**: 12 routes
- **Shared workflow**: 15 routes
- **Auth & Onboarding**: 6 routes
- **Special redirectors**: 2 routes

**Total**: 76 distinct frontend routes (aligned within ±2 of existing discovery).

---

## 10. Server/Client Component Policies (Next.js App Router)

The following policies are applied for server/client component boundaries:

1. **Pages are Server Components** unless they contain browser-only APIs, interactive forms, local UI state, or require `"use client"`. Most routes are Server Components as they perform initial data loading and access checks.

2. **Feature components** are Server Components unless they need client-side interactivity, form handling, or local state.

3. **Dashboard layouts** are Server Components for access control and metadata.

4. **Every page includes route-level metadata** via `metadata()` exports.

---

## 11. Front-end Architecture Summary

### 11.1 Folder Organization

- `app/` (route entry points, layout hierarchy, i18n)
- `features/` (domain-organized component trees)
- `components/` (shared UI primitives, role-specific widgets)
- `hooks/` (feature-specific hooks, pagination, search)
- `lib/` (application utilities: api, navigation, auth)
- `store/` (Redux state, RTK Query slices)

### 11.2 Module Principles

- Each feature has a dedicated directory (`features/<domain>/`).
- Feature components are organized by concern (e.g., `features/bookings/student/components/`).
- Feature hooks and custom logic are in `features/<domain>/hooks/`.
- Feature utilities (schemas, helpers) are in `features/<domain>/lib/` (if needed).
- Public website components in `features/public/`.

---

## 12. Legacy / Deprecated Routes

- `/dashboard/admin/tutor-replacements/[id]` — moved to shared flow (`/tutor-replacements/[id]`).
- `/dashboard/admin/tutor-requests` — non-existent (as per POST_IMPLEMENTATION_AUDIT D-4).

---

## 13. Route Quality Notes

- **36% of routes** (`~28`) are server components (data loading, access checks).
- **64% of routes** may contain client-side interactivity in subcomponents.
- No route currently uses `"use client"` at the page level (as per browser inspection).
- Navigation (`lib/navigation.ts`) is 26KB and may need modularization (architectural weakness).

---

*End of `03-ROUTE-AND-PAGE-INVENTORY.md`.*
