# Booking & Scheduling Integrity — Implementation Report (Phase 04)

**Date:** 2026-10-20
**Scope:** booking lifecycle, scheduling and availability, recurring weekly
classes, guardian multi-child isolation, conflict prevention,
cancellation/rescheduling policy, calendar export, reminders, and the payment
boundary. Escrow release, refunds, tutoring payouts, and accounting
reconciliation remain out of scope.

Legend: **implemented** · **automated-tested** · **manually-verified** (running
API + real PostgreSQL) · **externally-verified** (third-party provider
confirmed) · **unverified**.

**Evidence rule:** results below come from commands and live requests run in
this repository during this session. Anything not exercised is labelled
unverified rather than inferred from code.

---

## 1. Audit findings (summary)

The full audit is in `AUDIT.md`. The highest-impact baseline problems were:

| ID | Finding | Resolution |
| --- | --- | --- |
| B-01 | `PaymentsService.sandboxConfirmOrder()` fabricated provider success and was exposed to any authenticated user | Removed service method; route returns `410 Gone`; all success now comes from verified webhooks/authoritative status |
| B-02 | Booking status was assigned inline with no transition map or per-booking history | Central booking/session transition maps + `booking_status_events` |
| B-03 | Tutor availability was stored but never enforced; no date-specific blocks | Availability service, blocked-period table/endpoints, enforcement on create and reschedule |
| B-04 | Recurring sessions were an unbounded loop, not idempotent, hard-coded timezone behavior | Bounded series entity, DST-safe zoned-time utility, deterministic idempotency, transactional generation |
| B-05 | Outbox worker and `session.reminder` were dormant | Outbox scheduler + idempotent 30-minute reminder generator/scheduler |
| B-06 | Guardian child filtering existed for detail reads but not consistently for lists | Server-side child revalidation and RTK cache keys for requests/sessions |
| B-07 | ICS export had weak update/cancellation semantics | Stable UID, `SEQUENCE`, `LAST-MODIFIED`, cancelled status, raw `text/calendar` download, no meeting token |
| B-08 | Paid bookings could be confirmed by scheduling/frontend actions | Payment webhook is the confirmation path; frontend polls backend booking/order status |

Baseline before changes: API **65 files / 649 tests**, web **33 files / 207
tests**, typechecks clean, local PostgreSQL with 18 migrations. Final results are
in §16–17.

---

## 2. Scope and requirement mapping

| Requirement | Status | Evidence |
| --- | --- | --- |
| Booking lifecycle with server-owned transitions | implemented, automated-tested | `booking-status-transitions.ts`, `booking-lifecycle.ts`, service guards, §5 |
| One-off and recurring scheduling | implemented, automated-tested | `/sessions`, `/sessions/recurring`, series service, §6–7 |
| IANA timezone and DST-safe local-time intent | implemented, automated-tested | `zoned-time.ts`, DST tests, §7 |
| Availability and blocked periods | implemented, automated-tested | `TutorAvailabilityService`, endpoints, tests, §6 |
| DB-level overlap prevention | implemented, automated-tested at constraint level | GiST `ex_tutor_session_overlap`, schema tests; live parallel race not run, §6 |
| Guardian 0/1/many children; no cross-child leakage | implemented, automated-tested, manually-verified | server 403 + child-scoped RTK args; live forged-child request returned 403, §8 |
| Cancellation/rescheduling with history and slot release | implemented, automated-tested | transition guards, policy helper, series scopes, §9 |
| ICS export with stable IDs/update/cancel semantics | implemented, automated-tested, manually-verified | unit output + live `200 text/calendar`, §10 |
| Notifications for booking/session events | implemented, automated-tested | existing registry dispatch + outbox mappings, §11 |
| 30-minute reminders, idempotent | implemented, automated-tested; scheduler startup manually observed | `session-reminder.service.ts`, duplicate-key test, §11 |
| Payment boundary; no frontend confirmation | implemented, automated-tested, manually-verified for removed path | webhook-only confirmation; sandbox route live `410`, §12 |
| No escrow/accounting work started | respected | no payout/refund/ledger reconciliation changes beyond existing modules |

