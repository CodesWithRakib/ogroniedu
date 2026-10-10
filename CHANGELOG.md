# Changelog

## 1.14.0 — Phase 14 Admin Operations, Least Privilege & Privileged Governance

- **Definition of Done Enforced — All privileged operations least-privileged and audited:**
  - Strict RBAC separation across `support_agent`, `compliance_reviewer`, `admin`, and `super_admin` via NestJS `RolesGuard`.
  - Non-privileged access strictly denied (`403 ForbiddenException` for regular students, guardians, tutors).
  - General `admin` accounts denied access to super-admin operations (`role management`, `system settings`, `feature flags`, `impersonation`).
- **Database Schema & Migrations:**
  - Migration `007_admin_and_operations.sql` introducing `system_settings` and `feature_flags` tables.
  - Seeded default system settings (`platform_fee_percent`, `cancellation_window_hours`, `replacement_guarantee_trial_hours`, `impersonation_max_minutes`).
  - Seeded default feature flags (`emergency_maintenance_mode`, `instant_replacement_matching`, `strict_pnr_verification`).
  - Created TypeORM entities: `SystemSettingEntity`, `FeatureFlagEntity`.
- **Operational Dashboard & Verification Queues:**
  - Centralized real-time overview displaying queue depths:
    - Pending tutor verification dossiers.
    - Active tutor replacement guarantee cases.
    - Open trust and child safety abuse reports.
    - Active tutoring bookings count.
    - Total registered user accounts catalog.
    - System ledger integrity balance status.
- **User Management, Suspension Controls & Dossiers:**
  - Search and filter users by display name, email, phone, role, and status.
  - User Dossier API combining contact verification timestamps, active/revoked roles, booking totals, and sanitized audit history.
  - Account Suspension: Mandatory operational justification string (`reason`). Hard-coded self-suspension denial and protection preventing general admins from suspending super-admins.
  - Account Reactivation: Instant reactivation with audit logging.
  - Role Management: Restricted strictly to `super_admin`. Validates against platform role catalog and protects the sole remaining super_admin from demotion.
- **Emergency Administrative Booking Cancellation & Escrow Reversal:**
  - Emergency intervention capability allowing operations staff to cancel any booking upon safety/fraud breach.
  - Optional automatic escrow reversal: locates succeeded payment orders and issues ledger refund reversal via `PaymentsService.processRefund()`.
  - Records privileged action audit log: `admin.booking.emergency_cancelled`.
- **Financial Reconciliation Visibility:**
  - Extended `LedgerService.runReconciliation()`:
    - Mathematical balance invariant check: Debits === Credits across all entries.
    - Per-account balance audit for cash gateway settlements, student escrow holdings, tutor payables, and platform commission revenues.
    - Detects and alerts on any discrepancy.
    - Writes `admin.ledger.reconciliation_inspected` audit trail.
- **System Settings & Feature Flags Management:**
  - Platform configuration and canary toggle endpoints strictly gated by `@Roles('super_admin')`.
- **Strict Time-Limited Audited Impersonation Protocol:**
  - Exclusively restricted to `super_admin`.
  - Hard-coded security denial preventing impersonation of another `super_admin`.
  - Mandatory justification reason (`reason`).
  - Duration strictly capped at 15 minutes (900 seconds) regardless of client request.
  - High-priority audit log: `admin.impersonation_started`.
  - Signs JWT token embedding `isImpersonated: true`, `impersonatorUserId`, and target user claims.
  - `AuthGuard` extracts and attaches impersonation metadata to `request.user`.
- **Automated Secret & Credential Redaction:**
  - Recursive sanitization function `redactSensitiveData()` automatically masks passwords, token hashes, api keys, cvv, card numbers, and credentials before audit logs are exposed.
- **Frontend Admin Dashboard & 100% Localization Parity:**
  - Created `AdminDashboardView.tsx` and route `/[locale]/admin/page.tsx`.
  - Added `"admin"` namespace with 47 keys to `messages/en.json` and `messages/bn.json` with 100% key parity.
