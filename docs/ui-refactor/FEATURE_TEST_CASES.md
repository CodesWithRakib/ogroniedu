# OgroniEdu — Feature Test Cases & Coverage Matrix

**Companion docs:** `FEATURE_FLOWS.md` (how each feature works), `UI_QA_RESULTS.md` (executed gate results), `UI_REFACTOR_PROGRESS.md` (change log).

This document catalogs the test cases that prove each feature flow works. Every **Automated** row names the real spec file and (where useful) the exact test name; run them with the commands in §1. Rows marked **Manual** have a written procedure; rows marked **Live** are verified against the running stack.

---

## 1. How to run the suites

| Layer                | Command (repo root)                                                                          | Scope                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Web unit/component   | `pnpm --filter @ogroniedu/web test`                                                          | 31 files · 188 tests — components, hooks, contracts, i18n parity            |
| API unit/integration | `pnpm --filter @ogroniedu/api test`                                                          | 63 files · 616 tests — services, controllers, guards, ledger, adapters      |
| Database             | `pnpm --filter @ogroniedu/database test`                                                     | migrations + invariants (ledger balance, constraints, BCDR drill)           |
| E2E (anonymous)      | `pnpm --filter @ogroniedu/web e2e`                                                           | public smoke, responsive matrix, keyboard a11y, auth guards                 |
| E2E (credentialed)   | set `E2E_BASE_URL`, `E2E_API_URL`, `E2E_STUDENT_/TUTOR_/ADMIN_EMAIL+PASSWORD` then run e2e   | booking journey, tutor verification/evidence, admin console, session revoke |
| Typecheck / Lint     | `pnpm --filter @ogroniedu/web typecheck && pnpm --filter @ogroniedu/web lint` (same for api) | static gates                                                                |

Credentialed E2E must never silently pass: `scripts/check-e2e-skips.mjs` fails CI when credentialed specs are reported skipped.

---

## 2. Test case catalog

### TC-AUTH — Authentication & Session Security

| ID         | Scenario              | Steps                                        | Expected                                                    | Automation                                                            |
| ---------- | --------------------- | -------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| TC-AUTH-01 | Register validation   | Submit register form with bad phone/password | Inline Bengali errors, zero network calls                   | `auth-forms.spec.ts` (`validateRegisterFields…`, `validatePassword…`) |
| TC-AUTH-02 | Invalid login         | `login rejects bad credentials`              | Visible error, stays on `/login`                            | e2e `auth.guards.spec.ts`                                             |
| TC-AUTH-03 | Rate limit            | 6 logins/min                                 | 429 RATE_LIMITED surfaced, test helper retries after window | `auth.authorization.spec.ts`, e2e `support/login.ts`                  |
| TC-AUTH-04 | Refresh replay attack | Reuse an already-rotated refresh token       | ALL user sessions revoked                                   | `auth.service.spec.ts` (`SECURITY REPLAY ATTACK…`)                    |
| TC-AUTH-05 | Suspended account     | Suspend user, call any API with old token    | 401/403 immediately                                         | `auth-guard-account-status.spec.ts` (8)                               |
| TC-AUTH-06 | Revoke all sessions   | Profile → Security tab → বাতিল → confirm     | Lands signed out; refresh fails                             | e2e `tutor.evidence.spec.ts`                                          |
| TC-AUTH-07 | Magic link single-use | Consume token twice                          | Second consume rejected; no enumeration on request          | `auth-magic-link.spec.ts` (11)                                        |
| TC-AUTH-08 | Self-signup roles     | Attempt register as `admin`                  | Rejected — only student/guardian/tutor allowed              | `auth-hardening.utils.spec.ts`                                        |

### TC-DISC — Tutor Discovery & Booking Request

