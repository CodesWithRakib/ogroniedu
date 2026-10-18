# OgroniEdu — Feature Flows (How Each Feature Works)

**Audience:** engineers, QA, and operations working on OgroniEdu.  
**Companion docs:** `FEATURE_TEST_CASES.md` (test case catalog), `UI_QA_RESULTS.md` (gate results), `ROUTE_AUDIT.md` (route-by-route status).

Every flow below is described as implemented in this repository: routes are real Next.js routes under `apps/web/src/app/[locale]/…`, endpoints are real controllers under `apps/api/src/modules/…` (all prefixed `/api/v1`), and every state name is a real enum from `packages/contracts`. Locale is a route prefix (`/bn` or `/en`); the app is Bengali-first, and all copy is resolved from `apps/web/messages/{bn,en}.json` or `getDictionary(locale)`.

Actor shorthand:

| Actor    | Role value(s)                          | Demo account (dev seed)       |
| -------- | -------------------------------------- | ----------------------------- |
| Student  | `student`                              | `student.demo@ogroniedu.com`  |
| Tutor    | `tutor`                                | `tutor.demo@ogroniedu.com`    |
| Guardian | `guardian`                             | `guardian.demo@ogroniedu.com` |
| Admin    | `admin`, `super_admin`                 | `admin.demo@ogroniedu.com`    |
| Staff    | `support_agent`, `compliance_reviewer` | (seeded on demand)            |

Dev password for all demo accounts: `OgroniDev#2026`.

---

## 1. Authentication & Session Security

**Actors:** everyone. **Entry:** `/[locale]/register`, `/[locale]/login`, `/[locale]/magic-link`, `/[locale]/forgot-password`, `/[locale]/profile` → Security tab.

**Personas / role selection.** Registration accepts the roles `student`, `guardian`, `tutor` (self-signup allow-list enforced server-side; `admin` and all staff roles can never self-register — `auth-hardening.utils.spec.ts` pins this).

**Password login flow**

1. `/login` (`LoginForm`, `use-login-form`) validates identifier (email or BD phone) + password client-side (Zod) before any request.
2. `POST /api/v1/auth/login` → on success sets an httpOnly refresh cookie and returns `{ user, accessToken, expiresIn }`.
3. `AuthBootstrap` hydrates the Redux `auth` slice; `RequireAuth`/`RequireRole` route guards read it; `route-policy.ts` maps path prefixes to allowed roles.
4. The access token lives only in memory. `base-api.ts` refreshes on 401 via `POST /auth/refresh` and retries once; refresh-token reuse revokes **all** sessions (replay detection, `auth.service.spec.ts`).
5. Logout (`POST /auth/logout`) clears the cookie and slice. Suspended/deactivated accounts fail the next request (`auth-guard-account-status.spec.ts`).

**Magic link / OTP flow**

1. `POST /auth/magic-link/request` — always returns a generic success (no account enumeration), stores only a hash of the token.
2. The emailed link opens `/magic-link?token=…`; `POST /auth/magic-link/consume` atomically consumes it (expired/consumed/unknown/race all rejected — `auth-magic-link.spec.ts`).
3. Password reset uses the same OTP provider chain; single-use reset ownership is enforced.

**Session security tab** (`/[locale]/profile` → Security)

- Lists active sessions; “revoke all” calls `POST /auth/revoke-all` and signs the user out everywhere.
- The e2e test `tutor.evidence.spec.ts` drives this tab end-to-end.

**Edge cases:** rate limit 5/min/login (429 surfaced in UI); open-redirect parameters rejected; Bengali/English error normalization via `normalizeUnknownError`.

**Verified by:** `auth-flow.spec.ts`, `auth-forms.spec.ts`, `auth-session-storage.spec.ts`, `route-policy.spec.ts`, `auth.controller.spec.ts`, `auth.service.spec.ts`, `auth-magic-link.spec.ts`, `auth.authorization.spec.ts`, `auth-guard-account-status.spec.ts`, `auth-bypass-guard.spec.ts`, `auth-hardening.utils.spec.ts`, `otp-delivery.spec.ts`, e2e `auth.guards.spec.ts`.

---

## 2. Tutor Discovery & Booking Requests

**Actors:** student/guardian (requesters), tutor (receiver), anonymous (public read).

**Flow A — public discovery**