- **Test Suite:**
  - Authored 32 new tests across database migration, API, and web packages.
  - Monorepo test suite expanded from 349 to **381 passing tests (0 failures, 0 skipped)** across 51 test files.
  - Published audit report `docs/audits/admin-operations-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.13.0 — Phase 13 Reviews, Trust, Safety and Replacement Guarantee

- **Definition of Done Enforced — Policies are transparent and enforceable:**
  - Published canonical policies:
    - `docs/policies/fair-reviews-and-moderation-policy.md` (`v1.0-fair-reviews`).
    - `docs/policies/tutor-replacement-guarantee-and-dispute-policy.md` (`v1.0-tutor-replacement-guarantee`).
  - Database migration `006_reviews_and_trust_safety.sql` introducing `reviews`, `safety_reports`, and `tutor_replacement_cases` tables with check constraints and unique indexes.
  - Entities created in `apps/api/src/modules/trust/entities/`: `ReviewEntity`, `SafetyReportEntity`, `TutorReplacementCaseEntity`.
  - Wired into `apps/api/src/app.module.ts` via `TrustModule`.
- **Fair and Verified Reviews (Anti-Self / Anti-Fake Invariants):**
  - Zero Self-Reviews: Enforced via `chk_review_no_self_review` database constraint and service guard (`403 Forbidden`).
  - Zero Fake Reviews: Only confirmed or completed booking participants (student or guardian) can review (`403 Forbidden` for unrelated users).
  - Multi-dimensional rating criteria: Overall rating (1-5), punctuality, teaching clarity, and subject mastery.
  - Verified Booking Badges: Linked immutably to booking agreements (`is_verified_booking = true`).
  - Tutor Rebuttal: Reviewed tutors have the professional right to post a single formal, courteous response (`tutor_response`). Subsequent attempts rejected (`409 Conflict`).
- **Trust, Abuse & Safety Reporting (Emergency Child Safety Protocol):**
  - Confidential reporting intake across harassment, child safety, inappropriate content, off-platform payment solicitations, and fraud.
  - Emergency Child Safety Escalation: Category `child_safety` or severity `critical` automatically triggers `urgent_child_safety` escalation level, logs emergency audit entries, and emits `safety.critical_escalation` outbox event.
  - Evidence Privacy: Strictly scoped to reporter and platform administrators (`403 Forbidden` for reported or unrelated users).
- **Tutor Replacement Guarantee Workflow (FR-011):**
  - Automated replacement guarantee state machine: `requested` -> `under_review` -> `matching` -> `offered` -> `accepted` / `rejected` / `closed`.
  - Unrelated Case Denial: Only affected booking participants and Trust & Safety staff have access (`403 Forbidden`).
  - On accepted replacement: booking is re-assigned to alternate verified tutor, restored to `confirmed`, and escrow transfers seamlessly.
- **Frontend Views & Bilingual Parity:**
  - Created [`ReviewFormModal`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/src/components/trust/ReviewFormModal.tsx), [`TutorReviewsListView`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/src/components/trust/TutorReviewsListView.tsx), [`TutorReplacementModal`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/src/components/trust/TutorReplacementModal.tsx), and [`SafetyReportModal`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/src/components/trust/SafetyReportModal.tsx).
  - 100% Bilingual Parity: Added `"trust"` namespace (41 keys) to both `messages/en.json` and `messages/bn.json` with Bengali translations.
- **Test Suite:**
  - Authored 44 new tests across database migration, API, and web packages.
  - Monorepo test suite expanded from 305 to **349 passing tests (0 failures, 0 skipped)** across 48 test files.
  - Published audit report `docs/audits/reviews-trust-safety-and-replacement-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.12.0 — Phase 12 Notifications, Communication & SSLCOMMERZ Sandbox Integration

- **SSLCOMMERZ Sandbox Gateway & Ngrok Tunnel Integration:**
  - Integrated SSLCOMMERZ sandbox store credentials (`Store ID: ogron6ac9fcef6d321`, `Store Password: ogron6ac9fcef6d321@ssl`) via `SslcommerzSandboxAdapter`.
  - Added multi-gateway resolution to `PaymentAdapterFactory` supporting `bkash`, `nagad`, and `sslcommerz`.
  - Spawned live background ngrok HTTP daemon tunnel on port 4000 exposing public endpoint:
    - Public Tunnel URL: `https://undone-unsure-twisting.ngrok-free.dev`
    - IPN Webhook: `https://undone-unsure-twisting.ngrok-free.dev/api/v1/payments/webhook/sslcommerz`
  - Created `scripts/tunnel.js` and added `"tunnel": "node scripts/tunnel.js"` command to root `package.json`.
  - Added unit test suite `apps/api/test/sslcommerz.adapter.spec.ts` (7 tests passed).