Non-goals confirmed: escrow release, refund execution, tutor payout,
reconciliation, live payment-provider certification, admin booking analytics,
and later-phase features.

---

## 3. Files created / modified

### Backend — new

- `apps/api/src/modules/bookings/constants/booking-status-transitions.ts`
- `apps/api/src/modules/bookings/constants/session-status-transitions.ts`
- `apps/api/src/modules/bookings/entities/booking-session-series.entity.ts`
- `apps/api/src/modules/bookings/entities/booking-status-event.entity.ts`
- `apps/api/src/modules/bookings/dto/create-recurring-sessions.dto.ts`
- `apps/api/src/modules/bookings/dto/series-change.dto.ts`
- `apps/api/src/modules/bookings/utils/zoned-time.ts`
- `apps/api/src/modules/bookings/utils/session-series.ts`
- `apps/api/src/modules/bookings/utils/cancellation-policy.ts`
- `apps/api/src/modules/bookings/utils/booking-lifecycle.ts`
- `apps/api/src/modules/bookings/services/session-scheduling.service.ts`
- `apps/api/src/modules/bookings/services/session-rescheduling.service.ts`
- `apps/api/src/modules/bookings/services/session-series.service.ts`
- `apps/api/src/modules/bookings/services/session-reminder.service.ts`
- `apps/api/src/modules/bookings/services/session-reminder.scheduler.ts`
- `apps/api/src/modules/bookings/services/session-queries.service.ts`
- `apps/api/src/modules/bookings/services/session-booking.helpers.ts`
- `apps/api/src/modules/bookings/session-series.controller.ts`
- `apps/api/src/modules/notifications/outbox.scheduler.ts`
- `apps/api/src/modules/tutors/entities/tutor-availability-exception.entity.ts`
- `apps/api/src/modules/tutors/services/tutor-availability.service.ts`
- `packages/database/src/migrations/019_booking_scheduling_integrity.sql`
- `packages/database/src/migrations/021_review_bilingual_fields.sql` (seed
  compatibility fix outside the booking feature; see §4)

### Backend — modified

- `bookings.service.ts`, `bookings.controller.ts`, `bookings.module.ts`
- `sessions.controller.ts`, `booking-session.entity.ts`,
  `outbox-event.entity.ts`
- `notifications.module.ts`, `outbox-worker.service.ts`
- `payments.controller.ts`, `payments.service.ts`,
  `payment-webhooks.service.ts`, SSLCOMMERZ/bKash adapters
- tutor availability DTO/controller/module/service wiring
- `apps/api/test/bookings.service.spec.ts`
- `apps/api/test/bookings.controller.spec.ts`
- `apps/api/test/scheduling.service.spec.ts`
- `apps/api/test/e2e-tutoring-lifecycle.spec.ts`
- `apps/api/test/booking-phase04.spec.ts` (new focused suite)
- `packages/database/test/migration.spec.ts`
- `packages/database/test/bcdr-recovery.spec.ts`

### Frontend — modified/new

- `apps/web/src/features/guardian/hooks/use-child-scope.ts`
- `apps/web/src/features/guardian/components/ChildScopeSelect.tsx`
- `apps/web/src/features/bookings/pages/requests-page.tsx`
- `apps/web/src/features/bookings/pages/sessions-page.tsx`
- `apps/web/src/features/bookings/components/sessions/scheduleModal.tsx`
- `apps/web/src/components/scheduling/SessionScheduleCalendar.tsx`
- `apps/web/src/features/bookings/hooks/use-booking-requests.ts`
- `apps/web/src/features/bookings/hooks/use-schedule-session.ts`
- `apps/web/src/features/bookings/hooks/use-sessions-calendar.ts`
- `apps/web/src/features/bookings/types/session.types.ts`
- `apps/web/src/store/services/bookings-api.ts`
- `apps/web/src/features/payments/hooks/use-payment-order.ts`
- `apps/web/src/features/payments/hooks/use-checkout-flow.ts`
- `apps/web/src/features/payments/pages/payments-page.tsx`
- `apps/web/src/components/payments/PaymentCheckoutView.tsx`
- `apps/web/src/app/[locale]/bookings/[id]/page.tsx`
- `apps/web/src/app/[locale]/bookings/[id]/pay/page.tsx`
- `apps/web/src/store/services/payments-api.ts`
- `apps/web/messages/en.json`, `apps/web/messages/bn.json`