1. `/[locale]/tutors` (`tutorSearchCatalog`) lists only tutors that are **published AND verified** (API `GET /api/v1/tutors/search` excludes anything else — `discovery.search.spec.ts` NEGATIVE test).
2. Filters (subject, level, mode, district, price, sort) are sent as query params; results carry an explainable match score (`scoreBreakdownModal`).
3. `/[locale]/tutors/[id]` renders the public profile — private contact fields are excluded by an explicit invariant (`public-website-and-seo.spec.ts`).

**Flow B — booking request**

1. From a tutor card (`request-tutoring-btn-*`) the booking modal opens (`BookingRequestModal`): student picker (guardians see their children), level, subject, mode, preferred days, notes. All pickers use the shared Radix `Select`.
2. Submit → `POST /api/v1/requests` with subject/level/mode/days/price snapshot.
3. The request lands in the recipient tutor's inbox: `/[locale]/requests` (`requests-page`), rows keyed `data-testid^="request-*"`.
4. Tutor responds via `POST /api/v1/requests/:id/respond` (accept/decline); requester can `POST /api/v1/requests/:id/withdraw`.
5. On accept, the booking becomes payable (see Payments flow).

**Edge cases:** duplicate open request to same tutor is rejected; withdrawn/accepted requests can’t be withdrawn again; the e2e journey withdraws prior open requests first so it is rerunnable.

**Verified by:** `tutor-discovery.spec.ts`, `discovery.search.spec.ts`, `bookings.service.spec.ts` (17), `bookings.controller.spec.ts`, e2e `journey.booking.spec.ts` (real Radix interactions).

---

## 3. Bookings & Sessions

**Actors:** student, tutor, guardian (view). **Entry:** `/bookings/[id]` (+ `/dashboard/bookings/[id]`, tutor mirror `/tutor/bookings/[id]`), `/sessions`, `/sessions/[id]`.

**Session lifecycle** (`SessionStatuses`): `scheduled → in_progress → completed`, or `cancelled` / `no_show` / `reschedule_pending`.

**Scheduling**

1. `/[locale]/sessions` shows the week calendar (`SessionScheduleCalendar`) fed by `GET /api/v1/sessions`.
2. “Schedule session” opens `scheduleModal`: booking picker (only backend-allowed statuses), date/time, meeting URL. Submissions hit `POST /api/v1/sessions` (or `POST /sessions/recurring` for series).
3. Overlap protection: the DB GiST constraint (`23P01`) + service `ConflictException` — a cancelled slot is immediately reusable (`CRITICAL INVARIANT` test).
4. The busy-slot endpoint returns availability **without** disclosing student identity.

**Session execution**

- Tutor: `POST /sessions/:id/start` → `in_progress`; `PATCH /sessions/:id/meeting-url`; `POST /sessions/:id/complete` → `completed`.
- `/[locale]/classroom/[id]` is the live workspace (see Learning & Classroom).

**Reschedule / cancel**

- `POST /sessions/:id/reschedule` sets `reschedule_pending` and requires the counterpart to accept.
- `POST /sessions/:id/cancel` returns a policy assessment: `>24 h = 100% refund`, `4–24 h = 80%`, `<4 h = 0%` (+80% tutor compensation on tutor cancellation). The cancellation policy version is stored on the booking so later policy changes don’t rewrite history.

**Edge cases:** timezone is always `Asia/Dhaka` in the UI; malformed assessment payloads are rejected in mappers (`session-mappers.spec.ts`).

**Verified by:** `scheduling.spec.ts`, `session-mappers.spec.ts`, `scheduling.service.spec.ts` (17), `sessions.controller.spec.ts` (10), e2e `journey.booking.spec.ts`.

---

## 4. Payments & Escrow

**Actors:** student/guardian (payer), tutor (payee), admin (ops). **Entry:** `/[locale]/payments`, `/payments/[id]`, `/bookings/[id]/pay`, tutor earnings at `/dashboard/tutor/payments`.

**Checkout flow**