- **Notification Preferences & Outbox Failure Isolation (Phase 12 Core):**
  - Definition of Done enforced: *Delivery failure cannot corrupt committed business state*.
  - Database migration `005_notifications_and_communication.sql` introducing `notification_preferences` with composite unique constraint `(user_id, category, channel)` and `booking_messages` with participant indexes and check constraints.
  - Entities created: `NotificationPreferenceEntity`, `BookingMessageEntity`.
  - Granular Notification Preferences (`GET /api/v1/notifications/preferences`, `PATCH /api/v1/notifications/preferences`): Users control notifications across categories (`academic`, `booking`, `payment`, `security`, `marketing`) and channels (`in_app`, `email`, `sms`, `push`). Critical security alerts bypass suppression.
  - Asynchronous Outbox Worker (`OutboxWorkerService`): Processes transactional `outbox_events` out-of-band with exponential backoff (`2^attempts * 1000ms`), max attempt limit (5), error log secret redaction, and verified isolation from committed business transactions.
  - Participant-Scoped ABAC Booking Chat (`GET/POST /api/v1/bookings/:bookingId/messages`): Only student, requester guardian, assigned tutor, and platform admin can participate; external callers receive `403 Forbidden`.
  - Minor Safety & Escrow Protection Filter: Automated redaction of Bangladeshi phone numbers (`[REDACTED CONTACT NUMBER]`), off-platform payment solicitations (`[REDACTED PAYMENT SOLICITATION]`), and suspicious external links (`[REDACTED EXTERNAL LINK]`), with security audit logging and proactive guardian alerts.
  - Frontend UI: Built [`NotificationPreferencesView`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/src/components/notifications/NotificationPreferencesView.tsx) and [`BookingChatView`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/src/components/notifications/BookingChatView.tsx).
  - 100% Bilingual Parity: Added 28 new localization keys across `apps/web/messages/en.json` and `apps/web/messages/bn.json` with full Bengali translations.
  - Test Suite: Authored 31 new tests across API, database, and web packages; monorepo suite expanded to **305 total passed tests, 0 failures, 0 skipped**.
  - Published audit report `docs/audits/notifications-and-communication-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.11.0 — Phase 11 Payments and Financial Ledger

- Implemented sandbox provider integration and double-entry financial ledger core in `apps/api/src/modules/payments/`:
  - Definition of Done enforced: No live money until provider/business/accounting approvals; all providers run in strict sandbox simulation mode (`PROVIDER_SANDBOX_MODE=true`).
  - Strict security invariant: No success based on redirect. Payment success state is exclusively granted via cryptographically verified server-to-server webhook callbacks (HMAC-SHA256 signature verification) matching order amount.
  - Database migration `004_payments_and_ledger.sql` introducing `payment_refunds` table, check constraints, indexes, and PL/pgSQL function `verify_ledger_journal_balance(p_journal_id)`.
  - TypeORM Entities created: `PaymentOrderEntity`, `PaymentTransactionEntity`, `PaymentRefundEntity`, `LedgerAccountEntity`, `LedgerJournalEntity`, `LedgerEntryEntity`.
  - Double-Entry Ledger Service (`LedgerService`): Enforces mathematical invariant `SUM(debits) = SUM(credits)` with zero floating-point errors using 64-bit integer minor units (poisha = BDT * 100). Rejects unbalanced, zero, or negative postings.
  - Milestone Escrow Accounting:
    - On payment: Debit `1000` (Escrow Holding Pool Asset) / Credit `2100` (Student Advance Escrow Deposit Liability).
    - On milestone completion: Clears escrow liability into 92% Tutor Earnings Payable Liability (`2000`) and 8% Platform Service Fee Revenue (`4000`).
  - Operational Refund bounds checking: Cannot refund more than total paid order amount; posts balanced reversal journal (`Debit 2100`, `Credit 1000`) and emits `refund.processed` outbox event.
  - Financial Reconciliation Audit (`runReconciliation()`): Audits all payment orders against verified transaction records and validates double-entry ledger balance integrity.
  - Printable Receipts (`getPaymentReceipt()`): Formats official payment receipts with BDT currency, transaction IDs, payer/student/tutor details, and BST timestamps.
  - Frontend UI: Built [`PaymentCheckoutView`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/src/components/payments/PaymentCheckoutView.tsx) and page at `apps/web/src/app/[locale]/payments/page.tsx` with MFS gateway selectors (bKash, Nagad, Cards), escrow breakdown card, live ledger balance status, and printable receipts.
  - Added bilingual namespace `"payments"` (25 keys) to `messages/en.json` and `messages/bn.json` with 100% key parity and Bengali digit formatting.
  - Added 34 new tests across `ledger.service.spec.ts`, `payments.service.spec.ts`, `payments.controller.spec.ts`, `payments.spec.ts`, and `migration.spec.ts`.
  - Expanded monorepo test suite from 240 to **274 passing tests, 0 failures, 0 skipped**.
  - Published audit report `docs/audits/payments-and-financial-ledger-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.10.0 — Phase 10 Learning Management (Attendance, Homework, and Progress)