| ID         | Scenario                   | Steps                                                                                            | Expected                                           | Automation                      |
| ---------- | -------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------- |
| TC-DISC-01 | Search privacy             | `GET /tutors/search`                                                                             | Published+verified only, no private contact fields | `discovery.search.spec.ts`      |
| TC-DISC-02 | Unpublished tutor excluded | Unpublish a tutor, search                                                                        | Tutor absent (NEGATIVE)                            | `discovery.search.spec.ts`      |
| TC-DISC-03 | Filters & ranking          | Keyword/mode/district/subject + price sort                                                       | Deterministic ordering, explainable score          | `discovery.search.spec.ts`      |
| TC-DISC-04 | Booking request journey    | Login as student → `/bn/tutors` → card CTA → pick level + subject (Radix) → day → notes → submit | Modal closes; request exists for tutor             | e2e `journey.booking.spec.ts`   |
| TC-DISC-05 | Tutor inbox                | Login as tutor → `/bn/requests`                                                                  | Request list visible                               | e2e `journey.booking.spec.ts`   |
| TC-DISC-06 | Withdraw request           | Open request → withdraw                                                                          | Status withdrawn; cannot re-withdraw               | `bookings.service.spec.ts` (17) |

### TC-BOOK — Bookings & Sessions

| ID         | Scenario                | Steps                                         | Expected                                     | Automation                                                                       |
| ---------- | ----------------------- | --------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| TC-BOOK-01 | Schedule session        | Sessions page → schedule modal → booking+time | Session `scheduled`, appears on calendar     | `sessions.controller.spec.ts`                                                    |
| TC-BOOK-02 | Overlap conflict        | Schedule into an occupied slot                | Conflict error; DB GiST raised               | `scheduling.service.spec.ts`                                                     |
| TC-BOOK-03 | Cancelled slot reusable | Cancel then rebook same slot                  | Succeeds (CRITICAL INVARIANT)                | `scheduling.service.spec.ts`                                                     |
| TC-BOOK-04 | Refund tiers            | Cancel >24 h / 4–24 h / <4 h                  | 100% / 80% / 0% assessment returned verbatim | `scheduling.service.spec.ts`, `session-mappers.spec.ts`                          |
| TC-BOOK-05 | Busy slots privacy      | Query tutor busy slots                        | No student identity disclosed                | `scheduling.service.spec.ts`                                                     |
| TC-BOOK-06 | Lifecycle transitions   | start → complete via API                      | `scheduled → in_progress → completed` only   | `sessions.controller.spec.ts`, `classroom.spec.ts` (`session transition states`) |

### TC-PAY — Payments & Escrow

| ID        | Scenario             | Steps                                               | Expected                                                                                            | Automation                                                                        |
| --------- | -------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TC-PAY-01 | Create order         | `POST /payments/orders` (sandbox)                   | Pending order + sandbox checkout URL                                                                | `payments.service.spec.ts`                                                        |
| TC-PAY-02 | Idempotency          | Repeat create with same key                         | Same order returned, no duplicate                                                                   | `payments.service.spec.ts`, `idempotency.spec.ts`                                 |
| TC-PAY-03 | Webhook verification | Valid HMAC → succeeded                              | Escrow journal posted (1000 debit / 2100 credit), booking confirmed                                 | `payments.service.spec.ts` (FINANCIAL INVARIANT)                                  |
| TC-PAY-04 | Tampered webhook     | Bad signature / wrong amount                        | 401 / 400, nothing posted                                                                           | `payments.service.spec.ts`, `sslcommerz.adapter.spec.ts`, `bkash.adapter.spec.ts` |
| TC-PAY-05 | Duplicate webhook    | Same event id twice                                 | Ignored, no double posting                                                                          | `payments.service.spec.ts` (IDEMPOTENCY)                                          |
| TC-PAY-06 | Sandbox confirm      | `POST /orders/:id/sandbox-confirm` on pending order | Verified through webhook pipeline; provider fallback `sslcommerz`; already-succeeded short-circuits | `payments.service.spec.ts` Sandbox Confirmation Pipeline (new)                    |
| TC-PAY-07 | Settlement split     | Settle completed milestone                          | 92% tutor payable / 8% platform revenue, balanced journal                                           | `payments.service.spec.ts`, `ledger.service.spec.ts`                              |
| TC-PAY-08 | Refund bound         | Refund > paid balance                               | Rejected 400                                                                                        | `payments.service.spec.ts`                                                        |
| TC-PAY-09 | Receipt              | `GET /orders/:id/receipt`                           | BDT formatted receipt for owner only                                                                | `payments.service.spec.ts`, `payments.controller.spec.ts`                         |
| TC-PAY-10 | Reconciliation       | Succeeded order without transaction                 | Flagged as discrepancy                                                                              | `payments.service.spec.ts`                                                        |