### Documentation

- `docs/features/bookings/AUDIT.md`
- `docs/features/bookings/IMPLEMENTATION_PLAN.md`
- `docs/features/bookings/BOOKING_STATE_MACHINE.md`
- `docs/features/bookings/SCHEDULING_RULES.md`
- `docs/features/bookings/ROLE_PERMISSION_MATRIX.md`
- `docs/features/bookings/TEST_PLAN.md`
- `docs/features/bookings/IMPLEMENTATION_REPORT.md` (this file)

No booking module was rebuilt or duplicated. Existing API clients, RTK Query
cache, UI primitives, date utilities, and design tokens were extended in place.

---

## 4. Database migrations and data model

`019_booking_scheduling_integrity.sql` is additive and applied to
`ogroniedu_dev`:

- `booking_status_events`: per-booking `from_status`, `to_status`, actor,
  role, reason, safe metadata, `created_at`; indexed by booking/time.
- `booking_session_series`: booking, tutor, student, IANA timezone, start and
  horizon dates, 1–24 planned occurrences, JSON slots, status, idempotency key,
  creator; `UNIQUE (booking_id, idempotency_key)`.
- `booking_sessions` additions: `series_id`, `occurrence_index`,
  `reminder_sent_at`, status-change actor/time, cancellation actor/time/reason,
  reschedule actor/time/reason, `version`.
- Unique partial `(series_id, occurrence_index)` prevents duplicate occurrences.
- Partial index on due reminders
  (`status = 'scheduled' AND reminder_sent_at IS NULL`).
- `tutor_availability_exceptions`: tutor, `timestamptz` window, timezone,
  reason, creator; `CHECK (ends_at > starts_at)`.
- `outbox_events.idempotency_key` with a partial unique index.
- Partial unique `uq_bookings_active_request` on
  `(student_user_id, tutor_user_id, subject_id) WHERE status = 'requested'`.
- Existing GiST exclusion `ex_tutor_session_overlap` remains the final
  concurrency arbiter for `scheduled|in_progress` windows.

`021_review_bilingual_fields.sql` was required because the seed references
`reviews.comment_en/comment_bn/tutor_response_en/tutor_response_bn`, which
migration `020` did not add. It is a pre-existing seed/schema mismatch fix, not
new booking scope. Migration and BCDR tests now expect 21 migrations.

Verified live:

```text
schema_migrations rows: 21
019_booking_scheduling_integrity.sql
020_bilingual_schema_cleanup.sql
021_review_bilingual_fields.sql
to_regclass: booking_session_series | booking_status_events | tutor_availability_exceptions
```

The audit preamble still says “18 migrations applied” because it records the
state observed before implementation. Current state is 21.

---

## 5. Booking state machine

Source of truth: `BOOKING_TRANSITIONS` in
`constants/booking-status-transitions.ts`. Services map an action to a target
status and call `applyBookingTransition()`; clients never submit a status.

- `requested → accepted | awaiting_payment | declined | cancelled | expired`
- `accepted → awaiting_payment | confirmed | cancelled | declined | expired`
- `awaiting_payment → confirmed | cancelled | expired`
- `confirmed → in_progress | completed | cancelled | disputed | replacement_requested`
- `in_progress → completed | cancelled | disputed | replacement_requested`
- `completed → disputed | replacement_requested`
- `declined`, `cancelled`, `expired` are terminal.

Behavior:

- Tutor accept maps a paid booking to `awaiting_payment` directly (or via the
  legacy `accepted` state); a zero-price booking is confirmed server-side.
- Withdrawal is restricted to `requested`; it cannot be used to cancel an
  accepted/paid booking through the request endpoint.
- Every transition writes `booking_status_events` and the generic audit log
  with actor, role, reason, and timestamp.
- Invalid transitions return `400`; duplicate active requests are rejected by
  both an application check and partial unique `23505` handling.
- Payment webhook transitions are additionally guarded so a late webhook cannot
  resurrect a cancelled booking.
- Sessions never confirm a paid booking; session scheduling requires a
  `confirmed|in_progress` booking.