1. After the tutor accepts, the booking detail shows a pay CTA → `/bookings/[id]/pay` (`PaymentCheckoutView`): method picker (bKash / Nagad / SSLCommerz sandbox), amount summary, ledger preview.
2. `POST /api/v1/payments/orders` creates a **pending** order with an idempotency key and returns the provider sandbox checkout URL (adapters: `BkashSandboxAdapter`, `SslcommerzSandboxAdapter`).
3. Provider callback → `POST /payments/webhook/:provider`. Guards in order: signature verification (HMAC-SHA256, timing-safe) → amount must equal the order → event idempotency. A verified webhook posts the double-entry escrow journal — **Debit 1000 Escrow Holding Pool / Credit 2100 Student Escrow Deposit** — and confirms the booking.
4. Dev/staging shortcut: `POST /payments/orders/:orderId/sandbox-confirm` replays the verified webhook path for a pending order (idempotent; an already-succeeded order short-circuits). Default provider fallback is `sslcommerz`.
5. `GET /payments/orders/:orderId/receipt` renders the official receipt (BDT format) on `/payments/[id]`; `GET /payments/orders` lists history.

**Settlement & payouts**

- After a session completes, `POST /payments/milestones/settle` releases the escrow: **92% tutor payable / 8% platform revenue** (balanced journal invariant).
- Tutor payout methods: `bkash | nagad | rocket | bank` (`tutor-earnings-page`).
- Refunds (`POST /payments/refunds`) are bounded by the paid balance; exceeding it is rejected.
- Admin reconciliation (`GET /payments/reconciliation`) matches orders↔transactions and flags discrepancies; ledger balance must equal debits − credits system-wide.

**Edge cases:** duplicate webhook ignored without double-posting; unrelated learner gets 403; already-paid booking can’t be paid again; invalid signature 401; amount mismatch 400.

**Verified by:** `payments.spec.ts`, `payments.controller.spec.ts`, `payments.service.spec.ts` (incl. new sandbox-confirm describe), `bkash.adapter.spec.ts` (new), `sslcommerz.adapter.spec.ts`, `ledger.service.spec.ts`, `idempotency.spec.ts`, `e2e-tutoring-lifecycle.spec.ts`, database `migration.spec.ts` ledger invariant.

---

## 5. Tutor Verification & KYC

**Actors:** tutor (submit), compliance reviewer/admin (decide). **Entry:** `/dashboard/tutor/verification`, admin queue `/dashboard/admin/verification`.

**Three-tier model** (`verification-policy.constants.ts`):

| Level           | Purpose               | Document types                                                        |
| --------------- | --------------------- | --------------------------------------------------------------------- |
| `identity`      | NID-backed identity   | `nid_front`, `nid_back`, `selfie_with_nid`                            |
| `educational`   | Academic credentials  | `academic_certificate`, `transcript`, `other_supporting`              |
| `institutional` | Professional standing | `professional_certificate`, `institution_letter`, `employment_letter` |

**Tutor flow**

1. Each level card (`verificationLevelCard`) shows status + allowed uploads. Upload goes to `POST /api/v1/files/upload-evidence` then `POST /tutors/me/verification/documents` (10 MB limit, MIME allow-list, PDF magic-byte check).
2. In any order, the tutor uploads documents, then `POST /tutors/me/verification/levels/:level/submit` sends the level to review (`submitted`/`under_review`).
3. Rejections can be reopened with `POST …/reopen` — capped at `MAX_LEVEL_RESUBMISSIONS = 2`.
4. Identity approval grants a default validity of 3650 days; expiry sweep + reminders at 30/7 days (`verification/sweep`).

**Admin flow**

1. Queue (`adminVerificationTab`): status/level/assignment filters (shared `NativeSelect`), case rows, “assign to me” (`POST …/assign`).
2. Dossier drawer (`GET /admin/tutors/:tutorId/review-dossier`): per-document viewer via signed `GET …/documents/:id/access`, document verify `PATCH …/documents/:id/verify`, qualification verify `PATCH …/qualifications/:id/verify`.
3. Decision via `POST …/levels/:level/decision` — options localized (Approved/Rejected/Information needed/Suspended/Reinstated). **Self-approval is denied even for admins** (`tutor-verification-dossier.spec.ts`).
4. Only after identity approval can a tutor be published to discovery; suspension depublishes (`tutors.service.spec.ts`).

**Verified by:** `tutor-verification.spec.ts`, `verification-dossier-ui.spec.ts` (12), `tutor-verification-dossier.spec.ts` (28), `tutor-qualification-evidence.spec.ts`, `files.service.spec.ts`, `security-and-privacy-hardening.spec.ts`, e2e `tutor.verification.spec.ts`, `tutor.evidence.spec.ts`, `admin.console.spec.ts`.