- Implemented authorized, attributable, and auditable Learning Management System in `apps/api/src/modules/learning/`:
  - Definition of Done enforced: Records are authorized, attributable and auditable with strict role-based and attribute-based access control (ABAC).
  - Database migration `003_learning_management.sql` creating `assignments`, `assignment_submissions`, and `progress_reports` tables with indexes and check constraints.
  - Entities created: `SessionAttendanceEntity`, `AssignmentEntity`, `AssignmentSubmissionEntity`, `ProgressReportEntity`.
  - Attendance recording (`POST /api/v1/learning/attendance`): tutor-scoped, immutable actor ID, automatic notification to student and active linked guardians.
  - Assignment lifecycle (`POST /api/v1/learning/assignments`, `POST /api/v1/learning/assignments/:id/submissions`): tutor creates homework, only assigned student can submit, late submissions tagged automatically based on due date.
  - Grading & Score Revision Auditing (`POST /api/v1/learning/submissions/:id/grade`): tutors review submissions with max score validation; revising an already graded score strictly requires a `revisionReason` and logs previous score, new score, actor ID, and reason in `audit_logs`.
  - Auditable Progress Reports (`POST /api/v1/learning/progress-reports`): computes observable metrics (attendance %, assignments completed, average score) directly from database records, preventing unsupported mastery claims.
  - Guardian oversight: only active linked guardians (`guardian_student_links`) can access student learning records and progress reports; unlinked/revoked users receive `403 Forbidden`.
  - Built frontend UI [`LearningManagementView`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/src/components/learning/LearningManagementView.tsx) and page at `apps/web/src/app/[locale]/learning/page.tsx` with attendance cards, homework submission modal, grading modal, and progress reports dashboard.
  - Added bilingual namespace `"learning"` (36 keys) to `messages/en.json` and `messages/bn.json` with 100% key parity and Bengali digit localization.
  - Added 34 new tests across `learning.service.spec.ts`, `learning.controller.spec.ts`, `learning.spec.ts`, and `migration.spec.ts`.
  - Expanded monorepo test suite from 206 to **240 passing tests, 0 failures, 0 skipped**.
  - Published audit report `docs/audits/learning-management-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.9.0 — Phase 09 Booking and Scheduling

- Implemented state machine and conflict-safe session scheduling in `apps/api/src/modules/bookings/`:
  - `BookingSessionEntity` mapped to `booking_sessions` table with UTC `TIMESTAMPTZ` and `Asia/Dhaka` timezone intent.
  - Definition of Done enforced: At most one overlapping active session per tutor under approved rule via application overlap validation and PostgreSQL GiST exclusion constraint `ex_tutor_session_overlap`.
  - Concurrency conflict handling: SQL state `23P01` exclusion errors caught and translated into client-friendly `ConflictException`.
  - Cancelled slot reuse invariant: Cancelled sessions immediately release their time slot for subsequent booking without collision.
  - One-off session scheduling (`POST /api/v1/sessions`) with past date prevention and booking duration matching.
  - Recurring weekly session generator (`POST /api/v1/sessions/recurring`) creating sequential classes across specified weekdays and time slots with internal batch collision prevention.
  - Reschedule workflow (`POST /api/v1/sessions/:id/reschedule`) validating participant authorization, zero overlap, and reason tracking.
  - Bangladesh cancellation & operational refund policy matrix (`POST /api/v1/sessions/:id/cancel`):
    - Student/guardian $>24\text{h}$: 100% refund, 0% compensation.
    - Student/guardian $4\text{h}-24\text{h}$: 80% refund, 20% tutor compensation.
    - Student/guardian $<4\text{h}$: 0% refund, 80% tutor compensation.
    - Tutor cancellations deduct reliability points and process 100% refund to learner.
  - Privacy-safe public calendar endpoint (`GET /api/v1/tutors/:tutorId/calendar`) returning only busy intervals with learner PII completely excluded.
  - Transactional Outbox pattern implemented via `OutboxEventEntity` (`outbox_events` table) emitting `session.scheduled`, `session.rescheduled`, and `session.cancelled`.
  - Asynchronous, non-blocking notification dispatch outside critical transaction locks.
- Built accessible frontend `SessionScheduleCalendar` component in `apps/web/src/components/scheduling/SessionScheduleCalendar.tsx` with class cards, status badges, meeting links, reschedule dialog, and cancellation refund preview modal.
- Configured route at `apps/web/src/app/[locale]/sessions/page.tsx`.
- Updated bilingual translation catalogs `messages/bn.json` and `messages/en.json` with `scheduling` namespace while maintaining 100% key parity and localized Bengali numeral support.
- Authored 33 new automated unit, conflict-safety, and invariant tests across `scheduling.service.spec.ts`, `sessions.controller.spec.ts`, and `scheduling.spec.ts`.
- Expanded monorepo test suite from 173 to **206 passing tests, 0 failures, 0 skipped**.
- Published Phase 09 audit report `docs/audits/booking-and-scheduling-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.8.0 — Phase 08 Tutor Discovery and Requests