### TC-VERIF — Tutor Verification & KYC

| ID          | Scenario               | Steps                                             | Expected                                           | Automation                                                              |
| ----------- | ---------------------- | ------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| TC-VERIF-01 | Upload evidence        | Tutor uploads NID front/back                      | Stored, awaits approval                            | e2e `tutor.evidence.spec.ts`                                            |
| TC-VERIF-02 | Submit gate            | Submit without all required docs                  | Submit disabled/blocked                            | `verification-dossier-ui.spec.ts`, `tutor-verification-dossier.spec.ts` |
| TC-VERIF-03 | Reviewer queue actions | Hides applicant actions while in review           | Cards mirror server status                         | e2e `tutor.verification.spec.ts`                                        |
| TC-VERIF-04 | Admin approval         | Admin verifies both NID sides → decision Approved | Identity level approved, tutor publishable         | e2e `admin.console.spec.ts`                                             |
| TC-VERIF-05 | Self-approval denial   | Reviewer approves own dossier                     | Denied even for admin                              | `tutor-verification-dossier.spec.ts`                                    |
| TC-VERIF-06 | Resubmission cap       | Reject → reopen ×3                                | 3rd blocked (MAX 2)                                | `tutor-verification-dossier.spec.ts`                                    |
| TC-VERIF-07 | File hardening         | Oversize / MIME-spoofed / traversal uploads       | All rejected                                       | `files.service.spec.ts`, `security-and-privacy-hardening.spec.ts`       |
| TC-VERIF-08 | Expiry sweep           | Identity approval +3650 days                      | Expired → discovery eligibility denied + reminders | `tutor-verification-dossier.spec.ts`                                    |

### TC-LEARN — Learning & Classroom

| ID          | Scenario             | Steps                                                 | Expected                             | Automation                                          |
| ----------- | -------------------- | ----------------------------------------------------- | ------------------------------------ | --------------------------------------------------- |
| TC-LEARN-01 | Attendance           | Tutor marks attendance                                | Record created; visible on tabs      | `learning.service.spec.ts`                          |
| TC-LEARN-02 | Homework loop        | Assign → student submits → tutor grades               | Grade stored; late flag correct      | `e2e-tutoring-lifecycle.spec.ts` STAGE 3            |
| TC-LEARN-03 | Score bounds         | Grade > maxScore                                      | 400                                  | `learning.service.spec.ts`                          |
| TC-LEARN-04 | Grade revision audit | Regrade a submission                                  | Audit trail entry                    | `learning.service.spec.ts` (`SCORE REVISION AUDIT`) |
| TC-LEARN-05 | Progress dates       | periodEnd before periodStart                          | 400 + DB `chk_progress_report_dates` | `learning.service.spec.ts`, `migration.spec.ts`     |
| TC-LEARN-06 | Guardian summary     | Active guardian reads child summary; revoked guardian | 200 / 403                            | `learning.service.spec.ts`                          |
| TC-LEARN-07 | Classroom widget     | Whiteboard + formulas + invite text                   | Renders and binds session            | `classroom.spec.ts`                                 |

### TC-PROG — Progress Tracking

| ID         | Scenario            | Steps                                       | Expected                                          | Automation                        |
| ---------- | ------------------- | ------------------------------------------- | ------------------------------------------------- | --------------------------------- |
| TC-PROG-01 | Gauge arc math      | Render ProgressGaugeCard at 0/74/100%       | dashoffset matches semicircle math; labels render | `progress-tracking.spec.ts` (new) |
| TC-PROG-02 | Weekly bars         | Custom data incl. out-of-range values       | Heights clamped 15–100%; peak tooltip             | `progress-tracking.spec.ts` (new) |
| TC-PROG-03 | Study timer         | Initial render                              | 01:24:08 + accessible controls                    | `progress-tracking.spec.ts` (new) |
| TC-PROG-04 | Report from records | Generate report from real attendance/grades | Metrics computed from DB, never hardcoded         | `learning.service.spec.ts`        |

