# Phase 04 — Test Plan

## 1. Automated test layers

| Layer | Command | Coverage |
| --- | --- | --- |
| API unit/integration | `pnpm --filter @ogroniedu/api test` | State machines, availability, recurring generation, reminders, guardian scope, ICS, payment boundary |
| API typecheck | `pnpm --filter @ogroniedu/api typecheck` | Strict TypeScript |
| API lint | `pnpm --filter @ogroniedu/api lint` | Repository lint rules |
| API build | `pnpm --filter @ogroniedu/api build` | Production compile |
| Web unit | `pnpm --filter @ogroniedu/web test` | Child scope, payment UI state, mappers |
| Web typecheck | `pnpm --filter @ogroniedu/web typecheck` | Strict TypeScript |
| Web lint | `pnpm --filter @ogroniedu/web lint` | Repository lint rules |
| Web build | `pnpm --filter @ogroniedu/web build` | Production compile |
| Database | `pnpm --filter @ogroniedu/database test` | Migration runner, constraints |
| Docs | `pnpm docs:validate` | Documentation conventions |

## 2. Required scenarios

### Booking lifecycle

- [ ] `requested → awaiting_payment` on accept; `requested → declined` on decline.
- [ ] Invalid transitions are rejected (`completed → requested`, `cancelled →
  confirmed`, client-supplied status ignored).
- [ ] Withdraw only by requester and only from `requested`.
- [ ] Duplicate active request is rejected (application + partial unique index).
- [ ] Every transition writes `booking_status_events` with actor/reason.
- [ ] Scheduling never changes booking status.
- [ ] Payment webhook confirms only `accepted|awaiting_payment`.
- [ ] Webhook is idempotent for a repeated provider event.
- [ ] Cancelled booking is not resurrected by a late payment.

### Scheduling & conflicts

- [ ] One-off session validates availability and blocked periods.
- [ ] Overlapping tutor sessions rejected by app check and by GiST constraint
  under concurrent inserts.
- [ ] Cancelled session releases the slot immediately.
- [ ] Reschedule validates the new slot and records previous time.
- [ ] Start requires a confirmed booking; complete requires `in_progress`.
- [ ] Completing the last session moves the booking to `completed`.

### Recurring series

- [ ] Weekly generation respects local time in `Asia/Dhaka`.
- [ ] DST zone generation round-trips (e.g. `America/New_York` spring/fall).
- [ ] Unsatisfiable horizon rejects instead of looping.
- [ ] Retry with the same idempotency key returns the existing series.
- [ ] Per-occurrence conflict aborts the whole batch with conflict details.
- [ ] Internal collisions (two slots same day/time) are rejected.
- [ ] Cancel `this_occurrence` leaves siblings untouched.
- [ ] Cancel `this_and_future` truncates the series and keeps history.
- [ ] Cancel `entire_series` marks the series cancelled.
- [ ] Reschedule `this_and_future` shifts the anchor and later occurrences,
  preserves earlier ones, and records audit metadata.
- [ ] Reschedule into an occupied slot is rejected for the whole operation.

### Guardian multi-child

- [ ] 0 children: self scope only.
- [ ] 1 child: default child scope.
- [ ] Many children: explicit selection; request/session lists are isolated.
- [ ] `studentId` for an unlinked child returns `403` for both requests and
  sessions.
- [ ] Guardian user id is never used as a student id.
- [ ] Cache keys differ per child (RTK Query arg includes `studentId`).

### Reminders & outbox

- [ ] Scheduler selects `scheduled` sessions starting within 30 minutes.
- [ ] Cancelled/in-progress/completed sessions are not selected.
- [ ] First run inserts one outbox event and sets `reminder_sent_at`.
- [ ] Second run inserts nothing (unique idempotency key + null guard).
- [ ] Outbox worker dispatches to student and tutor with the registry template.
- [ ] Outbox scheduler is disabled in tests unless explicitly enabled.

### Calendar export

- [ ] Valid `VCALENDAR` with CRLF and folded lines ≤75 octets.
- [ ] Stable `UID`, `DTSTAMP`, `LAST-MODIFIED`, `SEQUENCE` from `version`.
- [ ] Cancelled session emits `STATUS:CANCELLED`.
- [ ] No meeting URL/token appears in the payload.
- [ ] Only authorized sessions are exported.
- [ ] Raw `.ics` endpoint sets `text/calendar` and attachment filename.

### Payment boundary

- [ ] `POST /payments/orders/:id/sandbox-confirm` no longer exists.
- [ ] Unsigned webhooks are rejected for SSLCOMMERZ and bKash.
- [ ] Provider query failure cannot produce a successful verification.
- [ ] Amount/currency mismatch is rejected against both webhook and provider.
- [ ] Frontend shows success only when the backend booking is `confirmed`.
- [ ] Frontend redirects to provider checkout instead of simulating success.

## 3. Manual verification checklist

- [ ] Tutor configures weekly availability and a blocked period.
- [ ] Student requests a booking; tutor accepts; booking becomes
  `awaiting_payment`.
- [ ] Scheduling is blocked until payment confirms (paid booking).
- [ ] Successful webhook confirms the booking and schedules a session.
- [ ] Reminder appears ~30 minutes before the session for both participants.
- [ ] Guardian switches between two children and sees isolated lists.
- [ ] Guardian attempts a crafted `studentId` for an unlinked child → `403`.
- [ ] Calendar file imports into Google Calendar and Apple Calendar with correct
  local times; a rescheduled/cancelled event updates the existing entry.
- [ ] Tutor cancels a session; the slot becomes bookable again.

## 4. External verification (honest status)

- Google Calendar / Apple Calendar live sync: **not verified** in this
  environment. Only payload correctness is automated.
- SSLCOMMERZ / bKash live credentials and callbacks: **not available**.
  Webhook and adapter behavior is verified with unit/integration tests.
- Docker Compose: **not run** (Docker daemon unavailable). Local PostgreSQL 18
  is used for migration and DB tests.
- Concurrency: automated at the service level where feasible; the GiST
  exclusion constraint is additionally exercised by database tests.