- Implemented real DB-backed discovery search engine (`TutorsService.searchTutors`) exposed at `GET /api/v1/tutors/search`:
  - Strictly excluded unpublished, draft, unapproved, or suspended tutor profiles.
  - Multi-dimensional filters: text search `q`, subject, education level, curriculum, teaching mode, location (district/upazila), and price range.
  - Explainable, deterministic ranking algorithm (Base 100 + NID 20 + Degree 20 + Experience up to 50 + Fast response 10) with transparent scoring breakdown and zero unbacked AI claims.
  - Deterministic pagination (`total`, `page`, `limit`, `totalPages`).
  - Strict privacy isolation: public search results redact national IDs, phone numbers, emails, and internal reviewer notes.
- Created `BookingsModule` and `BookingsService` in `apps/api/src/modules/bookings/`:
  - `BookingEntity` mapped to `bookings` relational schema.
  - Request creation workflow (`POST /api/v1/requests`) verifying active guardian-student relationships for minors and preventing self-requests.
  - Server-side anti-spam invariant: Simultaneous duplicate active requests for the same student, tutor, and subject throw `409 Conflict`.
  - Request withdrawal workflow (`POST /api/v1/requests/:id/withdraw`) restricted strictly to the requester.
  - Tutor response workflow (`POST /api/v1/requests/:id/respond`) allowing accept and decline with audit logging.
  - Real-time notification dispatch via `NotificationService` across all lifecycle events (`booking.requested`, `booking.accepted`, `booking.declined`, `booking.cancelled`).
  - Ownership guard on `GET /api/v1/requests/:id` ensuring third parties cannot inspect private booking records.