Automated coverage: transition map tests, accept/decline service tests,
webhook transition tests, duplicate/failed-transition tests (§16).

---

## 6. Scheduling, availability, and conflict prevention

### Availability

- Weekly `tutor_availability` rows are now enforced; no active rows means
  “unconfigured/allowed” for backward compatibility.
- A session must fit inside one active slot on the same local weekday and
  within the slot’s effective dates. Midnight-crossing sessions are rejected.
- Date-specific blocked periods are explicit exceptions and reject any overlap.
- Availability is checked for one-off creation, every recurring occurrence, and
  every rescheduled target. Errors return a readable `409` with the reason.

Endpoints:

- `GET|PUT /api/v1/tutors/me/availability`
- `GET|POST /api/v1/tutors/me/availability/blocks`
- `DELETE /api/v1/tutors/me/availability/blocks/:id`

### Conflict prevention

1. Application overlap query over `scheduled|in_progress`.
2. PostgreSQL GiST exclusion constraint
   `ex_tutor_session_overlap` on `tstzrange(starts_at, ends_at, '[)')`.
   Adjacent slots pass; overlapping inserts become `409`.
3. Cancelled sessions leave the exclusion predicate immediately, releasing the
   slot. Rebooking uses the normal availability/overlap checks.

`startSession` requires a `confirmed|in_progress` booking; `completeSession`
requires `in_progress` and can complete the booking when no active sessions
remain. Meeting URLs are accepted only in active states.

Automated coverage: adjacency/overlap scheduling tests, availability unit
tests, transition tests, and DB constraint tests. A live two-connection
parallel-insert race was not executed in this session; the DB constraint is the
protection if it occurs.

---

## 7. Recurring series and timezone handling

- Creation endpoint: `POST /api/v1/sessions/recurring`.
- Input: booking, `startDate` `YYYY-MM-DD`, `count` 1–24, `scheduleSlots[]`
  (weekday 0–6, `HH:MM`, 15–480 minutes), IANA timezone, optional idempotency
  key.
- Bounded horizon: 26 weeks. Unreachable counts are rejected, never silently
  skipped.
- Occurrence generation uses local date + wall time and `zonedDateTimeToUtc()`;
  it never slices ISO strings or relies on server-local time.
- DST: spring-forward nonexistent wall times are rejected; ambiguous fall-back
  times resolve to the earlier offset; every generated instant is verified by
  round-trip.
- All occurrences are prechecked for availability/conflicts before any row is
  written. The series, occurrences, and outbox event commit in one transaction.
- Idempotency: client key or
  `sha256(booking|startDate|timezone|count|normalized slots)`, with
  `UNIQUE (booking_id, idempotency_key)`. Retries return the existing series.
- Scoped changes:
  - `this_occurrence`: anchor only.
  - `this_and_future`: anchor and later occurrences; horizon is truncated.
  - `entire_series`: all non-terminal occurrences; series becomes cancelled.
- Reschedules apply a consistent delta, recheck every target, increment
  `version`, and preserve old times/actor/reason in history. No rows are deleted.

Frontend: the schedule modal supports one-time vs weekly series (one weekly slot
in the focused UI); the backend supports multiple slots. The sessions calendar
loads real series-backed sessions and uses the same child scope.

Automated coverage: DST round-trip, spring-forward/fall-back, weekly ordering,
hard-cap rejection, duplicate-slot rejection, deterministic idempotency key, and
existing recurring scheduling tests.

---

## 8. Guardian multi-child isolation

- Backend revalidates any supplied `studentId` against active
  `guardian_student_links`; a guardian user ID is never treated as the student
  ID.
- Forged/unlinked child IDs return `403` before data is read.
- Requests and sessions lists are scoped to the selected child; all-children
  mode uses active links, not a client claim.
- Frontend `useChildScope` handles 0, 1, and many children and exposes an
  identity chip for 0/1 and a selector for many.
- `studentId` is part of the RTK Query args/cache key, preventing cross-child
  cache reuse. Requests and sessions share the same scope source.
- Payment/session pages re-read the authoritative booking/session rather than
  trusting cached child context.

Live verification (guardian demo account, real PostgreSQL):