---

## 6. Learning & Classroom

**Actors:** tutor (author), student (learn), guardian (observe). **Entry:** `/[locale]/learning` (+ role mirrors), `/assignments/[id]`, `/assignments/[id]/submissions`, `/classroom/[id]`.

**Learning page**

1. Booking picker (shared `NativeSelect`) selects the active course; records load from `GET /api/v1/learning/bookings/:bookingId` (assignments, attendance, reports, progress reports).
2. Tabs: **Attendance** (tutor marks via `POST /learning/attendance`), **Assignments** (tutor creates via `POST /learning/assignments`; students submit via `POST …/assignments/:id/submissions`; tutor grades via `POST …/submissions/:id/grade` — score ≤ maxScore enforced, revisions audited), **Progress** (progress reports via `POST /learning/progress-reports`; `periodEnd` must follow `periodStart`).
3. Late submissions are auto-tagged; the grading modal shows the flag.

**Classroom** (`/classroom/[id]`)

- Bound to a session; tutor sees start/complete controls and meeting URL editor.
- `InteractiveWhiteboard` (canvas tools) + `ClassroomFormulasDrawer` (formula reference) + WhatsApp invite text with the classroom URL (`classroom.spec.ts`).

**Guardian observation:** an actively linked guardian may read the child summary (`GET /learning/students/:id/summary`); a revoked guardian gets 403 (`learning.service.spec.ts` NEGATIVE test).

**Verified by:** `learning.spec.ts`, `classroom.spec.ts`, `learning.controller.spec.ts` (10), `learning.service.spec.ts` (19), `e2e-tutoring-lifecycle.spec.ts` STAGE 3, database `migration.spec.ts` (`chk_progress_report_dates`).

---

## 7. Progress Tracking

**Actors:** student, tutor, guardian (read). **Entry:** `/progress/[id]`, dashboard widgets.

- ProgressGaugeCard / WeeklyActivityChart / StudyTimeTrackerCard render on the role dashboards (`student-dashboard-page`, `tutor-dashboard-page`, `guardian-dashboard-page`).
- Reports are produced by `POST /learning/progress-reports` from real records (sessions attended, assignments graded) — no fabricated metrics.
- `/progress/[id]` shows one report; numbers are formatted with Bengali numerals in `/bn`.

**Verified by:** `progress-tracking.spec.ts` (new — renders all three widgets incl. arc math and swimlane clamping), `learning.service.spec.ts` progress-report tests, `learning.controller.spec.ts`.

---

## 8. Trust & Safety (Reviews, Reports, SOS, Replacements)

**Actors:** student/guardian (report, review), tutor (reply), admin (triage). **Entry:** `/safety-reports`, `/tutor-replacements`, booking-scoped modals.

**Reviews**

1. Only participants of a **completed** booking may review (`POST /api/v1/reviews`); self-review and fake review are 403/400; duplicates 409 (`reviews.service.spec.ts`).
2. 5-star + criteria breakdown (`ReviewModal`, `starSelector`); toxic language gets flagged for moderation; tutor can reply once (`POST /reviews/:id/reply`); admin moderates (`PATCH /reviews/:id/moderate`).

**Safety reports**

1. `safetyReportModal`: category (child safety, harassment, fraud/billing, off-platform payment, other), severity, narrative; SOS variant (`EmergencySosModal`) surfaces national hotlines (1098/999).
2. `POST /api/v1/safety-reports`. Invariants: `child_safety` is escalated **urgent**; `critical` severity → urgent; the reported user cannot read the report; only admins can triage (`PATCH /safety-reports/:id`).

**Tutor replacement (guarantee)**

1. Within the guarantee window a student/guardian files `POST /api/v1/tutor-replacements` with a reason code; duplicate open cases and cancelled bookings are rejected; non-participants 403.
2. Case timeline `requested → matching → offered`; admin assigns a replacement; both parties get reassignment notifications.

**Verified by:** `trust-and-reviews.spec.ts` (7), `guardian-children.spec.ts`, `trust.controller.spec.ts`, `reviews.service.spec.ts` (12), `safety-reports.service.spec.ts` (8), `tutor-replacement.service.spec.ts` (11), `e2e-tutoring-lifecycle.spec.ts` STAGE 4–5.