- Built accessible frontend `TutorSearchCatalog` in `apps/web/src/components/discovery/TutorSearchCatalog.tsx` with dynamic filters, explainable match breakdown modal, booking request dialog, and route at `apps/web/src/app/[locale]/tutors/page.tsx`.
- Updated bilingual localization catalogs `messages/bn.json` and `messages/en.json` with `discovery` and `bookingRequest` namespaces, maintaining 100% key parity and localized Bengali numeral formatting.
- Authored 27 new automated unit and invariant tests across `discovery.search.spec.ts`, `bookings.service.spec.ts`, `bookings.controller.spec.ts`, and `tutor-discovery.spec.ts`.
- Expanded monorepo test suite from 146 to **173 passing tests, 0 failures, 0 skipped**.
- Published Phase 08 audit report `docs/audits/tutor-discovery-and-requests-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.7.0 — Phase 07 Tutor Onboarding and Verification

- Established canonical tutor verification, credential review, and trust policy in `docs/policies/tutor-verification-and-credential-policy.md` (policy version `v1.0-bd-tutor-verification`) under statutory Bangladesh laws.
- Implemented `TutorsModule` in `apps/api/src/modules/tutors/`:
  - `TutorProfileEntity` mapped to `tutor_profiles` relational schema.
  - `TutorQualificationEntity` mapped to `tutor_qualifications` relational table.
  - `TutorVerificationReviewEntity` mapped to `tutor_verification_reviews` relational table.
  - `TutorSubjectEntity` mapped to `tutor_subjects` relational table.
  - `TutorServiceAreaEntity` mapped to `tutor_service_areas` relational table.
  - `TutorAvailabilityEntity` mapped to `tutor_availability` relational table.
  - Strict Self-Approval Denial: Server rejects tutors attempting to approve or alter their own verification status.
  - Publication eligibility gate: Tutors cannot transition to `published` unless verified, with active subjects and availability slots.
  - Dynamic verification badges: Platform trust marks reflect only checks actually performed (`verified_identity`, `verified_academic`, `verified_tutor`).
  - Automated depublication on suspension/rejection: Suspended tutors are automatically unpublished.
  - Public profile data redaction: Sanitized public profile endpoint redacts contact PII, raw document paths, and reviewer internal notes.
- Implemented `FilesModule` in `apps/api/src/modules/files/`:
  - `FileAssetEntity` mapped to `file_assets` table.
  - Private evidence upload with 10MB limit and mime type validation (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`).
  - Server-side ownership guard: Evidence files restricted strictly to owner and compliance reviewers (`admin`, `super_admin`).
- Implemented `TaxonomyModule` in `apps/api/src/modules/taxonomy/`:
  - `SubjectEntity`, `EducationLevelEntity`, `CurriculumEntity` providing reference catalogs.
- Built accessible frontend `TutorVerificationStatusCard` in `apps/web/src/components/tutor/TutorVerificationStatusCard.tsx` with dynamic badge rendering, publication toggles, qualification list, and bilingual support.
- Updated bilingual dictionaries `messages/bn.json` and `messages/en.json` with tutor verification namespace, maintaining 100% key parity.
- Authored 32 new unit and security tests across `tutors.service.spec.ts`, `files.service.spec.ts`, `tutors.controller.spec.ts`, and `tutor-verification.spec.ts`.
- Expanded monorepo test suite from 114 to **146 passing tests, 0 failures, 0 skipped**.
- Published Phase 07 audit report `docs/audits/tutor-onboarding-and-verification-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.6.0 — Phase 06 Users, Students, Guardians and Consent

- Formalized Bangladeshi minor statutory consent policy in `docs/policies/guardian-consent-and-minor-safety-policy.md` (policy version `v1.0-bd-minor-consent`) under The Children Act 2013 and Contract Act 1872.
- Created `AuditModule` and `AuditService` with `audit_logs` entity to provide global, immutable audit tracking across all sensitive and privileged platform operations.
- Implemented `UsersModule` in `apps/api/src/modules/users/`:
  - `StudentProfileEntity` mapped to `student_profiles` relational schema.
  - Profile retrieval with dynamic minor age calculation (DOB < 18 years threshold).
  - Student academic profile management (education levels, curricula, stream, institution, learning goals, visibility).
  - Self-service data export (`GET /api/v1/users/me/export`) and GDPR/privacy account deletion request (`POST /api/v1/users/me/delete-account`) transitioning user to `deletion_pending` status and revoking active sessions.
- Implemented `GuardiansModule` in `apps/api/src/modules/guardians/`:
  - `GuardianStudentLinkEntity` mapped to `guardian_student_links` relational table.
  - Multi-child guardian management (`GET /api/v1/guardians/children`).
  - Link request creation with mandatory `v1.0-bd-minor-consent` agreement and audit logging.
  - Direct child registration onboarding under parent account.
  - Student approval/rejection verification workflow.
  - Relationship revocation with immediate termination of guardian record visibility.
  - Minimal child PII protection (child email and phone shielded from unlinked third parties).
  - Attribute-Based Access Control (ABAC) verified: Unrelated guardians denied access via `GuardianStudentGuard`.
- Built frontend `GuardianChildrenManager` component in `apps/web/src/components/guardian/GuardianChildrenManager.tsx` featuring multi-child cards, minor badges, interactive link modal with consent affirmation checkbox, and revocation triggers.
- Updated bilingual dictionary catalogs `messages/bn.json` and `messages/en.json` with guardian management namespaces while maintaining 100% key parity.
- Authored 26 new automated unit tests across `guardians.service.spec.ts`, `guardians.controller.spec.ts`, `users.service.spec.ts`, and `guardian-children.spec.ts`.
- Expanded monorepo test suite from 88 to **114 passing tests, 0 failures, 0 skipped**.
- Published Phase 06 audit report `docs/audits/user-and-guardian-management-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.5.0 — Phase 05 Authentication and Authorization

