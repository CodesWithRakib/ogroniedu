# Route Acceptance Matrix — UI/UX Refactor

**Date:** 2026-10-17 · **Environment:** dev server `http://localhost:5000`, API `:4000`, Next.js 16.4.0 · **Method:** automated HTTP smoke of every route incl. dummy ids for dynamic segments; body scanned for `dark:`, `class="dark"`, dark slate backgrounds, Next error-page signature. Column **Dark** = dark-mode artifacts found in served HTML.

**Summary: all 64 page routes were exercised — every one returned HTTP 200 with 0 dark-mode hits and 0 error pages.** `/` returns 307 (locale redirect) and `/bn/bookings` without an id is a genuine 404 — both by design. English (`/en`, `/en/tutors`, `/en/login`, `/en/dashboard`) spot-checks also pass.

## Public marketing

| Route | HTTP | Dark | Notes |
| :--- | :-: | :-: | :--- |
| `/bn` | 200 | none | Landing |
| `/en` | 200 | none | English locale |
| `/bn/tutors` | 200 | none | Discovery |
| `/en/tutors` | 200 | none | |
| `/bn/tutors/demo-1` | 200 | none | Profile (dummy id) |
| `/bn/how-it-works` | 200 | none | |
| `/bn/pricing` | 200 | none | |
| `/bn/safety` | 200 | none | |
| `/bn/faq` | 200 | none | |
| `/bn/contact` | 200 | none | E2E also posts a real ticket |
| `/bn/privacy` | 200 | none | |
| `/bn/terms` | 200 | none | |
| `/` | 307 | none | Locale redirect by design |

## Auth / onboarding / account

| Route | HTTP | Dark | Notes |
| :--- | :-: | :-: | :--- |
| `/bn/login` · `/en/login` | 200 | none | |
| `/bn/register` | 200 | none | |
| `/bn/forgot-password` | 200 | none | |
| `/bn/magic-link` | 200 | none | |
| `/bn/onboarding` | 200 | none | Auth shell |
| `/bn/profile` | 200 | none | |
| `/bn/notifications` | 200 | none | |

## Dashboards (role areas + shared features)

| Route | HTTP | Dark | Notes |
| :--- | :-: | :-: | :--- |
| `/bn/dashboard` · `/en/dashboard` | 200 | none | |
| `/bn/dashboard/student` (+`/sessions`,`/requests`,`/payments`,`/learning`) | 200 ×5 | none | |
| `/bn/dashboard/guardian` (+`/children`,`/children/demo-1`,`/sessions`,`/requests`,`/payments`,`/learning`) | 200 ×7 | none | |
| `/bn/dashboard/tutor` (+`/sessions`,`/requests`,`/payments`,`/learning`,`/verification`) | 200 ×6 | none | |
| `/bn/dashboard/admin` (+`/users`,`/bookings`,`/disputes`,`/verification`,`/analytics`,`/audit-logs`,`/settings`) | 200 ×8 | none | |
| `/bn/sessions` · `/bn/sessions/demo-1` | 200 | none | |
| `/bn/requests` | 200 | none | |
| `/bn/learning` | 200 | none | |
| `/bn/payments` · `/bn/payments/demo-1` | 200 | none | |
| `/bn/progress/demo-1` | 200 | none | |
| `/bn/safety-reports` | 200 | none | |
| `/bn/tutor-replacements` | 200 | none | |
| `/bn/bookings/demo-1` · `/bn/bookings/demo-1/pay` | 200 | none | |
| `/bn/dashboard/bookings/demo-1` · `/bn/dashboard/bookings/demo-1/pay` | 200 | none | |
| `/bn/tutor/bookings/demo-1` | 200 | none | |
| `/bn/assignments/demo-1` · `…/submissions` | 200 | none | |
| `/bn/classroom/demo-1` | 200 | none | Whiteboard canvas colours intentional |

## Admin console

| Route | HTTP | Dark | Notes |
| :--- | :-: | :-: | :--- |
| `/bn/admin` | 200 | none | |
| `/bn/analytics` | 200 | none | Renders explicit empty state (no fabricated data) |

## Excluded / by-design non-200

| Route | HTTP | Reason |
| :--- | :-: | :--- |
| `/bn/bookings` (no id) | 404 | No such route; booking detail requires `[id]` — verified as a real Next.js 404 (not an error page) |

## Dynamic-segment caveat

Dynamic routes were probed with `demo-1`; the shells compile, render 200 with light tokens, and show their client-side loading/not-found states as designed. Data-dependent content (real booking/payment details) is exercised only by the credentialed E2E journeys (not run locally; see `TESTING_AND_ACCEPTANCE.md` §3).