```text
roles: guardian
active children: 1
scoped requests: 6
scoped sessions: 2
forged child GET /requests?studentId=<random uuid>: 403
```

Automated coverage: `getRequests` rejects an unlinked child and binds the query
to the selected linked child; `getSessions` rejects a forged child before any
read.

---

## 9. Cancellation and rescheduling policy

- Central session transition map allows cancel/reschedule only from
  `scheduled|reschedule_pending`; start from `scheduled`, complete from
  `in_progress`.
- Cancellation stores actor, timestamp, reason, and an assessment
  (`refund_percentage`/reliability note) on the session. **No refund, ledger
  entry, or financial penalty is executed in this phase.**
- Cancelled rows are preserved; no deletes.
- Reschedule stores previous time, new time, actor, reason, and increments
  `version`; availability and overlap are rechecked at the new target.
- Series scopes are explicit and audited; cancellation releases the GiST slot.
- Reschedule/cancel authorization uses booking participants plus active guardian
  links; unrelated users get `403`/`404` and cannot mutate the session.

Automated coverage: transition guards, reschedule validation, cancellation
helper, series scope behavior, and participant authorization tests.

---

## 10. Calendar export

Endpoints:

- `GET /api/v1/sessions/calendar/ical` — JSON envelope for UI use.
- `GET /api/v1/sessions/calendar/ical/file` — raw `.ics` attachment.

ICS properties:

- UTC `DTSTART`/`DTEND` from `timestamptz` instants.
- Stable `UID:session-<id>@ogroniedu.com`.
- `SEQUENCE` from session `version` (0-based for iCalendar), `LAST-MODIFIED`,
  `DTSTAMP`, `METHOD:PUBLISH`, `CALSCALE:GREGORIAN`.
- Cancelled sessions exported with `STATUS:CANCELLED`.
- Participant/subject summary and location; meeting URLs and join tokens are
  omitted from the payload.
- Access scope is the same authorized session query; one user cannot export
  another participant’s sessions.
- RFC 5545 line folding on UTF-8 boundaries and text escaping.

Live verification:

```text
GET /api/v1/sessions/calendar/ical/file?studentId=<linked child>
HTTP 200
Content-Type: text/calendar; charset=utf-8
body: BEGIN:VCALENDAR present
```

Automated coverage asserts CRLF framing, UTC timestamps, stable UID, sequence,
cancelled status, and absence of a meeting token.

Live Google Calendar / Apple Calendar OAuth or subscription sync is **not
implemented/verified**; only standards-compliant file export exists.

---

## 11. Notifications, outbox, and reminders

- Existing centralized notification registry/service/persistence/Socket.IO/
  preferences/audio are reused; no parallel notification system was added.
- Booking events `booking.requested`, `booking.accepted`, `booking.confirmed`,
  `booking.cancelled` continue through `NotificationService`, which persists
  before emitting.
- Outbox mappings now include `session.scheduled`, `session.reminder`,
  `booking.cancelled`, `booking.declined`; the incorrect “class started” reuse
  of `session.reminder` was removed.
- `OutboxScheduler` polls every 5 s with the existing re-armed timer plus
  `pg_try_advisory_lock` pattern, so durable events are actually delivered.
- `SessionReminderScheduler` runs every 60 s. It selects `scheduled` sessions
  starting within 30 minutes that have no `reminder_sent_at`.
- For each due session it inserts
  `session.reminder:<sessionId>` in `outbox_events` and sets
  `reminder_sent_at` atomically. The partial unique index makes duplicate
  runs a no-op; a `23505` is counted as skipped and does not mark the session.
- Reminder processing is disabled in `NODE_ENV=test` unless explicitly enabled.
- Schedulers were observed starting in the live API boot:
  `Outbox scheduler started`, `Session reminder scheduler started`.

Automated coverage: reminder creates one outbox event and sets the timestamp;
duplicate unique-key insert is skipped without marking the session. Scheduler
startup was observed live; no real 30-minute wall-clock reminder delivery was
waited out.

---

## 12. Payment boundary

The frontend cannot confirm a paid booking:

- `PaymentsService.sandboxConfirmOrder()` was deleted.
- `POST /api/v1/payments/orders/:orderId/sandbox-confirm` returns `410 Gone`
  for authenticated callers. Live check returned `410`.
