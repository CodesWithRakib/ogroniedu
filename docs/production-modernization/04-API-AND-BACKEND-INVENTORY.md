# OgroniEdu — Master API and Backend Operation Inventory

**Status:** AUDITED & VERIFIED  
**Date:** 2026-10-24  
**Scope:** Complete inventory of all NestJS controllers, services, repositories, events, websockets, background workers, and schedulers in `@ogroniedu/api` (NestJS 12.1.2).  
**Core Architectural Mandate:** *"backend er o enum , interface kokhonoi service er vitore thakbe na alada folder kore module e thakbe"* — All enums, interfaces, and types must be extracted out of services into dedicated module subfolders (`interfaces/`, `enums/`, `types/`, `contracts/`, `dto/`).

---

## 1. Backend Architecture Topology

`@ogroniedu/api` is built as a **domain-driven modular monolith** with 20 registered domain modules in `src/modules/`:
- **Modules (20)**: `auth`, `onboarding`, `users`, `guardians`, `files`, `taxonomy`, `tutors`, `bookings`, `learning`, `payments`, `notifications`, `trust`, `support`, `public`, `admin`, `analytics`, `organizations`, `feedback`, `health`, `audit`.
- **Controllers (36)**: Handling HTTP requests under `/api/v1` (and `/health`).
- **Services (54)**: Housing core domain logic, TypeORM query orchestration, and external integration adapters.
- **WebSocket Gateway (1)**: `NotificationGateway` handling `/notifications` namespace.
- **Background Schedulers (4)**: Booking expiry (5m), tutor verification sweep (daily), tutor verification expiry (daily), tutor replacement sweep (30m).
- **Outbox Worker (1)**: `OutboxWorkerService` dispatching reliable events every 10s.

---

## 2. Complete Controller & Endpoint Inventory (36 Controllers, 227 Endpoints)