### TC-TRUST — Trust & Safety

| ID          | Scenario                  | Steps                                                    | Expected                                                 | Automation                               |
| ----------- | ------------------------- | -------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| TC-TRUST-01 | Review eligibility        | Non-participant / self / duplicate / unconfirmed booking | 403 / 403 / 409 / 400                                    | `reviews.service.spec.ts` (12)           |
| TC-TRUST-02 | Review reply + moderation | Tutor replies twice; admin moderates                     | Second reply blocked; moderation audited                 | `reviews.service.spec.ts`                |
| TC-TRUST-03 | Child-safety escalation   | File `child_safety` report                               | Urgent escalation invariant                              | `safety-reports.service.spec.ts`         |
| TC-TRUST-04 | Report visibility         | Reported user tries to read report                       | 403; admins only                                         | `safety-reports.service.spec.ts`         |
| TC-TRUST-05 | Replacement eligibility   | Non-participant / cancelled booking / duplicate          | 403 / 400 / 400                                          | `tutor-replacement.service.spec.ts` (11) |
| TC-TRUST-06 | Replacement timeline      | Request → matching → offered                             | Notifications to both parties                            | `tutor-replacement.service.spec.ts`      |
| TC-TRUST-07 | Modals i18n/render        | Open SOS / safety / replacement / review modals          | Hotlines, categories, reason codes, star selector render | `trust-and-reviews.spec.ts` (7)          |

### TC-GUARD — Guardian & Multi-Child

| ID          | Scenario                | Steps                                             | Expected                                                     | Automation                                             |
| ----------- | ----------------------- | ------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| TC-GUARD-01 | Add child               | Guardian registers child with consent             | Link `active` after policy version recorded                  | `guardians.service.spec.ts`                            |
| TC-GUARD-02 | Link request + consent  | Existing student approves link                    | Only then `active`; self-link rejected                       | `guardians.service.spec.ts`, e2e manual fallback       |
| TC-GUARD-03 | ABAC                    | Unrelated guardian reads child                    | 403                                                          | `guardian-access.spec.ts`, `guardians.service.spec.ts` |
| TC-GUARD-04 | Revoke                  | `DELETE /guardians/children/:id`                  | Access blocked immediately + audit                           | `guardians.service.spec.ts`                            |
| TC-GUARD-05 | Child safety categories | Contract check                                    | `child_safety`, `harassment`, `off_platform_payment` present | `guardian-children.spec.ts`                            |
| TC-GUARD-06 | Child detail page       | Guardian opens `/dashboard/guardian/children/:id` | Tabs read child data; 403 for strangers                      | Manual (route sweep) + API tests                       |

### TC-NOTIF — Notifications & Messaging

| ID          | Scenario                | Steps                                        | Expected                               | Automation                                              |
| ----------- | ----------------------- | -------------------------------------------- | -------------------------------------- | ------------------------------------------------------- |
| TC-NOTIF-01 | Bell badge              | unread 25 / 150 / 0 in bn+en                 | `২৫`, `৯৯+`, hidden at 0; aria labels  | `notification-bell.spec.ts` (rewritten, real component) |
| TC-NOTIF-02 | Live socket             | Unauthorized socket connect                  | Rejected; authorized joins room        | `notification.socket.spec.ts`                           |
| TC-NOTIF-03 | Preferences suppression | Disable event type, dispatch                 | Suppressed (logged, not sent)          | `notification-preferences.spec.ts`                      |
| TC-NOTIF-04 | Chat pagination         | Cursor page oldest→newest, malformed payload | Parsed safely, PII redaction           | `messaging.spec.ts`, `booking-messages.spec.ts` (15)    |
| TC-NOTIF-05 | Outbox retry            | Force provider timeout                       | Business state intact; retry scheduled | `outbox-worker.spec.ts`                                 |