- Implemented comprehensive IAM `AuthModule` in `apps/api/src/modules/auth/` featuring registration, login, logout, refresh, revocation, contact verification, and password reset.
- Configured password hashing using `bcryptjs` with cost factor 12 and strict password strength validation (uppercase, lowercase, number, 8+ characters).
- Designed single-use rotating refresh token lifecycle with cryptographic replay attack detection:
  - Refresh tokens stored as SHA-256 hashes in `auth_sessions`.
  - Re-use of previously rotated or revoked refresh tokens triggers blanket session invalidation across all active devices for the affected user.
- Added dual transport for refresh tokens: HTTP-only secure cookies (`ogroni_rt`) for web security and DTO body for mobile clients.
- Built sliding-window anti-abuse rate limiter (`RateLimiterService`) protecting authentication endpoints against brute-force attacks with HTTP 429 status codes.
- Created `auth_verification_codes` table via database migration `002_auth_verification_codes.sql` for 6-digit OTP contact verification and self-service password reset.
- Implemented server-side authorization guards:
  - `AuthGuard` validating JWT bearer tokens with `@Public()` decorator bypass.
  - `RolesGuard` enforcing RBAC via `@Roles(...)` metadata with `super_admin` privilege escalation bypass.
  - `GuardianStudentGuard` providing ABAC relationship checks via database lookup against `guardian_student_links`.
- Authored 27 new automated tests across `auth.service.spec.ts`, `auth.authorization.spec.ts`, and `auth.controller.spec.ts` covering success paths, negative inputs, role denials, replay attacks, and guardian ABAC checks.
- Expanded monorepo test coverage to 88 passing tests with 0 failures.
- Published Phase 05 audit report `docs/audits/authentication-and-authorization-audit.md` and updated canonical RTM in `docs/traceability-matrix.md`.

## 1.4.0 — Phase 04 Database and Migrations

- Created dedicated `@ogroniedu/database` workspace package with TypeScript compiler configuration and native ESM support.
- Built transactional `MigrationRunner` supporting sequential SQL migration execution, tracking table `schema_migrations`, idempotency verification, and failure rollback.
- Implemented comprehensive `001_initial_schema.sql` migration containing all 23 core relational tables:
  - Users, Roles, Permissions, User Roles (RBAC)
  - Curricula, Education Levels, Subjects
  - Guardian Student Links, Tutor Profiles, Tutor Subjects, Tutor Availability
  - Bookings, Booking Sessions with GiST exclusion constraint preventing overlapping tutor bookings (`ex_tutor_session_overlap`), Session Attendance
  - Double-Entry Ledger Accounts, Journals, Entries (with check constraints ensuring debits and credits balance)
  - Payment Orders, Payment Transactions
  - Notifications, Notification Deliveries
  - Outbox Events, Idempotency Keys, Audit Logs