| Module | Controller Class | File Location | Route Prefix | Endpoints | Key Guards & Roles |
|---|---|---|---|---|---|
| **admin** | `AdminOperationsController` | `src/modules/admin/admin-operations.controller.ts` | `/api/v1/admin` | 17 | `AuthGuard`, `RolesGuard` (`super_admin`, `admin`, `compliance_reviewer`, `support_agent`) |
| **analytics** | `AnalyticsController` | `src/modules/analytics/analytics.controller.ts` | `/api/v1/analytics` | 11 | `AuthGuard`, `RolesGuard` (`admin`, `super_admin`, `tutor`, `@Public()` on track-events) |
| **auth** | `AuthController` | `src/modules/auth/auth.controller.ts` | `/api/v1/auth` | 12 | `@Public()` on register/login/refresh/magic-link; `AuthGuard` on `/me`, `/logout`, `/revoke-all` |
| **bookings** | `BookingsController` | `src/modules/bookings/bookings.controller.ts` | `/api/v1/requests` | 7 | `AuthGuard` on all booking requests (create, accept, decline, withdraw) |
| **bookings** | `SessionsController` | `src/modules/bookings/sessions.controller.ts` | `/api/v1` | 14 | `AuthGuard` on reschedule, cancel, complete, attendance, notes |
| **bookings** | `SessionSeriesController` | `src/modules/bookings/session-series.controller.ts` | `/api/v1/session-series` | 3 | `AuthGuard` on recurring session series generation |
| **feedback** | `FeedbackController` | `src/modules/feedback/feedback.controller.ts` | `/api/v1/feedback` | 5 | `AuthGuard` on feedback submission; `RolesGuard` on admin feedback triage |
| **files** | `FilesController` | `src/modules/files/files.controller.ts` | `/api/v1/files` | 2 | `AuthGuard` on upload-evidence, getFileAccess (**NEEDS DOWNLOAD ENDPOINT — RLD-001**) |
| **guardians** | `GuardiansController` | `src/modules/guardians/guardians.controller.ts` | `/api/v1/guardians` | 7 | `AuthGuard`, `RolesGuard`, `GuardianStudentGuard` (ABAC child isolation) |
| **health** | `HealthController` | `src/modules/health/health.controller.ts` | `/health`, `/api/health` | 5 | `@Public()` on liveness and Terminus readiness probes |
| **learning** | `LearningController` | `src/modules/learning/learning.controller.ts` | `/api/v1/learning` | 20 | `AuthGuard` on assignments, submissions, grading, rubrics |
| **learning** | `LessonContentController` | `src/modules/learning/lesson-content.controller.ts` | `/api/v1/learning` | 17 | `AuthGuard` on lesson plans, teaching materials, topics |
| **learning** | `LearningReportsController` | `src/modules/learning/learning-reports.controller.ts` | `/api/v1/learning/admin` | 2 | `AuthGuard`, `RolesGuard` (`admin`, `super_admin`) on academic audits |
| **learning** | `LearningGoalsController` | `src/modules/learning/learning-goals.controller.ts` | `/api/v1/learning/goals` | 3 | `AuthGuard` on student learning goal milestones |
| **notifications** | `NotificationController` | `src/modules/notifications/notification.controller.ts` | `/api/v1/notifications` | 8 | `AuthGuard` on bell notifications, preferences, mark-read, test-dispatch (gated) |
| **notifications** | `ConversationsController` | `src/modules/notifications/conversations.controller.ts` | `/api/v1/conversations` | 3 | `AuthGuard` on booking chat conversation lists |
| **notifications** | `BookingMessagesController` | `src/modules/notifications/booking-messages.controller.ts` | `/api/v1/bookings/:bookingId/messages`| 3 | `AuthGuard` on booking chat history and posting |
| **onboarding** | `OnboardingController` | `src/modules/onboarding/onboarding.controller.ts` | `/api/v1/onboarding` | 2 | `AuthGuard` on step-based role onboarding progress |
| **organizations**| `OrganizationsController` | `src/modules/organizations/organizations.controller.ts` | `/api/v1/organizations` | 8 | `AuthGuard` on institution profiles, branch locations, tutor rosters |
| **organizations**| `AdminOrganizationsController` | `src/modules/organizations/admin-organizations.controller.ts`| `/api/v1/admin/organizations`| 2 | `AuthGuard`, `RolesGuard` (`admin`, `super_admin`) on org approval queue |
| **payments** | `PaymentsController` | `src/modules/payments/payments.controller.ts` | `/api/v1/payments` | 11 | `AuthGuard` on checkout, orders, receipts; `@Public()` on `/webhook/:provider` |
| **payments** | `TutorFinanceController` | `src/modules/payments/tutor-finance.controller.ts` | `/api/v1/tutor/finance` | 4 | `AuthGuard`, `RolesGuard` (`tutor`) on payout requests, earnings history |
| **payments** | `AdminFinanceController` | `src/modules/payments/admin-finance.controller.ts` | `/api/v1/admin/finance` | 11 | `AuthGuard`, `RolesGuard` (`admin`, `super_admin`) on payout approvals, commission policy |
| **public** | `PublicController` | `src/modules/public/public.controller.ts` | `/api/v1/public` | 1 | `@Public()` on platform stats (tutor count, session count) |
| **support** | `SupportController` | `src/modules/support/support.controller.ts` | `/api/v1/support/tickets` | 2 | `@Public()` on ticket creation; `AuthGuard` on `/mine` |
| **support** | `AdminSupportController` | `src/modules/support/admin-support.controller.ts` | `/api/v1/admin/support-tickets` | 2 | `AuthGuard`, `RolesGuard` (`support_agent`, `admin`, `super_admin`) |
| **taxonomy** | `TaxonomyController` | `src/modules/taxonomy/taxonomy.controller.ts` | `/api/v1/taxonomy` | 18 | `@Public()` on curricula, grades, subjects, divisions, districts, areas; `RolesGuard` on mutations |
| **trust** | `DisputesController` | `src/modules/trust/disputes.controller.ts` | `/api/v1/disputes` | 4 | `AuthGuard` on dispute creation, mediation responses, arbitration |
| **trust** | `ReviewsController` | `src/modules/trust/reviews.controller.ts` | `/api/v1/reviews` | 4 | `@Public()` on tutor public reviews; `AuthGuard` on create review, reply, moderate |
| **trust** | `SafetyReportsController` | `src/modules/trust/safety-reports.controller.ts` | `/api/v1/safety-reports` | 14 | `AuthGuard` on safety report filing, emergency holds, guardian safety notifications |
| **trust** | `TutorReplacementController` | `src/modules/trust/tutor-replacement.controller.ts` | `/api/v1/tutor-replacements`| 10 | `AuthGuard` on replacement guarantee claims, candidate selection, admin arbitration |
| **tutors** | `TutorsController` | `src/modules/tutors/tutors.controller.ts` | `/api/v1/tutors` | 27 | `@Public()` on search, public profiles; `AuthGuard` on tutor profile, availability, dossier |
| **tutors** | `SavedTutorsController` | `src/modules/tutors/saved-tutors.controller.ts` | `/api/v1/saved-tutors` | 3 | `AuthGuard` on bookmarks/favorites |
| **tutors** | `AdminTutorsController` | `src/modules/tutors/admin-tutors.controller.ts` | `/api/v1/admin/tutors` | 10 | `AuthGuard`, `RolesGuard` (`admin`, `compliance_reviewer`) on verification dossier review |
| **users** | `UsersController` | `src/modules/users/users.controller.ts` | `/api/v1/users` | 5 | `AuthGuard` on user profile, avatar upload, emergency contacts |