- Payment webhook is the only confirmation path for paid bookings; it accepts a
  booking only from `accepted|awaiting_payment` and never resurrects a cancelled
  booking.
- Webhook signature verification is enforced; unsigned payloads are rejected.
- Provider `queryTransaction()` fails closed when the provider cannot be
  reached; no fabricated success.
- Amount and currency are checked against the authoritative order and provider
  result.
- SSLCOMMERZ gateway failure now throws `ServiceUnavailableException` instead of
  fabricating a fallback checkout URL.
- bKash sandbox checkout URL generation remains implemented but is not
  externally verified against live bKash credentials.

Frontend:

- `use-payment-order` creates a real provider order, opens the provider
  checkout URL, and polls the backend receipt; it never marks success locally.
- The pay page polls the authoritative booking and shows success only for
  backend `confirmed`, `in_progress`, or `completed`.
- The legacy `PaymentCheckoutView` simulation callback was removed.
- The payment form’s amount is now a read-only, server-derived value; clients
  cannot type a different amount.
- Ledger copy says “projected split” until backend confirmation; refund copy no
  longer promises an automatic refund.

Automated coverage: provider signature rejection, duplicate webhook handling,
amount mismatch, cancelled-booking non-resurrection, and frontend payment-state
tests. External live provider certification is **unverified**.

---

## 13. Implemented routes and endpoints

### Booking requests (`/api/v1/requests`)

- `POST /` — create request (self or authorized child).
- `GET /` — list, optional server-validated `studentId`.
- `GET /:id/history` — booking status history.
- `GET /:id` — detail.
- `POST /:id/withdraw` — requester-only, `requested` only.
- `POST /:id/respond` — assigned tutor accept/decline.

### Sessions (`/api/v1`)

- `POST /sessions`, `POST /sessions/recurring`
- `GET /sessions`, `GET /sessions/calendar/ical`,
  `GET /sessions/calendar/ical/file`
- `GET /sessions/:id`, `POST /sessions/:id/reschedule`,
  `POST /sessions/:id/cancel`, `POST /sessions/:id/start`,
  `POST /sessions/:id/complete`, `PATCH /sessions/:id/meeting-url`
- `GET /tutors/:tutorId/calendar`

### Series (`/api/v1/session-series`)

- `GET /:id`
- `POST /:id/cancel` with `this_occurrence|this_and_future|entire_series`
- `POST /:id/reschedule` with the same scopes

### Tutor availability (`/api/v1/tutors/me`)

- `GET|PUT /availability`
- `GET|POST /availability/blocks`
- `DELETE /availability/blocks/:id`

### Payments (`/api/v1/payments`)

Existing order/webhook/refund/receipt routes remain. The legacy
`sandbox-confirm` route returns `410 Gone`; no new payment state machine or fake
transaction endpoint was added.

### Web routes

- `/{locale}/bookings/[id]` — booking detail, status-aware actions.
- `/{locale}/bookings/[id]/pay` — authoritative provider checkout/polling.
- `/{locale}/dashboard/requests` (feature page) — request list, child scope,
  payment-due and lifecycle badges.
- `/{locale}/dashboard/sessions` (feature page) — calendar, one-off/recurring
  scheduling, child scope.

---

## 14. Frontend UI and localization

Visual language follows the home hero and Find Tutors catalog: gradient hero
banners, radial glows, pill badges, bold headings, `rounded-2xl/3xl`, soft
shadows, primary-soft gradients, and high-contrast status chips.

Updated surfaces:

- **Requests page:** gradient hero, child selector, `awaiting_payment`,
  `confirmed`, `in_progress`, `completed`, `cancelled`, and `expired` states;
  payment-due badge and CTA; empty/loading states.
- **Sessions page/calendar:** gradient hero with glow, child selector slot,
  one-time vs weekly recurring schedule modal, series-aware calendar loads.
- **Booking detail:** status badges for the expanded lifecycle, removed the
  fake default price (`1200`), payment CTA wording tied to backend state.
- **Pay page:** provider selection, server-derived amount, checkout window,
  polling, pending/confirmed/terminal states, no local success simulation.