### TC-PROF — Profile & Settings

| ID         | Scenario        | Steps                                 | Expected                                    | Automation                               |
| ---------- | --------------- | ------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| TC-PROF-01 | Personal update | PATCH `/users/me`                     | Persisted; locale switch works              | `users.service.spec.ts`                  |
| TC-PROF-02 | Academic upsert | PUT student-profile                   | Upsert + minor status computed              | `users.service.spec.ts`                  |
| TC-PROF-03 | Export          | GET `/users/me/export`                | Structured, incl. sessions/links, no hashes | `security-and-privacy-hardening.spec.ts` |
| TC-PROF-04 | Delete blocked  | Delete account with active booking    | Rejected                                    | `security-and-privacy-hardening.spec.ts` |
| TC-PROF-05 | Delete allowed  | Delete with no active bookings        | `deletion_pending`, sessions revoked        | `users.service.spec.ts`                  |
| TC-PROF-06 | Onboarding gate | Access `/dashboard` before onboarding | Redirect to onboarding; step posts accepted | `onboarding.service.spec.ts` (13)        |

### TC-ADMIN — Admin Console

| ID          | Scenario             | Steps                                      | Expected                                                      | Automation                                                 |
| ----------- | -------------------- | ------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------- |
| TC-ADMIN-01 | Suspend / reactivate | Users directory → suspend → reactivate     | Status flips; tokens invalid while suspended                  | e2e `admin.console.spec.ts`, `admin-operations.spec.ts` ×2 |
| TC-ADMIN-02 | Self-suspension      | Admin suspends self                        | Denied                                                        | `admin-operations.spec.ts`                                 |
| TC-ADMIN-03 | Roles change         | super_admin grants `support_agent`         | Works; admin (non-super) gets 403; sole super_admin protected | `admin-operations.controller.spec.ts`                      |
| TC-ADMIN-04 | Impersonation        | Start ≤15 min                              | Banner shown; audit entry; blocked in production guard        | `admin-operations.spec.ts`, `auth-bypass-guard.spec.ts`    |
| TC-ADMIN-05 | Cancelling a booking | Cancel + refund                            | Booking cancelled, ledger refund posted                       | `admin-operations.spec.ts`                                 |
| TC-ADMIN-06 | Taxonomy CRUD        | Create duplicate code; update; soft delete | 409 / partial update / deactivate + message                   | `taxonomy.controller.spec.ts` (new, 16)                    |
| TC-ADMIN-07 | Settings & flags     | Non-super admin flips flag                 | 403; secrets redacted in GET                                  | `admin-operations.spec.ts`                                 |
| TC-ADMIN-08 | Audit log paging     | Page beyond boundary                       | Correct empty page, real timestamps                           | `pagination-boundary.spec.ts`, live check                  |
| TC-ADMIN-09 | Support tickets      | Guest creates 6 tickets/24 h               | 6th → 429                                                     | `support-tickets.spec.ts` (8)                              |

### TC-ANALYTICS — Admin Analytics

| ID       | Scenario              | Steps                                   | Expected                        | Automation                     |
| -------- | --------------------- | --------------------------------------- | ------------------------------- | ------------------------------ |
| TC-AN-01 | Access matrix         | student/tutor/admin call `/analytics/*` | 403 / tutor self only / 200     | `analytics.controller.spec.ts` |
| TC-AN-02 | Metric math           | Known fixtures incl. zero-division      | Exact expected values           | `analytics.service.spec.ts`    |
| TC-AN-03 | Ledger reconciliation | Gateway breakdown vs ledger             | Matched totals                  | `analytics.service.spec.ts`    |
| TC-AN-04 | Export rows           | Build CSV rows                          | Deterministic from real payload | `analytics-data.spec.ts`       |

### TC-PUB — Public Site