---

## 3. The 27 Services Requiring Interface/Enum Extraction

To satisfy the non-negotiable rule (*"backend er o enum , interface kokhonoi service er vitore thakbe na"*), each of the following 27 services will be refactored to move internal interfaces into dedicated module directories:

| # | Service File | Module | Interfaces Found Inside Service | Target Dedicated Location | Priority |
|---|---|---|---|---|---|
| 1 | `auth.service.ts` | auth | `LoginUserRow` | `src/modules/auth/interfaces/login-user-row.interface.ts` | **P1** |
| 2 | `rate-limiter.service.ts` | auth | `RateLimitRecord` | `src/modules/auth/interfaces/rate-limit-record.interface.ts` | **P2** |
| 3 | `otp-delivery.service.ts` | auth | `OtpDeliveryConfiguration` | `src/modules/auth/interfaces/otp-delivery.interfaces.ts` | **P2** |
| 4 | `account-access.service.ts` | auth | `AccountAccessSnapshot` | `src/modules/auth/interfaces/account-access.interfaces.ts` | **P2** |
| 5 | `booking-expiry.service.ts` | bookings | `BookingExpirySweepResult` | `src/modules/bookings/interfaces/booking-expiry.interfaces.ts` | **P1** |
| 6 | `session-reminder.service.ts` | bookings | `ReminderGenerationResult` | `src/modules/bookings/interfaces/session-reminder.interfaces.ts` | **P2** |
| 7 | `session-series.service.ts` | bookings | `SeriesMutationResult` | `src/modules/bookings/interfaces/session-series.interfaces.ts` | **P2** |
| 8 | `guardian-access.service.ts` | guardians | `BookingParties` | `src/modules/guardians/interfaces/guardian-access.interfaces.ts` | **P1** |
| 9 | `assignments.service.ts` | learning | `AssignmentView`, `SubmissionView` | `src/modules/learning/interfaces/assignments.interfaces.ts` | **P1** |
| 10 | `attendance.service.ts` | learning | `AttendanceSummary` | `src/modules/learning/interfaces/attendance.interfaces.ts` | **P2** |
| 11 | `learning-access.service.ts` | learning | `LearningBookingScope` | `src/modules/learning/interfaces/learning-access.interfaces.ts` | **P2** |
| 12 | `learning-goals.service.ts` | learning | `LearningGoalView` | `src/modules/learning/interfaces/learning-goals.interfaces.ts` | **P2** |
| 13 | `learning-materials.service.ts`| learning | `LearningMaterialView`, `MaterialDownload` | `src/modules/learning/interfaces/learning-materials.interfaces.ts` | **P2** |
| 14 | `lesson-plans.service.ts` | learning | `LessonPlanView` | `src/modules/learning/interfaces/lesson-plans.interfaces.ts` | **P2** |
| 15 | `progress.service.ts` | learning | `StudentProgressView` | `src/modules/learning/interfaces/progress.interfaces.ts` | **P2** |
| 16 | `onboarding.service.ts` | onboarding | `OnboardingRow`, `SystemStepContext` | `src/modules/onboarding/interfaces/onboarding.interfaces.ts` | **P2** |
| 17 | `ledger.service.ts` | payments | `JournalEntryInput`, `PostJournalParams`, `LedgerIntegrityCheckResult` | `src/modules/payments/interfaces/ledger.interfaces.ts` | **P1** |
| 18 | `payment-orders.service.ts` | payments | `PaymentReceiptDto` | `src/modules/payments/interfaces/payment-orders.interfaces.ts` | **P1** |
| 19 | `payment-webhooks.service.ts` | payments | `ConfirmedPayment` | `src/modules/payments/interfaces/payment-webhooks.interfaces.ts` | **P1** |
| 20 | `settlement.service.ts` | payments | `ReconciliationReport` | `src/modules/payments/interfaces/settlement.interfaces.ts` | **P2** |
| 21 | `disputes.service.ts` | trust | `DisputeListResponse` | `src/modules/trust/interfaces/disputes.interfaces.ts` | **P2** |
| 22 | `reviews.service.ts` | trust | `PublicReviewView` | `src/modules/trust/interfaces/reviews.interfaces.ts` | **P2** |
| 23 | `tutor-replacement.service.ts` | trust | `ReplacementRepos`, `ReplacementListResponse` | `src/modules/trust/interfaces/tutor-replacement.interfaces.ts` | **P1** |
| 24 | `saved-tutors.service.ts` | tutors | `SavedTutorItemDto` | `src/modules/tutors/interfaces/saved-tutors.interfaces.ts` | **P2** |
| 25 | `tutor-availability.service.ts`| tutors | `AvailabilitySlotInput`, `BlockedPeriodInput` | `src/modules/tutors/interfaces/tutor-availability.interfaces.ts` | **P2** |
| 26 | `tutor-verification-expiry.service.ts` | tutors | `VerificationExpirySweepResult` | `src/modules/tutors/interfaces/tutor-verification-expiry.interfaces.ts` | **P2** |
| 27 | `tutor-verification-reviewer-directory.service.ts` | tutors | `VerificationReviewerRecipient` | `src/modules/tutors/interfaces/tutor-verification.interfaces.ts` | **P2** |