- **Payment view:** simulation removed; ledger split labelled projected until
  backend confirmation; refund copy is policy/verification language.

English and Bengali dictionaries were updated for the new labels. Typecheck,
lint, tests, and production build pass; no browser-based visual regression run
was performed in this session.

---

## 15. Security and authorization controls

- All routes use the existing auth guard and role checks.
- Booking/session reads and mutations check booking participant, assigned tutor,
  active guardian link, or admin role.
- Client-supplied status is never accepted. Actions map to transitions
  server-side; invalid targets fail.
- Guardian child IDs are revalidated server-side; tests and a live forged UUID
  both returned `403`.
- Session reschedule/cancel rejects unrelated users and terminal sessions.
- ICS export uses the authorized session query and omits meeting tokens.
- Outbox/reminder idempotency prevents duplicate delivery at the database level.
- Payment webhooks verify signature/status/amount/currency and fail closed.
- Error messages avoid leaking another child’s existence beyond the generic
  authorization error.

Residual risks are listed in §18; the most important are live provider
certification and an unexecuted live parallel-overlap race.

---

## 16. Automated tests — actual results

Commands run from the repository root after the final code changes:

| Command | Result |
| --- | --- |
| `pnpm --filter @ogroniedu/api test` | **66 files / 665 tests passed** (49.02 s) |
| `pnpm --filter @ogroniedu/web test` | **33 files / 207 tests passed** (35.66 s) |
| `pnpm --filter @ogroniedu/database test` | **4 files / 33 tests passed** (25.91 s) |
| `pnpm --filter @ogroniedu/api typecheck` | passed (`tsc --noEmit`, no output) |
| `pnpm --filter @ogroniedu/web typecheck` | passed (`tsc --noEmit`, no output) |

New focused coverage in `apps/api/test/booking-phase04.spec.ts` (12 tests):

- `requested → awaiting_payment` accepted; terminal → active rejected; no-op
  same-status transition.
- Asia/Dhaka wall-time round-trip; New York DST local 09:00 stays 09:00 with
  correct UTC offsets.
- Bounded weekly generation, ordering, deterministic idempotency key, duplicate
  slot rejection, hard-cap rejection.
- Reminder creation, stable idempotency key, `reminder_sent_at`, duplicate
  unique-key skip without marking.
- ICS output: CRLF, stable UID, UTC times, sequence, cancelled status, no
  meeting token.
- Forged child filter rejected before session reads.
- Availability: unconfigured allowed, explicit blocked period rejected.

Additional tests added to `bookings.service.spec.ts` cover unlinked-child `403`
and selected-child query binding. Existing tests cover accept/decline,
scheduling conflicts, recurring basics, payment webhook guards, and E2E
lifecycle.

No tests were deleted or weakened. The API test total increased from 649 to
665; web stayed at 207; database stayed at 33 with updated migration
expectations.

---

## 17. Live verification, lint, builds, documentation

### Live API + real PostgreSQL

Started the built API (`node dist/main.js`, `http://localhost:4000`) against
`ogroniedu_dev`, logged in as `guardian.demo@ogroniedu.com`, then:

```text
GET /api/v1/guardians/children                  -> 1 active child
GET /api/v1/requests?studentId=<linked child>   -> 6 requests
GET /api/v1/sessions?studentId=<linked child>   -> 2 sessions
GET /api/v1/requests?studentId=<random UUID>    -> 403
GET /api/v1/sessions/calendar/ical/file?...     -> 200, text/calendar, BEGIN:VCALENDAR
POST /payments/orders/<id>/sandbox-confirm      -> 410
GET /api/v1/sessions (no auth)                  -> 401
```

API boot log confirmed: outbox scheduler started, session reminder scheduler
started, `GET /sessions/calendar/ical/file` mapped, `session-series` routes
mapped, and tutor availability routes mapped. The server was stopped after the
checks.

### Lint / build / docs

| Command | Result |
| --- | --- |
| `pnpm --filter @ogroniedu/api lint` | passed (`oxlint src test --deny-warnings`) |
| `pnpm --filter @ogroniedu/web lint` | passed |
| `pnpm --filter @ogroniedu/api build` | passed (`tsc -p tsconfig.build.json`) |
| `pnpm --filter @ogroniedu/web build` | passed; Next.js 16.4.0 compiled in 30.1 s, TypeScript 8.5 s |
| `pnpm docs:validate` | **PASSED** — 226 Markdown/Mermaid/SQL files, 26 canonical docs |