| ID        | Scenario           | Steps                  | Expected                                     | Automation                                |
| --------- | ------------------ | ---------------------- | -------------------------------------------- | ----------------------------------------- |
| TC-PUB-01 | Home hero + stats  | Open `/bn`             | Hero, search, stats band (real API or empty) | e2e `smoke.public.spec.ts`                |
| TC-PUB-02 | Contact ticket     | Submit contact form    | Reference shown; ticket stored               | e2e `smoke.public.spec.ts`                |
| TC-PUB-03 | Responsive matrix  | 5 viewports × 4 routes | No overflow, nav usable                      | e2e `responsive.matrix.spec.ts` (20 runs) |
| TC-PUB-04 | Keyboard skip link | Tab from top           | Focus jumps to main content                  | e2e `keyboard.a11y.spec.ts`               |
| TC-PUB-05 | SEO                | sitemap + robots       | All public routes × bn/en; admin disallowed  | `public-website-and-seo.spec.ts`          |
| TC-PUB-06 | i18n parity        | bn/en message keys     | 100% parity for all namespaces               | `i18n.spec.ts`, per-feature parity tests  |

---

## 3. Route render verification (visual sweep)

Every route is loaded in the real app with real seeded data (desktop 1440×900; hub/table pages also tablet 834×1112; core flows also mobile 390×844). Each load asserts: no console errors, no failed API responses, no uncaught page errors, no horizontal overflow, no Next.js error overlay, no unexpected visible box-shadows, ≤1 H1, no unnamed visible controls, and no raw native selects outside the shared component. Results and screenshot paths are recorded in `UI_QA_RESULTS.md` §7.

---

## 4. Manual test procedures for uncovered surfaces

These flows have API/unit coverage but no browser automation yet; run them manually before release (or promote to e2e):

1. **Guardian child detail** — login `guardian.demo@`, open `/bn/dashboard/guardian/children/<studentId>` (id from `GET /api/v1/guardians/children`), confirm tabs (overview/learning/sessions/payments) render the child’s real data and PDF/photo access respects link status.
2. **Profile tabs (bn + en)** — `/bn/profile`: personal save round-trip, academic upsert, guardian matrix toggles, security revoke (already e2e for revoke).
3. **Payment checkout happy path in UI** — `/bn/bookings/<id>/pay` with a pending booking: choose bKash → sandbox URL opens; use `POST /payments/orders/:id/sandbox-confirm` to settle and confirm `/bn/payments` shows the order + receipt.
4. **Learning tabs** — as tutor create assignment, submit as student, grade, and confirm attendance + progress tabs update (mirrors `e2e-tutoring-lifecycle` API stages through the UI).
5. **Safety report → admin triage** — file via booking page modal, then `/bn/dashboard/admin/disputes` triage and timeline.
6. **Notifications center** — trigger a session reminder, confirm bell badge increments live and the center marks read.
7. **Admin settings sub-pages** — general/security/notifications/finance/flags each save via super-admin and reject non-super.
8. **Taxonomy admin** — add/rename/deactivate a subject and level; confirm public dropdowns reflect it immediately.

## 5. Coverage gaps (tracked, not hidden)

| Area                       | Gap                                                                                 | Mitigation                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Bookings UI                | `scheduleModal` / `rescheduleModal` / `cancelModal` / `sessionCard` not unit-tested | API invariants cover the logic; route sweep covers render; promote to component tests when time allows |
| Payments UI                | `checkoutMethodPicker/Summary/Ledger`, `paymentReceipt`, tutor payouts UI untested  | Manual procedure §4.3; API tests cover all money math                                                  |
| Profile UI                 | only security tab exercised (e2e)                                                   | Manual procedure §4.2                                                                                  |
| Guardian pages             | no browser e2e                                                                      | Manual procedure §4.1 + API ABAC tests                                                                 |
| Notifications center/toast | no component test for the slide-over                                                | manual §4.6; provider/gateway covered                                                                  |
| Learning tabs UI           | logic covered by API + mappers                                                      | manual §4.4                                                                                            |
| E2E `diag.spec.ts`         | diagnostic only (tautological assert)                                               | excluded from pass counts; kept for debugging                                                          |