---

## 9. Guardian & Multi-Child Management

**Actors:** guardian, student (consent), admin. **Entry:** `/dashboard/guardian`, `/dashboard/guardian/children`, `/dashboard/guardian/children/[studentId]`, role mirrors for requests/sessions/learning/payments.

1. Guardian adds a child (`POST /guardians/children`) or requests a link for an existing student (`POST /guardians/children/link-request`). Consent policy is versioned (`v1.0-bd-minor-consent`); minor relationships require recorded consent; self-link and duplicate links rejected.
2. The **student** approves via `POST /guardians/children/:linkId/verify`; only then does the link become `active` (`GET /guardians/children/:studentId` behind `GuardianStudentGuard`).
3. Child detail page tabs read the child’s real data: learning summary, requests, sessions, payments milestones. Unrelated guardians receive 403 (ABAC).
4. Revoke (`DELETE /guardians/children/:studentId`) writes an audit entry and immediately blocks read access.

**Verified by:** `guardian-children.spec.ts` (8), `guardians.controller.spec.ts`, `guardians.service.spec.ts` (11), `guardian-access.spec.ts`, `learning.service.spec.ts` guardian NEGATIVE, `role-dashboards.spec.ts` empty-state.

---

## 10. Notifications & Messaging

**Actors:** everyone. **Entry:** bell in the shell, `/[locale]/notifications`, booking chat on `/bookings/[id]`.

1. Realtime via Socket.IO (`/notifications` namespace); the gateway authenticates sockets and rejects unauthorized connections.
2. `NotificationBell` shows unread count (Bengali digits, cap `৯৯+`) and the live connection dot; `NotificationCenter` is the slide-over; the full page uses the feed hook.
3. `GET /notifications`, `GET /notifications/unread-count`, `PATCH /:id/read`, `POST /read-all`, preferences via `GET/PATCH /notifications/preferences` (dispatch respects user preferences — suppressed events are logged, not re-sent).
4. Booking chat: `POST/GET /bookings/:bookingId/messages` (cursor paginated, oldest→newest), read receipts `PATCH …/messages/:id/read`, PII redaction on malformed payloads.
5. Outbox worker retries failed external deliveries without harming committed business state.

**Verified by:** `notification-bell.spec.ts` (rewritten to render the real component), `communication.spec.ts`, `messaging.spec.ts`, `notification.dto.spec.ts` (19), `notification.service.spec.ts`, `notification-preferences.spec.ts`, `notification.authorization.spec.ts`, `notification.socket.spec.ts`, `booking-messages.spec.ts` (15), `outbox-worker.spec.ts`.

---

## 11. Profile & Settings

**Actors:** all authenticated. **Entry:** `/[locale]/profile` (tabs: personal, academic, guardian matrix, security), `/[locale]/onboarding`.

1. Personal tab → `PATCH /api/v1/users/me` (name, phone, locale).
2. Academic tab → student profile upsert (`PUT /users/me/student-profile`); minor status is computed server-side from date of birth.
3. Guardian matrix (`AutonomyMatrixCard`) controls guardian autonomy levels.
4. Security tab → active sessions + revoke-all (see §1).
5. Data rights: `GET /users/me/export` (structured export incl. sessions and family links, no hashes) and `POST /users/me/delete-account` — blocked while active tutoring bookings exist; otherwise `deletion_pending` + immediate session revocation.
6. Onboarding gate: `route-policy.ts` marks `/dashboard/**`, `/admin`, `/bookings`, `/requests`, `/tutor` as onboarding-gated; steps post to `POST /onboarding/steps/:stepKey`; the security acknowledgement maps to a boolean policy flag.

**Verified by:** `users.service.spec.ts` (7), `security-and-privacy-hardening.spec.ts` deletion/export cases, `onboarding.service.spec.ts` (13), `auth-session-storage.spec.ts`, e2e `tutor.evidence.spec.ts` (security tab).

---

## 12. Admin Console

**Actors:** `admin`, `super_admin` (some endpoints additionally super-admin-only). **Entry:** `/dashboard/admin/*` (legacy `/[locale]/admin?tab=` redirects).

