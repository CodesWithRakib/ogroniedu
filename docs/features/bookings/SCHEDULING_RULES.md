# Scheduling Rules

## Time model

- All instants are stored as PostgreSQL `timestamptz`.
- Each session and series stores an IANA `timezone` (default `Asia/Dhaka`).
- Recurring occurrences are generated from a **local calendar date + local wall
  time** in the series timezone using an offset-resolution utility, never by
  slicing ISO strings or relying on server-local time.
- DST-safe: a wall time that does not exist is rejected; an ambiguous wall time
  resolves to the earlier offset. Generated instants are always verified by
  round-tripping through the timezone.
- Display and notification copy use the stored timezone.

## Availability

Source: `tutor_availability` (`weekday`, `start_local`, `end_local`,
`timezone`, `effective_from`, `effective_until`, `is_active`).

- If a tutor has **no** active availability rows, scheduling is unrestricted
  (backwards compatible for existing tutors). The UI nudges tutors to publish
  availability.
- If rows exist, a session must:
  - fall entirely inside one active slot (same local weekday, start ≥ slot
    start, end ≤ slot end);
  - fall within the slot's effective dates.
- Sessions crossing midnight are rejected.
- Date-specific blocked periods live in `tutor_availability_exceptions`
  (`starts_at`, `ends_at`, `timezone`, `reason`). Any overlap rejects the
  session.

## One-off sessions

1. Authorization via `GuardianAccessService` (participant, active guardian,
   admin).
2. Booking must be `confirmed` or `in_progress`. Zero-price bookings may be
   confirmed server-side first.
3. `startsAt` must be valid and not more than 5 minutes in the past.
4. `endsAt` must be strictly after `startsAt`.
5. Availability and blocked-period checks run.
6. Overlap query for `scheduled|in_progress` sessions of the tutor runs.
7. Insert; a `23P01` exclusion violation becomes `409`.
8. No booking status change.

## Recurring series

Input: `bookingId`, `startDate` (`YYYY-MM-DD`), `count` (1–24),
`scheduleSlots[]` (`weekday` 0–6, `startLocal` `HH:MM`, `durationMinutes`
15–480), `timezone` (IANA), optional `idempotencyKey`.

Rules:

- The horizon is capped at **26 weeks** from `startDate`. The requested count
  must be reachable within that horizon; otherwise the request is rejected.
  Occurrences are never silently skipped.
- Occurrence dates are enumerated day-by-day from `startDate`; slots are
  emitted in weekday/time order; generation stops after `count` occurrences.
- Every occurrence is validated for availability and conflicts **before** any
  row is written. The response lists conflicting occurrences.
- All inserts (series, occurrences, outbox) happen in one transaction.
- Idempotency key = client key when supplied, otherwise
  `sha256(booking|startDate|timezone|count|normalized slots)`. A retry returns
  the existing series and its sessions.
- Series metadata is stored in `booking_session_series`; occurrences carry
  `series_id` and `occurrence_index`.

## Series changes

Scope is explicit:

- `this_occurrence`: anchor session only.
- `this_and_future`: anchor plus every later occurrence in the series.
- `entire_series`: every non-terminal occurrence.

Cancellation:

- Only `scheduled`/`reschedule_pending` occurrences are affected.
- Cancelled rows are preserved with assessment, reason, actor, and timestamp.
- `this_and_future` truncates `horizon_end_date` so no future occurrence can be
  generated.
- `entire_series` marks the series `cancelled`.

Reschedule:

- `newStartsAt` is the new start of the anchor occurrence. The delta is applied
  to every selected occurrence.
- Each moved occurrence is checked against other sessions (excluding the
  selected set) and against availability.
- Updates increment `version` and record previous times, actor, and reason in
  audit metadata.
- No row is deleted; history remains queryable.

## Conflict prevention

Two layers:

1. Application overlap query on `scheduled|in_progress`.
2. PostgreSQL GiST exclusion constraint
   `ex_tutor_session_overlap` on `tstzrange(starts_at, ends_at, '[)')`.

Cancelled sessions are outside the constraint predicate, so the slot is
immediately reusable. Recurring batches are validated as a set (including
internal collisions) before insert.

## Reminders

- Generated when `status = 'scheduled'`,
  `starts_at BETWEEN now() AND now() + 30 minutes`, and
  `reminder_sent_at IS NULL`.
- One outbox event per session with
  `idempotency_key = 'session.reminder:<sessionId>'`.
- The outbox insert and `reminder_sent_at` update are atomic. A duplicate
  scheduler run cannot emit a second reminder.
- Cancelled or rescheduled-out-of-window sessions are excluded by the query.

## Calendar export

- Instants are exported in UTC (`...Z`) to avoid timezone ambiguity; the
  session's IANA zone is exported as `X-WR-TIMEZONE` for display.
- `UID` is stable (`session-<id>@ogroniedu.com`).
- `SEQUENCE` comes from the session `version`, so updates and cancellations
  propagate.
- Cancelled sessions are exported with `STATUS:CANCELLED`.
- Meeting URLs/tokens are not embedded; the description points to OgroniEdu.
