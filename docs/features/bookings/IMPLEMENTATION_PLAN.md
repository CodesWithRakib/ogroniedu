# Phase 04 — Implementation Plan

## Objective

Deliver production-grade booking management, scheduling, recurring weekly
classes, guardian multi-child isolation, conflict prevention,
cancellation/rescheduling, calendar export, reminders, and a payment boundary —
without starting escrow/accounting work that belongs to a later phase.

## Non-goals

- Escrow release, tutor payouts, refunds execution, ledger reconciliation.
- Live payment-provider certification.
- Admin analytics for bookings.
- Any later-phase feature.

## Workstreams

### 1. Persistence (migration `019_booking_scheduling_integrity.sql`)

- `booking_session_series` (booking, tutor, student, timezone, start date,
  slots, planned occurrences, horizon end, idempotency key, status, creator).
- `booking_sessions` additions: `series_id`, `occurrence_index`,
  `reminder_sent_at`, `status_changed_at`, `status_changed_by`,
  `cancelled_at`, `cancellation_reason`, `rescheduled_at`, `rescheduled_by`,
  `reschedule_reason`, `version`.
- `tutor_availability_exceptions` (date-specific blocked periods).
- `booking_status_events` (per-booking transition history).
- `outbox_events.idempotency_key` + partial unique index.
- Partial unique index on active duplicate booking requests.
- Reminder scan index.

### 2. Domain rules

- Central `BOOKING_TRANSITIONS` and `SESSION_TRANSITIONS` maps with
  `assertBookingTransition` / `assertSessionTransition`.
- Remove all implicit status assignment from scheduling.
- Record every booking transition in `booking_status_events` with actor,
  reason, and timestamp.
- Session changes record actor/reason/timestamp plus a `version` increment used
  by calendar export (`SEQUENCE`).

### 3. Availability and conflicts

- `TutorAvailabilityService.assertWithinAvailability()`:
  - no configured availability = unrestricted (backwards compatible);
  - otherwise the session must fall entirely inside an active weekday slot in
    the slot's IANA timezone, respecting effective dates;
  - overlapping blocked periods are rejected.
- Hook the check into one-off scheduling, recurring generation, and
  rescheduling.
- Keep the app overlap query and the GiST exclusion constraint; catch `23P01`
  and surface `409 Conflict`.
- Recurring generation checks all occurrences before inserting any row.

### 4. Recurring series

- Deterministic occurrence generation from a local start date, weekly slots,
  and an IANA timezone using a zoned-time utility (no string slicing, no
  server-local time).
- Bounded horizon (max 26 weeks / 24 occurrences); if the requested count
  cannot fit, reject — never silently skip.
- Idempotency key derived from booking + start date + timezone + slots + count,
  unique per booking. A retry returns the existing series.
- Transactional insert of series + occurrences + outbox event.
- Series operations:
  - `this_occurrence`
  - `this_and_future`
  - `entire_series`
- Cancel keeps rows and history; reschedule updates in place, increments
  version, and records previous times in audit metadata.

### 5. Guardian multi-child isolation

- `GET /requests?studentId=` with explicit revalidation (self, active guardian,
  or admin) and `403` on cross-child access.
- `GET /sessions?studentId=` performs the same explicit revalidation instead of
  silently returning an empty list.
- Frontend: shared child-scope selector on requests and sessions pages; RTK
  Query args include `studentId` so cache entries are isolated per child.
- 0 children → self scope; 1 child → default to that child; many → selector.
- Never substitute the guardian user id for a student id.

### 6. Notifications and reminders

- Runtime schedulers (re-armed timer + `pg_try_advisory_lock`):
  - outbox worker poll (default 5s);
  - session reminder generation (default 60s).
- Reminder window: `starts_at` within the next 30 minutes, `scheduled`, and
  `reminder_sent_at IS NULL`.
- Insert an outbox event with `idempotency_key = session.reminder:<sessionId>`
  and mark `reminder_sent_at` in one transaction.
- Outbox handler dispatches `session.reminder` to the student and tutor using
  the registry template. Remove the incorrect "class started" reuse.
- `session.scheduled` no longer masquerades as a reminder.

### 7. Calendar export

- Keep UTC `DTSTART`/`DTEND` (unambiguous instants) and add
  `X-WR-TIMEZONE` from the session timezone for display.
- Add `SEQUENCE` from `version`, `LAST-MODIFIED`, `DTSTAMP`.
- Emit `STATUS:CANCELLED` for cancelled sessions and keep stable `UID`s.
- Do not embed meeting URLs/tokens; point to the app instead.
- RFC 5545 line folding at 75 octets and CRLF line endings.
- Add a raw `text/calendar` download endpoint; keep the JSON endpoint for the
  existing UI.

### 8. Payment boundary

- Delete the client-triggerable sandbox confirmation path.
- Frontend creates an order and redirects to the provider checkout; success is
  only shown when the backend booking/order status is authoritative.
- Adapters reject unsigned webhooks and never fabricate a successful
  server-to-server query.
- Webhook confirms the booking only from `accepted`/`awaiting_payment`, inside
  the payment transaction, with amount/currency checks against both the
  webhook body and the provider query.
- Scheduling never confirms a booking. Paid bookings must already be
  `confirmed`; zero-price bookings may be confirmed by an explicit server-side
  transition.

### 9. Tests and validation

- Unit/integration: state machine, availability, zoned time/DST, recurring
  idempotency and conflicts, series scopes, guardian isolation, reminder
  dedupe, ICS semantics, payment boundary.
- Database: migration idempotency, new tables, duplicate-request index,
  outbox idempotency.
- Commands: API tests/typecheck/lint/build, web tests/typecheck/lint/build,
  database tests, migration against local PostgreSQL.

## Sequencing

1. Docs (this file and companions).
2. Migration + entities.
3. State machine + booking/session transitions.
4. Availability + scheduling/recurring.
5. Guardian scope.
6. Reminders + schedulers.
7. ICS + payment boundary.
8. Frontend wiring.
9. Tests + validation.
10. `IMPLEMENTATION_REPORT.md` and stop for approval.
