# Route & Page Inventory — UI/UX Refactor

**Date:** 2026-10-17
**Source of truth:** generated route list (`apps/web/src/app/**/page.tsx` + `layout.tsx`) plus `src/lib/route-policy.ts`.
**Totals:** **64 page routes**, **9 layouts**, 2 locales (`bn` default, `en`).

Legend for **Access**: `Public` = no auth required · `Auth` = any authenticated role · `Auth+` = role-restricted (see `ROLE_PERMISSION_MATRIX.md`) · `Group` = layout group (URL is unchanged by groups).

## 1. Layouts (9)

| #   | Layout file                                      | Applies to               | Provides                                                 |
| :-- | :----------------------------------------------- | :----------------------- | :------------------------------------------------------- |
| 1   | `src/app/layout.tsx`                             | root                     | `<html>` fonts, providers, metadata/PWA                  |
| 2   | `src/app/[locale]/layout.tsx`                    | all localized routes     | locale validation, i18n, `RequireAuth` boundaries switch |
| 3   | `src/app/[locale]/(public)/layout.tsx`           | marketing pages          | `Navbar` + `Footer` shell                                |
| 4   | `src/app/[locale]/(dashboard)/layout.tsx`        | cross-role feature pages | shared dashboard chrome (topbar/sidebar)                 |
| 5   | `src/app/[locale]/(admin)/layout.tsx`            | admin console group      | admin chrome + `ADMIN_FAMILY_ROLES` gate                 |
| 6   | `src/app/[locale]/dashboard/student/layout.tsx`  | student area             | role gate `student`                                      |
| 7   | `src/app/[locale]/dashboard/tutor/layout.tsx`    | tutor area               | role gate `tutor`                                        |
| 8   | `src/app/[locale]/dashboard/guardian/layout.tsx` | guardian area            | role gate `guardian`                                     |
| 9   | `src/app/[locale]/dashboard/admin/layout.tsx`    | admin dashboard area     | role gate admin-family (see Known Issue #1)              |

## 2. Public marketing — `(public)` group (13 pages)

| Route                    | Access | Page file                        | Notes                                           |
| :----------------------- | :----- | :------------------------------- | :---------------------------------------------- |
| `/{locale}`              | Public | `(public)/page.tsx`              | Landing: hero, tutors, how-it-works, trust, CTA |
| `/{locale}/tutors`       | Public | `(public)/tutors/page.tsx`       | Discovery list, filters, pagination             |
| `/{locale}/tutors/[id]`  | Public | `(public)/tutors/[id]/page.tsx`  | Tutor profile + booking CTA                     |
| `/{locale}/how-it-works` | Public | `(public)/how-it-works/page.tsx` | Process explainer                               |
| `/{locale}/pricing`      | Public | `(public)/pricing/page.tsx`      | Plans/pricing                                   |
| `/{locale}/safety`       | Public | `(public)/safety/page.tsx`       | Safety commitments                              |
| `/{locale}/faq`          | Public | `(public)/faq/page.tsx`          | FAQ accordion                                   |
| `/{locale}/contact`      | Public | `(public)/contact/page.tsx`      | Contact form (RHF+Zod)                          |
| `/{locale}/privacy`      | Public | `(public)/privacy/page.tsx`      | Legal                                           |
| `/{locale}/terms`        | Public | `(public)/terms/page.tsx`        | Legal                                           |

## 3. Auth, onboarding & account (8 pages)

| Route                       | Access                          | Page file                  | Notes                                   |
| :-------------------------- | :------------------------------ | :------------------------- | :-------------------------------------- |
| `/{locale}/login`           | Public (redirects if signed in) | `login/page.tsx`           | Auth shell, RHF+Zod                     |
| `/{locale}/register`        | Public (redirects if signed in) | `register/page.tsx`        | Role selection (student/tutor/guardian) |
| `/{locale}/forgot-password` | Public                          | `forgot-password/page.tsx` | Reset request                           |
| `/{locale}/magic-link`      | Public                          | `magic-link/page.tsx`      | Magic-link sign-in                      |
| `/{locale}/onboarding`      | Auth                            | `onboarding/page.tsx`      | Multi-step onboarding per role          |
| `/{locale}/profile`         | Auth                            | `profile/page.tsx`         | Profile & settings tabs                 |
| `/{locale}/notifications`   | Auth                            | `notifications/page.tsx`   | Notification center                     |
| `/{locale}` root redirect   | Public                          | `src/app/page.tsx`         | `/` → locale redirect (307)             |

## 4. Shared dashboard & feature pages — `(dashboard)` group (17 pages)

| Route                                                                | Access                       | Page file                     | Notes                        |
| :------------------------------------------------------------------- | :--------------------------- | :---------------------------- | :--------------------------- |
| `/{locale}/dashboard`                                                | Auth                         | `dashboard/page.tsx`          | Role-aware overview / router |
| `/{locale}/dashboard/student`                                        | Auth+ `student`              | `dashboard/student/page.tsx`  | Student home                 |
| `/{locale}/dashboard/student/sessions`                               | student                      | …                             | Session list                 |
| `/{locale}/dashboard/student/requests`                               | student                      | …                             | Tutor requests               |
| `/{locale}/dashboard/student/payments`                               | student                      | …                             | Payments                     |
| `/{locale}/dashboard/student/learning`                               | student                      | …                             | Learning hub                 |
| `/{locale}/dashboard/tutor`                                          | Auth+ `tutor`                | `dashboard/tutor/page.tsx`    | Tutor home                   |
| `/{locale}/dashboard/tutor/sessions`                                 | tutor                        | …                             | Sessions                     |
| `/{locale}/dashboard/tutor/requests`                                 | tutor                        | …                             | Requests                     |
| `/{locale}/dashboard/tutor/payments`                                 | tutor                        | …                             | Earnings/payouts             |
| `/{locale}/dashboard/tutor/learning`                                 | tutor                        | …                             | Learning materials           |
| `/{locale}/dashboard/tutor/verification`                             | tutor                        | …                             | KYC/verification             |
| `/{locale}/dashboard/guardian`                                       | Auth+ `guardian`             | `dashboard/guardian/page.tsx` | Guardian home                |
| `/{locale}/dashboard/guardian/children`                              | guardian                     | …                             | Child list                   |
| `/{locale}/dashboard/guardian/children/[studentId]`                  | guardian                     | …                             | Child detail                 |
| `/{locale}/dashboard/guardian/sessions`                              | guardian                     | …                             | Child sessions               |
| `/{locale}/dashboard/guardian/requests`                              | guardian                     | …                             | Requests                     |
| `/{locale}/dashboard/guardian/payments`                              | guardian                     | …                             | Payments                     |
| `/{locale}/dashboard/guardian/learning`                              | guardian                     | …                             | Learning                     |
| `/{locale}/sessions` · `/sessions/[id]`                              | Auth+ learner roles          | shared session views          |
| `/{locale}/requests`                                                 | Auth+ learner roles          | cross-role requests           |
| `/{locale}/learning`                                                 | Auth                         | learning index                |
| `/{locale}/payments` · `/payments/[id]`                              | Auth                         | payments index/detail         |
| `/{locale}/progress/[id]`                                            | Auth                         | progress report               |
| `/{locale}/safety-reports`                                           | Auth                         | safety reports                |
| `/{locale}/tutor-replacements`                                       | Auth                         | replacement queue             |
| `/{locale}/bookings/[id]` · `/bookings/[id]/pay`                     | Auth+ student/guardian/tutor | booking detail + checkout     |
| `/{locale}/dashboard/bookings/[id]` · `/dashboard/bookings/[id]/pay` | Auth                         | dashboard booking + checkout  |
| `/{locale}/tutor/bookings/[id]`                                      | Auth+ tutor                  | tutor booking view            |
| `/{locale}/assignments/[id]` · `/[id]/submissions`                   | Auth                         | assignment + submissions      |
| `/{locale}/classroom/[id]`                                           | Auth                         | live classroom (whiteboard)   |

## 5. Admin console (10 pages)

| Route                                    | Access              | Page file                    | Notes                    |
| :--------------------------------------- | :------------------ | :--------------------------- | :----------------------- |
| `/{locale}/admin`                        | Auth+ admin-family  | `(admin)/admin/page.tsx`     | Console home             |
| `/{locale}/analytics`                    | Auth+ admin-family  | `(admin)/analytics/page.tsx` | Platform analytics       |
| `/{locale}/dashboard/admin`              | Auth+ admin-family* | `dashboard/admin/page.tsx`   | Admin dashboard          |
| `/{locale}/dashboard/admin/users`        | admin-family*       | …                            | User management          |
| `/{locale}/dashboard/admin/bookings`     | admin-family*       | …                            | Bookings                 |
| `/{locale}/dashboard/admin/disputes`     | admin-family*       | …                            | Disputes                 |
| `/{locale}/dashboard/admin/verification` | admin-family*       | …                            | Tutor verification queue |
| `/{locale}/dashboard/admin/analytics`    | admin-family*       | …                            | Admin analytics          |
| `/{locale}/dashboard/admin/audit-logs`   | admin-family*       | …                            | Audit trail              |
| `/{locale}/dashboard/admin/settings`     | admin-family*       | …                            | Platform settings        |

\* Known issue #1: the `dashboard/admin/layout.tsx` allow-list currently excludes `support_agent`/`compliance_reviewer` while the route policy allows them — see `KNOWN_ISSUES.md`.

## 6. Smoke-test status

All 64 routes were loaded against the dev server (production build also passes); see `ROUTE_ACCEPTANCE_MATRIX.md` for per-route results. Every route returned HTTP 200 (the `/` redirect returns 307 by design; `/bn/bookings` without an id is a genuine 404).