---

## 4. Oversized Backend God Services Requiring Decomposition

The following services exceed 600 lines and contain multiple orthogonal responsibilities:

1. **`auth.service.ts` (1,096 lines)**: Handles registration, login, bcrypt password hashing, token generation, token rotation, session invalidation, OTP generation, OTP verification, magic links, rate limit integration, and audit logging.
   - *Decomposition Plan*: Split into `AuthRegistrationService`, `AuthSessionService`, `AuthOtpService`, `AuthMagicLinkService`.
2. **`tutor-replacement.service.ts` (1,053 lines)**: Handles replacement guarantee requests, eligible candidate scoring, candidate invitation, student acceptance, dispute arbitration, and refund recalculation.
   - *Decomposition Plan*: Split into `TutorReplacementScorerService`, `TutorReplacementCaseService`, `TutorReplacementArbitrationService`.
3. **`safety-reports.service.ts` (1,039 lines)**: Handles report filing, content redaction, child safety flagging, immediate tutor hold application, guardian emergency notification, case resolution.
   - *Decomposition Plan*: Split into `SafetyIncidentService`, `SafetyActionService`, `SafetyNotificationService`.
4. **`tutor-verification.service.ts` (992 lines)**: Handles 3-tier dossier submission, document metadata storage, reviewer assignment, level determination, badge assignment.
   - *Decomposition Plan*: Split into `TutorDossierService`, `TutorReviewerService`, `TutorVerificationStatusService`.