- Built `SeedRunner` with idempotent seeding logic for default roles, national curricula, education levels, and foundational subjects.
- Added migration and seeding CLI automation scripts: `pnpm db:migrate` and `pnpm db:seed`.
- Integrated `@ogroniedu/database` into `apps/api` with TypeORM data source configured with `synchronize: false`.
- Authored 8 automated tests in `packages/database/test/` verifying migration execution, idempotency, catalog presence, exclusion constraints (GiST overlap prevention), check constraints (`chk_user_contact_present`), and seed repeatability.
- Expanded automated test suite from 53 to 61 passing tests across the monorepo.

## 1.3.0 — Phase 03 Design System & Localization

- Built bilingual dictionary catalogs (`apps/web/messages/bn.json` & `apps/web/messages/en.json`) with strict key parity and type-safe loader.
- Implemented accessible design system UI primitives in `apps/web/src/components/ui/` (`Button`, `Card`, `Badge`, `Input`, `Tabs`, `EmptyState`, `LoadingSpinner`, `Skeleton`) conforming to WCAG 2.1 AA.
- Developed responsive shells in `apps/web/src/components/shell/` (`Navbar` with interactive language switcher, `Footer`).
- Refactored home landing page to use design system primitives and dictionary strings.
- Added automated unit tests for dictionary key parity and UI component states (expanding test suite to 53 tests).
- Published design system guidelines document `docs/design-system-and-ui-guidelines.md`.

## 1.2.0 — Phase 02 Architecture Foundation & Centralized State Management

- Added centralized state management and resilient API data fetching using **Redux Toolkit 2.x** and **RTK Query** in `apps/web/src/store/`.
- Configured RTK Query `baseApi` with automated correlation token injection (`x-request-id`), `Authorization: Bearer <token>`, and cache tag invalidation (`['Notification', 'UnreadCount', 'User', 'Session']`).
- Built modular slices for authentication (`authSlice`) and UI interactions (`uiSlice`) with typed hooks (`useAppDispatch`, `useAppSelector`).
- Created React 19 / Next.js App Router compatible `StoreProvider` utilizing `useRef` store singleton.
- Implemented backend structured JSON logging (`StructuredLoggerService`) with automated PII masking.
- Implemented `RequestIdMiddleware` for distributed request correlation and `AllExceptionsFilter` for canonical error payload contracts.
- Implemented container health and readiness probes (`/health/live`, `/health/ready`) via `@nestjs/terminus`.
- Added startup environment variable schema validation (`validateEnvironment`).
- Created GitHub Actions CI pipeline (`.github/workflows/ci.yml`) enforcing frozen install, formatting, docs validation, typecheck, tests, and build.
- Recorded ADR-008 for Monorepo Tooling, Architecture Foundation, and Centralized State Management.
- Expanded automated test suite from 26 to 44 passing tests (33 backend + 11 frontend).

## 1.1.0 — Phase 0 Foundation & Phase 01 Repository and Environment Audit

- Established Turborepo monorepo with pnpm 12 workspaces (`apps/api`, `apps/web`, `packages/contracts`, `packages/tsconfig`).
- Configured root `.gitignore`, `.prettierrc`, and `.prettierignore` with automated code formatting.
- Built Centralized Real-time Notification Engine (`NotificationGateway`, `NotificationService`, `NotificationController`).
- Refactored backend DTOs to class-based models decorated with `class-validator` and `class-transformer` (`DispatchNotificationDto`, `GetNotificationsQueryDto`, `MarkAsReadParamDto`).
- Expanded automated test suite to 26 passing tests across unit, socket, DTO validation, cross-user isolation, and UI components.
- Completed comprehensive Phase 01 Repository and Environment Audit report (`docs/audits/repository-and-environment-audit.md`).
- Updated `VERSION-VERIFICATION.md` verifying runtime versions (Node.js v26.8.1, pnpm 12.10.1, PostgreSQL 18, Next.js 16.4.0, NestJS 12.1.2).

## 1.0.0 — Initial package

- Product, architecture, data model, API, security, testing, deployment, business and launch documents added.
- Initial PostgreSQL schema and data dictionary added.
- 24 ordered coding-agent prompts added.
- External versions, legal interpretation, market assumptions, and provider terms require dated verification.