1. **Overview** (`/dashboard/admin`): KPI strip from `GET /admin/dashboard` (pending verifications, replacement cases, safety reports, active bookings, registered users, ledger integrity). All captions localized.
2. **Users hub** → directory / students / tutors / admins pages; row actions open modals: suspend (`POST /admin/users/:id/suspend`), reactivate, roles (`PUT …/roles`, super_admin only — self-demotion and sole-super-admin removal are blocked), impersonation (`POST /admin/impersonation/start`, ≤15 min, audited, banner in UI).
3. **Verification queue** — see §5.
4. **Bookings** (`GET /admin/bookings`) with cancel + ledger refund (`POST /admin/bookings/:id/cancel`).
5. **Disputes** page hosts reconciliation + support triage tabs (`GET /admin/reconciliation`, `GET/PATCH /admin/support-tickets`; ticket creation is public but rate-limited 6/24 h per email).
6. **Taxonomy CRUD** (`/dashboard/admin/taxonomy`): education levels, curricula, streams, institutions, subjects — deletes are soft deactivations; duplicate codes 409 (`taxonomy.controller.spec.ts` — new).
7. **Settings hub** — general/security/notifications/finance/flags; `PUT /admin/settings/:key` and feature-flag flips are super-admin-only; secrets render redacted.
8. **Audit logs** (`GET /admin/audit-logs`): real timestamps (Date-preserving redaction), pagination boundaries tested.

**Verified by:** `admin-operations.spec.ts` ×2 (web 5 + api 19), `admin-operations.controller.spec.ts` (10), `support.spec.ts`, `support-tickets.spec.ts` (8), `pagination-boundary.spec.ts`, e2e `admin.console.spec.ts`.

---

## 13. Admin Analytics Portal

**Actors:** admin family (`/analytics`) + tutor self-view. **Entry:** `/[locale]/analytics`, `/dashboard/admin/analytics`.

1. Window selector → `GET /api/v1/analytics/overview | financials | tutors | retention` (ADMIN_ROLES) or `GET /analytics/tutors/me` (tutor).
2. KPI grid, trends, funnel, integrity cards; math pinned by tests (exact metric formulas, zero-division safety, gateway breakdown reconciliation with the ledger).
3. CSV export builds deterministic rows from real payloads (`analytics-data.spec.ts`).
4. Invalid ISO ranges are rejected; retention avoids double counting.

**Verified by:** `analytics.spec.ts`, `analytics-data.spec.ts`, `analytics.controller.spec.ts` (9), `analytics.service.spec.ts` (9), database view `v_operational_daily_metrics`.

---

## 14. Public / Marketing Site

**Actors:** anonymous. **Entry:** `/[locale]` + how-it-works, pricing, safety, contact, faq, privacy, terms, tutors.

1. Home: hero + search (hands off to tutor discovery), live platform stats band (`GET /api/v1/public/stats`, rounded rating, sanitized).
2. Pricing: interactive calculator (client-side math, no fake promises).
3. Contact: public ticket form (`POST /api/v1/support/tickets`, guest allowed) → reference shown; `GET /support/tickets/mine` lists own tickets.
4. FAQ: accordion browser; legal pages are static.
5. SEO: bilingual `sitemap.xml` covering all public routes, `robots.txt` disallowing admin/portal paths; private tutor fields excluded from public payloads.

**Verified by:** `public-website-and-seo.spec.ts`, `i18n.spec.ts`, `public-stats.spec.ts`, `support-tickets.spec.ts`, e2e `smoke.public.spec.ts`, `responsive.matrix.spec.ts` (20 runs), `keyboard.a11y.spec.ts`.

---

## Cross-cutting rules (apply to every flow)

1. **Access control** is twofold: client route gates (`route-policy.ts`, `RequireRole`) and authoritative server guards (`AuthGuard`, `RolesGuard`, `GuardianStudentGuard`). A UI gate never substitutes for a server check.
2. **No fabricated data:** every list, KPI, and dashboard value comes from an API response; empty states render `EmptyState` in both locales.
3. **Statuses** use the shared vocabularies: sessions `scheduled|in_progress|completed|cancelled|no_show|reschedule_pending`; verification `not_started|submitted|under_review|needs_information|approved|rejected|suspended|expired`; replacement cases `requested|matching|offered`.
4. **Money** is integer poisha end-to-end; the ledger journal must balance (debits = credits) on every posting.
5. **Audit & idempotency:** admin/privileged actions record audit entries; payment order creation, webhook processing, and journal posting are all idempotent.
