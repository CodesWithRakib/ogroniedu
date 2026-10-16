# 12 — API Specification

Base path: `/api/v1`. Use JSON except explicit multipart endpoints. Generate OpenAPI from authoritative DTOs/schemas; protect production docs if they expose sensitive operations.

Success list example: `{"data":[],"meta":{"nextCursor":null,"hasMore":false}}`. Error example: `{"error":{"code":"BOOKING_CONFLICT","message":"The requested time is no longer available.","requestId":"server-id","details":[]}}`. Never leak stack traces, SQL, tokens, internal review notes or private fields.

## Minimum endpoint inventory

- Auth: `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-contact`; `GET /auth/me`, `/auth/sessions`; `DELETE /auth/sessions/:sessionId`.
- Guardian/student: `GET/POST /guardians/me/children`; `POST /guardians/me/children/:studentId/link-request`; `DELETE /guardians/me/children/:studentId/link`; `GET/PATCH /students/me/profile`; `GET /students/:studentId/progress`.
- Tutor: `POST /tutors/onboarding`; `GET/PATCH /tutors/me/profile`; `POST /tutors/me/qualifications`; `GET /tutors/me/verification`; `PUT /tutors/me/availability`; `GET /tutors/:tutorId/public-profile`.
- Discovery: `GET /tutors`, `/subjects`, `/education-levels`; `POST /tutor-requests`; `GET /tutor-requests/me`; `POST /tutor-requests/:id/accept|decline`.
- Booking: `POST /bookings`; `GET /bookings/me`, `/bookings/:id`; `POST /bookings/:id/confirm|cancel|reschedule`; `GET /sessions/me`; `POST /sessions/:id/attendance|complete`.
- Learning: `POST /assignments`; `GET /students/:id/assignments`; `POST /assignments/:id/submissions`; `POST /assessments`; `POST /assessments/:id/results`; `POST /progress-reports`.
- Payments: `POST /payments/orders`; `GET /payments/me`, `/payments/:id/receipt`; `POST /payments/webhooks/:provider`; `POST /payments/:id/refund-requests`; admin payout/reconciliation endpoints.
- Support/admin: `POST /support/tickets`, `GET /support/tickets/me`, `POST /disputes`; admin verification queue/decision, audit logs, reference data and settings.

Every endpoint needs request/response schemas, auth/permission, ownership rule, validation, stable errors, pagination/rate limit, audit/idempotency behavior and tests. Use cursor pagination for large/high-churn lists and deterministic ordering. Use idempotency keys for payment/refund/critical retried operations.

Error codes include `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `STATE_TRANSITION_INVALID`, `BOOKING_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `PAYMENT_PENDING`, `PAYMENT_VERIFICATION_FAILED`, `RATE_LIMITED`.