5. **`assignments.service.ts` (922 lines)**: Handles assignment creation, publishing, student submission, plagiarism scan, grading, rubric evaluation.
   - *Decomposition Plan*: Split into `AssignmentsService`, `SubmissionsService`, `GradingService`.
6. **`analytics.service.ts` (789 lines)**: Handles platform metrics, funnel tracking, revenue calculations, tutor leaderboards, guardian activity stats.
   - *Decomposition Plan*: Split into `OperationalAnalyticsService`, `FinancialAnalyticsService`, `RetentionAnalyticsService`.

---

## 5. Event-Driven Architecture & Outbox Worker

### 5.1 Outbox Invariant
All mutating operations that trigger side effects (notifications, payments, ledger entries, emails, socket broadcasts) MUST insert an event row into the PostgreSQL `outbox` table within the same database transaction.

### 5.2 Outbox Worker
`OutboxWorkerService` runs on a 10-second interval:
- Queries `outbox` for `status = 'pending'` ordered by `created_at ASC` with `FOR UPDATE SKIP LOCKED`.
- Dispatches event payloads to registered domain handlers.
- Marks row as `status = 'dispatched'`, recording timestamp.
- On handler error, increments `retry_count`. If `retry_count >= 5`, sets `status = 'failed'` and logs dead-letter alert.

### 5.3 Registered Domain Events
- **Bookings**: `booking.requested`, `booking.accepted`, `booking.declined`, `booking.confirmed`, `booking.completed`, `booking.cancelled`, `session.rescheduled`, `session.no_show`
- **Payments**: `payment.order_created`, `payment.succeeded`, `payment.failed`, `ledger.balance_changed`, `payout.requested`, `payout.processed`
- **Trust & Safety**: `safety.report.created`, `safety.hold.applied`, `dispute.opened`, `dispute.resolved`, `replacement.requested`, `replacement.candidate_matched`
- **Tutors**: `tutor.dossier_submitted`, `tutor.verified`, `tutor.level_upgraded`, `tutor.profile_updated`
- **Learning**: `assignment.created`, `assignment.submitted`, `assignment.graded`, `attendance.recorded`
- **Auth**: `auth.registered`, `auth.password_reset`, `auth.session_revoked`, `auth.account_suspended`

---

## 6. Scheduled Sweepers & Background Jobs

| Job Name | Cron Expression / Interval | Implementation Service | Purpose & Safeguards |
|---|---|---|---|
| **Booking Expiry Sweeper** | `*/5 * * * *` (Every 5 min) | `BookingExpiryService.sweepExpiredBookings()` | Cancels booking requests pending > 48 hours; cancels unpaid bookings pending > 24 hours. Emits notifications. |
| **Verification Expiry Sweeper** | `0 2 * * *` (Daily at 02:00) | `TutorVerificationExpiryService.sweep()` | Sweeps expiring document verifications; triggers renewal reminder notifications at 30, 14, and 3 days. |
| **Tutor Verification Advisory Sweeper** | `0 3 * * *` (Daily at 03:00) | `TutorsService.runVerificationExpirySweep()` | Uses PostgreSQL advisory locks (`pg_try_advisory_lock`) to prevent multi-instance concurrency collisions. |
| **Replacement Case Overdue Sweeper** | `*/30 * * * *` (Every 30 min) | `TutorReplacementService.runOverdueSweep()` | Checks pending replacement guarantee cases exceeding SLA; escalates to admin arbitration queue. |
| **Outbox Event Dispatcher** | Every 10 seconds | `OutboxWorkerService.pollAndDispatch()` | Polls `outbox` table, ensures at-least-once reliable delivery to event subscribers. |
