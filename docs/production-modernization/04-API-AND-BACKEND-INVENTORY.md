# OgroniEdu — API and Backend Operation Inventory

**Status:** VERIFIED (2026-10-24)  
**Scope:** All NestJS controllers, services, events, webhooks, background jobs. Accurate as of commit `32712a9`.

---

## 1. Controller Inventory (36 Controllers)

| Module | Controller | Route Prefix | Endpoints | Guards |
|---|---|---|---|---|
| auth | `AuthController` | `/api/v1/auth` | 12 | `@Public()` on register/login/refresh/logout/request-code/magic-link/verify-code/reset-password; `@UseGuards(AuthGuard)` on me, logout, revoke-all; `@Roles(...ADMIN_ROLES)` on admin-only |
| bookings | `BookingsController` | `/api/v1/requests` | 7 | `@UseGuards(AuthGuard)` class-level; `@Roles(...ADMIN_ROLES)` on sweep-expired |
| bookings | `SessionsController` | `/api/v1` | 14 | `@UseGuards(AuthGuard)` on all except tutor calendar GET |
| bookings | `SessionSeriesController` | `/api/v1/session-series` | 3 | `@UseGuards(AuthGuard)` class-level |
| payments | `PaymentsController` | `/api/v1/payments` | 11 | `@UseGuards(AuthGuard)` on all except webhook; webhook has rawBody |
| payments | `TutorFinanceController` | `/api/v1/tutor/finance` | 4 | `@UseGuards(AuthGuard, RolesGuard)` + `@Roles('tutor')` class-level |
| payments | `AdminFinanceController` | `/api/v1/admin/finance` | 11 | `@UseGuards(AuthGuard, RolesGuard)` + `@Roles(...ADMIN_ROLES)` class-level |
| tutors | `TutorsController` | `/api/v1/tutors` | 27 | `@Public()` on search, public/:id; `@UseGuards(AuthGuard)` on me/* |
| tutors | `SavedTutorsController` | `/api/v1/saved-tutors` | 3 | `@UseGuards(AuthGuard)` class-level |
| tutors | `AdminTutorsController` | `/api/v1/admin/tutors` | 10 | `@UseGuards(AuthGuard, RolesGuard)` + `@Roles(...ADMIN_ROLES)` class-level; `@Roles(...TUTOR_REVIEW_ROLES)` on verification queue |
| learning | `LearningController` | `/api/v1/learning` | 20 | `@UseGuards(AuthGuard)` class-level |
| learning | `LessonContentController` | `/api/v1/learning` | 17 | `@UseGuards(AuthGuard)` class-level |
| learning | `LearningReportsController` | `/api/v1/learning/admin` | 2 | `@UseGuards(AuthGuard)` class-level |
| learning | `LearningGoalsController` | `/api/v1/learning/goals` | 3 | `@UseGuards(AuthGuard)` class-level |
| notifications | `NotificationController` | `/api/v1/notifications` | 8 | `@UseGuards(AuthGuard)` class-level |
| notifications | `ConversationsController` | `/api/v1/conversations` | 3 | `@UseGuards(AuthGuard)` class-level |
| notifications | `BookingMessagesController` | `/api/v1/bookings/:bookingId/messages` | 3 | `@UseGuards(AuthGuard)` class-level |
| admin | `AdminOperationsController` | `/api/v1/admin` | 17 | `@UseGuards(AuthGuard, RolesGuard)` class-level; `@Roles(...ADMIN_ROLES)` on most; `@Roles(SUPER_ADMIN_ROLE)` on roles, settings, impersonation |
| support | `SupportController` | `/api/v1/support/tickets` | 2 | `@Public()` on create; `@UseGuards(AuthGuard)` on mine |
| support | `AdminSupportController` | `/api/v1/admin/support-tickets` | 2 | `@UseGuards(AuthGuard, RolesGuard)` + `@Roles(...SUPPORT_TRIAGE_ROLES)` |
| trust | `DisputesController` | `/api/v1/disputes` | 4 | `@UseGuards(AuthGuard)` class-level |
| trust | `ReviewsController` | `/api/v1/reviews` | 4 | `@Public()` on tutor reviews GET; `@UseGuards(AuthGuard)` on create/reply/moderate |
| trust | `SafetyReportsController` | `/api/v1/safety-reports` | 14 | `@UseGuards(AuthGuard)` class-level |
| trust | `TutorReplacementController` | `/api/v1/tutor-replacements` | 10 | `@UseGuards(AuthGuard)` class-level; `@Roles(...ADMIN_ROLES)` on admin endpoints |
| health | `HealthController` | `/health`, `/api/health` | 5 | `@Public()`; `@HealthCheck()` on readiness |
| taxonomy | `TaxonomyController` | `/api/v1/taxonomy` | 18 | `@Public()` on GET; `@UseGuards(AuthGuard, RolesGuard)` + `@Roles(...ADMIN_ROLES)` on mutations |
| organizations | `OrganizationsController` | `/api/v1/organizations` | 8 | `@UseGuards(AuthGuard)` class-level |
| organizations | `AdminOrganizationsController` | `/api/v1/admin/organizations` | 2 | `@UseGuards(AuthGuard, RolesGuard)` + `@Roles(...ADMIN_ROLES)` |
| files | `FilesController` | `/api/v1/files` | 2 | `@UseGuards(AuthGuard)` class-level |
| feedback | `FeedbackController` | `/api/v1/feedback` | 3 | `@UseGuards(AuthGuard)` on create/my/:id |
| feedback | `AdminFeedbackController` | `/api/v1/admin/feedback` | 2 | `@UseGuards(AuthGuard, RolesGuard)` + `@Roles('admin','super_admin','support_agent')` |
| public | `PublicController` | `/api/v1/public` | 1 | `@Public()` |
| analytics | `AnalyticsController` | `/api/v1/analytics` | 11 | `@UseGuards(AuthGuard, RolesGuard)`; `@Public()` on events POST; `@Roles('tutor')` on tutors/me; `@Roles(...ADMIN_ROLES)` on admin endpoints |
| guardians | `GuardiansController` | `/api/v1/guardians` | 7 | `@UseGuards(AuthGuard, RolesGuard)`; `@Roles('guardian',...ADMIN_ROLES)` on children; `@Roles('student',...ADMIN_ROLES)` on my-guardians; `@UseGuards(GuardianStudentGuard)` on children/:studentId |
| onboarding | `OnboardingController` | `/api/v1/onboarding` | 2 | `@UseGuards(AuthGuard)` class-level |
| users | `UsersController` | `/api/v1/users` | 5 | `@UseGuards(AuthGuard)` class-level |

**Total: 227 endpoints** (approximate count across all controllers).

---

## 2. Non-HTTP Entry Points

| Type | Source | Handler / Consumer | Purpose |
|---|---|---|---|
| WebSocket | `/notifications` namespace | `NotificationGateway` | Real-time notification dispatch, chat room join/leave, typing indicators, read receipts |
| Scheduled Job | `BookingExpiryScheduler` (cron: every 5 min) | `BookingExpiryService.sweepExpiredBookings()` | 48h unaccepted request expiry, 24h payment TTL expiry |
| Scheduled Job | `TutorVerificationExpiryScheduler` (cron: daily) | `TutorVerificationExpiryService.sweep()` | Level/document expiry, reminder notifications |
| Scheduled Job | `TutorVerificationSweepScheduler` (cron: daily) | `TutorsService.runVerificationExpirySweep()` | Advisory-lock protected sweep |
| Scheduled Job | `TutorReplacementScheduler` (cron: every 30 min) | `TutorReplacementService.runOverdueSweep()` | Overdue replacement case sweep |
| Outbox Worker | `OutboxWorkerService` (interval: 10s) | Event dispatch loop | Transactional outbox pattern: reads pending events, dispatches to handlers |
| Webhook | `/api/v1/payments/webhook/:provider` | `PaymentWebhooksService.handleWebhook()` | SSLCommerz / bKash / Nagad callbacks, signature verification, idempotency |
| Queue Consumer | `NotificationService` (via outbox) | `NotificationGateway.sendToUser()`, in-app notification creation | Async notification delivery |

---

## 3. Service Dependency Map (Key Services)

| Service | Module | Key Dependencies | Key Events Emitted |
|---|---|---|---|
| `AuthService` | auth | UsersService, JwtService, ConfigService | `auth.login`, `auth.logout`, `auth.password_reset` |
| `BookingsService` | bookings | BookingsRepository, TutorsService, UsersService, NotificationService | `booking.requested`, `booking.accepted`, `booking.confirmed`, `booking.completed` |
| `SchedulingService` | bookings | SessionsRepository, BookingsService, TutorsService, NotificationService | `session.scheduled`, `session.rescheduled`, `session.cancelled`, `session.completed`, `session.no_show` |
| `PaymentsService` | payments | PaymentOrdersRepository, LedgerService, TutorsService, UsersService | `payment.order_created`, `payment.succeeded`, `payment.failed`, `payment.refund_requested` |
| `LedgerService` | payments | LedgerEntriesRepository | `ledger.balance_changed` |
| `PayoutsService` | payments | PayoutsRepository, LedgerService, TutorsService | `payout.requested`, `payout.approved`, `payout.processed` |
| `TutorsService` | tutors | TutorsRepository, FilesService, TaxonomyService, LearningService | `tutor.profile_updated`, `tutor.verification_submitted`, `tutor.verified` |
| `LearningService` | learning | AssignmentsRepository, SubmissionsRepository, LessonsRepository, MaterialsRepository | `assignment.created`, `assignment.published`, `submission.submitted`, `submission.graded`, `progress_report.generated` |
| `NotificationService` | notifications | NotificationsRepository, NotificationGateway | `notification.dispatched` |
| `BookingMessagesService` | notifications | MessagesRepository, NotificationGateway | `message.sent`, `message.read`, `message.typing` |
| `DisputesService` | trust | DisputesRepository, BookingsService, PaymentsService, NotificationService | `dispute.opened`, `dispute.resolved` |
| `SafetyReportsService` | trust | SafetyReportsRepository, TutorsService, NotificationService | `safety.report.created`, `safety.hold.applied`, `safety.case.resolved` |
| `TutorReplacementService` | trust | ReplacementCasesRepository, BookingsService, TutorsService, NotificationService | `replacement.requested`, `replacement.accepted`, `replacement.completed` |
| `OnboardingService` | onboarding | UsersRepository, OnboardingStepsRepository | `onboarding.step_completed` |
| `FilesService` | files | FileAssetsRepository | `file.uploaded` |
| `AnalyticsService` | analytics | ProductAnalyticsEventsRepository | `analytics.event_tracked` |
| `AdminOperationsService` | admin | UsersService, BookingsService, TutorsService, PaymentsService | `admin.user_suspended`, `admin.impersonation.started`, `admin.settings_updated` |

---

## 4. Domain Events (Contract Summary)

All events are emitted via the transactional outbox (`outbox` table). Handlers consume via `OutboxWorkerService`.

| Event | Payload | Consumers |
|---|---|---|
| `booking.requested` | `{ bookingId, studentId, tutorId, subject, requesterType }` | NotificationService → guardian/student, tutor |
| `booking.accepted` | `{ bookingId, tutorId, studentId }` | NotificationService → student, guardian |
| `booking.confirmed` | `{ bookingId, paymentOrderId }` | PaymentsService (escrow release), NotificationService |
| `booking.completed` | `{ bookingId, sessionId }` | PaymentsService (settle milestone), NotificationService |
| `session.scheduled` | `{ sessionId, bookingId, tutorId, studentId, startAt, endAt }` | NotificationService → both parties |
| `session.completed` | `{ sessionId, bookingId }` | PaymentsService, LearningService |
| `session.no_show` | `{ sessionId, bookingId, reason }` | NotificationService, AnalyticsService |
| `payment.succeeded` | `{ paymentOrderId, userId, amount }` | NotificationService, LedgerService |
| `tutor.verified` | `{ tutorUserId, level }` | NotificationService → tutor |
| `replacement.requested` | `{ caseId, studentId, originalTutorId }` | NotificationService → admin, tutors |
| `safety.hold.applied` | `{ tutorId, reason, adminId }` | NotificationService → tutor, admin |
| `message.sent` | `{ messageId, bookingId, senderId, content }` | NotificationGateway (real-time chat), NotificationService |
| `auth.login` | `{ userId, ip }` | AuditModule |

---

## 5. DTOs and Validation (Contract Layer)

Shared DTOs in `@ogroniedu/contracts`. Key categories:

- **Auth**: `RegisterDto`, `LoginDto`, `RefreshTokenDto`, `RequestCodeDto`, `RequestMagicLinkDto`, `ConsumeMagicLinkDto`, `VerifyCodeDto`, `ResetPasswordDto`
- **Bookings**: `CreateBookingRequestDto`, `RespondBookingRequestDto`, `WithdrawBookingRequestDto`, `CreateSessionDto`, `CreateRecurringSessionsDto`, `RescheduleSessionDto`, `CancelSessionDto`, `CompleteSessionDto`, `UpdateMeetingUrlDto`, `SeriesCancelDto`, `SeriesRescheduleDto`
- **Payments**: `CreatePaymentOrderDto`, `RequestRefundDto`, `SettleMilestoneDto`, `DecideRefundDto`, `ConfirmManualRefundDto`, `RequestPayoutDto`, `ApprovePayoutDto`, `RejectPayoutDto`, `MarkPayoutPaidDto`, `MarkPayoutFailedDto`
- **Tutors**: `UpdateTutorProfileDto`, `AddVerificationDocumentDto`, `SubmitVerificationLevelDto`, `ReviewerDecisionDto`, `AssignVerificationLevelDto`, `VerifyVerificationDocumentDto`, `AddTutorQualificationDto`, `AddTutorSubjectDto`, `SetServiceAreasDto`, `SetAvailabilityDto`, `CreateBlockedPeriodDto`
- **Learning**: `MarkAttendanceDto`, `CreateAssignmentDto`, `SubmitAssignmentDto`, `GradeSubmissionDto`, `CreateLessonPlanDto`, `UpdateLessonPlanDto`, `UploadLearningMaterialDto`, `CreateLinkMaterialDto`
- **Trust**: `CreateDisputeDto`, `ResolveDisputeDto`, `CreateReviewDto`, `TutorReplyDto`, `ModerateReviewDto`, `CreateSafetyReportDto`, `UpdateCaseStatusDto`, `AssignCaseDto`, `CreateCaseMessageDto`, `ApplySafetyActionDto`, `RevokeSafetyActionDto`, `ResolveSafetyCaseDto`, `CreateReplacementCaseDto`, `UpdateReplacementCaseDto`, `ExtendReplacementDeadlineDto`
- **Notifications**: `UpdateNotificationPreferencesDto`, `DispatchNotificationDto`, `SendBookingMessageDto`
- **Guardians**: `RegisterChildDto`, `LinkChildRequestDto`, `VerifyLinkDto`, `RevokeLinkDto`
- **Onboarding**: `CompleteOnboardingStepDto`
- **Users**: `UpdateProfileDto`, `UpsertStudentProfileDto`, `DeleteAccountDto`
- **Files**: `UploadEvidenceFileDto`

---

## 6. Background Jobs & Schedulers

| Job | Schedule | Module | Advisory Lock |
|---|---|---|---|
| `BookingExpiryScheduler` | Every 5 minutes | bookings | `BOOKING_EXPIRY_LOCK_KEY = 913402308` |
| `TutorVerificationExpiryScheduler` | Daily 02:00 | tutors | `TUTOR_VERIFICATION_LOCK_KEY` |
| `TutorVerificationSweepScheduler` | Daily 03:00 | tutors | `TUTOR_VERIFICATION_SWEEP_LOCK_KEY` |
| `TutorReplacementScheduler` | Every 30 minutes | trust | `REPLACEMENT_SWEEP_LOCK_KEY` |
| `OutboxWorkerService` | Every 10 seconds | notifications | None (polls DB) |

---

## 7. Error Handling Conventions

| Layer | Convention |
|---|---|
| Global | `AllExceptionsFilter` catches all, wraps in `{ success: false, error: { code, message, details? }, meta: { requestId, timestamp } }` |
| Validation | `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true` |
| SQL Errors | Redacted to `INTERNAL_ERROR` (table/column names never exposed) |
| Unauthorized | `401 UNAUTHORIZED` with `Unauthorized access token` |
| Forbidden | `403 FORBIDDEN` with `Insufficient permissions` |
| Not Found | `404 NOT_FOUND` with `Resource not found` |
| Conflict | `409 CONFLICT` with `Resource conflict` (e.g., double-booking) |
| Rate Limited | `429 TOO_MANY_REQUESTS` with `retryAfter` seconds |

---

## 8. Security Headers (Middleware)

`SecurityHeadersMiddleware` applies to all routes:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Content-Security-Policy: default-src 'self' ...`

---

## 9. API Contract Standard (Phase 15 Verified)

**Success Envelope:**
```json
{ "success": true, "data": T, "message?": string, "meta": { "requestId": string, "pagination?": PaginationMeta } }
```

**Error Envelope:**
```json
{ "success": false, "error": { "code": string, "message": string, "details?": any }, "meta": { "requestId": string, "timestamp": string } }
```

**Pagination Meta:**
- Offset: `{ strategy: 'offset', page, pageSize, totalItems, totalPages, hasNextPage, hasPreviousPage }`
- Cursor: `{ strategy: 'cursor', nextCursor, hasNextPage, pageSize }`

---

## 10. Known Gaps / Weaknesses

| Gap | Location | Impact |
|---|---|---|
| Missing `GET /api/v1/files/:fileId/download` | `FilesController` | RLD-001 — tutor evidence retrieval broken |
| `test-dispatch` endpoint unguarded | `NotificationController` | RLD-002 — spoofing vector |
| Dev JWT fallbacks in gateway/service | `notification.gateway.ts`, `files.service.ts` | RLD-006 — prod secret hardening needed |

---

*End of `04-API-AND-BACKEND-INVENTORY.md`.*