The only lint defect found in the final pass was two unused imports in
`session-series.service.ts`; they were removed and lint re-ran clean.

### Environment limitations

- Docker Desktop daemon was unavailable (`npipe:////./pipe/dockerDesktopLinuxEngine`
  not found), so `docker compose` validation was not run. Local PostgreSQL 18
  was used instead.
- No live Google Calendar or Apple Calendar credentials/configuration were
  available; only `.ics` file export was verified.
- No live SSLCOMMERZ/bKash merchant credentials or provider callbacks were
  available; provider integration is automated-tested/fail-closed but not
  externally certified.
- No browser E2E/visual run was performed after the final UI edits; production
  build and component/unit tests passed.

### Working tree

The implementation spans commit `c940330` (backend, migration, docs, initial
tests) plus uncommitted follow-up changes for the frontend, focused tests, the
`021` seed fix, and the final documentation. Nothing was committed or pushed in
this closing pass; the tree is left for review/approval.

---

## 18. Acceptance status, limitations, and approval gate

### Acceptance checklist

| Criterion | Result |
| --- | --- |
| Server-owned booking/session transitions with history | **PASS** — implemented + tests |
| Auth, role, ownership, guardian-child enforcement | **PASS** — tests + live 403/401 |
| Backend/DB conflict prevention incl. cancelled-slot reuse | **PASS at constraint level** — GiST + tests; live parallel race not run |
| Instants `timestamptz`, IANA timezone, DST-safe recurrence | **PASS** — tests |
| Bounded/idempotent recurring series, no silent skips | **PASS** — tests |
| Scoped series cancel/reschedule preserving history | **PASS** — implementation + tests |
| Guardian 0/1/many children, no cache leakage | **PASS** — shared scope + tests + live check |
| Policy-based cancellation/reschedule, no automatic refunds | **PASS** — assessment only |
| Valid ICS with updates/cancellations/no token leakage | **PASS** — tests + live 200 |
| Booking/session notifications persisted before emit | **PASS** — existing service + outbox mappings |
| 30-minute reminders idempotent | **PASS** — unit test; live scheduler start observed |
| Payment-required booking not confirmable by frontend | **PASS** — webhook only + live 410 |
| No fake payments/escrow/accounting | **PASS** — simulation removed; projected copy |
| Later-phase features untouched | **PASS** — escrow/payout/refund execution absent |
| Required docs + final report | **PASS** — six phase docs + this 18-section report |
| Full validation commands | **PASS** — §16–17; Docker/live providers unverified |

### Known limitations / blocked dependencies

1. **Live concurrency race not executed.** The GiST constraint and duplicate
   partial unique indexes are in place, but no two real concurrent REST requests
   were raced against PostgreSQL in this session. This should be added to the
   integration environment before production sign-off.
2. **Payment providers not certified.** Webhook verification, amount/currency
   checks, fail-closed provider queries, and the removed sandbox path are
   implemented/tested; live SSLCOMMERZ/bKash credentials and callbacks were not
   available. bKash sandbox checkout URL behavior remains unverified.
3. **Calendar sync not implemented.** `.ics` export is verified; OAuth Google
   Calendar/Apple Calendar push or subscription sync is not.
4. **No browser visual/E2E pass** for the new booking/session/payment screens.
   Build, typecheck, lint, and component tests pass.
5. **Docker Compose unavailable**, so containerized validation was skipped.
6. **No live 30-minute reminder wait.** The scheduler and idempotent generator
   were tested/observed, but no real due-time delivery was awaited.
7. **Existing demo data** was used read-only for live checks; no production
   booking was created or mutated.

### Approval gate

Phase 04 is implemented, audited, tested at unit/integration/DB-constraint
level, built, documented, and manually smoke-verified against local PostgreSQL.
It stops before escrow, refunds, payouts, and accounting.

**Status: awaiting explicit approval.** No commit or push was performed in this
closing pass.
