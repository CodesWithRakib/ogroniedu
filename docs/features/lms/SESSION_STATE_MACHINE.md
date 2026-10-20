# Learning Session State Machine

## 1. Model

A learning session **is** a `booking_sessions` row. Phase 04 owns the table,
conflict constraints, reminders, cancellation policy, and calendar export.
Phase 06 adds two columns only: `actual_started_at` and `idempotency_key`.

The stored states are the Phase 04 states; no aliases are introduced.

| Stored state | Learner-facing label | Meaning |
| --- | --- | --- |
| `scheduled` | Scheduled | Created, not started. Reminders may fire. |
| `in_progress` | In progress | Tutor started the session. |
| `completed` | Completed | Tutor completed it; attendance may still be missing. |
| `cancelled` | Cancelled | Cancelled through the booking policy. Terminal. |
| `no_show` | Missed | The session did not happen and was not cancelled. Terminal. Manual only. |
| `reschedule_pending` | Reschedule pending | Cancellation/reschedule assessment pending. |

`ready` and `missed` from the phase brief are **not** stored: `ready` is a
derived UI hint (`scheduled` && now within 15 minutes of `startsAt`), `missed`
maps to `no_show`.

## 2. Transition table

| From | To | Actor | Endpoint | Preconditions |
| --- | --- | --- | --- | --- |
| `scheduled` | `in_progress` | assigned tutor, admin, super_admin | `POST /api/v1/sessions/:id/start` | booking `confirmed` or `in_progress`; session not cancelled; `ex_tutor_session_overlap` unaffected |
| `scheduled` | `cancelled` | participant, active guardian, admin | `POST /api/v1/sessions/:id/cancel` | Phase 04 cancellation policy assessment |
| `scheduled` | `reschedule_pending` | participant, active guardian, admin | `POST /api/v1/sessions/:id/reschedule` | Phase 04 reschedule rules |
| `reschedule_pending` | `scheduled` | participant, active guardian, admin | reschedule completion | new slot must clear availability + overlap |
| `reschedule_pending` | `cancelled` | participant, active guardian, admin | `POST .../cancel` | policy assessment |
| `in_progress` | `completed` | assigned tutor, admin, super_admin | `POST /api/v1/sessions/:id/complete` | `actual_started_at` set; not already completed |
| `in_progress` | `cancelled` | admin/super_admin only | `POST .../cancel` | Phase 04 matrix |
| `completed`, `cancelled`, `no_show` | — | — | — | terminal, no transitions |

Enforcement lives in `constants/session-status-transitions.ts`
(`assertSessionTransition`), used by every mutation. Controllers never assign a
status directly.

### Idempotency

- `start` on `in_progress` returns the same row without a new audit entry.
- `complete` on `completed` returns the same row without a new outbox event.
- `POST /sessions` accepts `Idempotency-Key`. The key is stored on the session
  (partial unique index `uq_sessions_idempotency`). A replay returns the
  existing session; concurrent inserts lose the unique race and are re-read.
- Recurring creation is already idempotent via
  `uq_series_booking_idempotency`.

## 3. Creation rules

Sessions are created **only** through the scheduling API, from an eligible
booking:

1. Booking exists and the caller can manage its sessions (tutor, requester,
   student, active guardian, admin).
2. Booking is `confirmed` or `in_progress` (zero-price bookings may be
   confirmed at scheduling; paid bookings must be confirmed by the payment
   provider — the LMS never confirms a paid booking).
3. End is strictly after start; start is not more than 5 minutes in the past.
4. The tutor's availability and the overlap constraint both accept the slot.
5. Recurring occurrences are validated as a set before any row is inserted.

No session is created from `requested`, `awaiting_payment`, `declined`,
`cancelled`, `expired`, or `disputed` bookings. The LMS does not auto-schedule
from an accepted booking because a booking has no agreed slot until a session
(or series) is explicitly scheduled.

## 4. Timestamps and edge cases

| Rule | Behaviour |
| --- | --- |
| Early start | Allowed. `actual_started_at` records the real time. |
| Late start | Allowed. UI shows `scheduled` until the tutor starts it. |
| Early finish | Allowed. `completed_at` may precede `ends_at`; duration is derived from actual timestamps. |
| Overdue session | **Never auto-completed.** It stays `scheduled` (or `in_progress`) until a human acts. |
| Completion before start | Rejected (`400`) — no `actual_started_at`. |
| Duplicate completion | Idempotent (same row, one durable event). |
| Cancelled during reminder window | Reminder service selects `status='scheduled'` only and the worker rechecks; no stale reminder is sent. |
| Reschedule | Reminder flag is cleared and the new time is used; calendar `SEQUENCE` increments via `version`. |
| Student complete | Forbidden (`403`). Students and guardians never change lifecycle state beyond the booking-policy cancel/reschedule path. |

## 5. Side effects

| Transition | Audit | Durable event | Notification | Financial |
| --- | --- | --- | --- | --- |
| start | `session.started` | `session.started` (idempotent) | student + active guardians (`session.started`) | none |
| complete | `session.completed` (with notes) | `session.completed` (`session.completed:<id>`) | student + active guardians (`session.completed`) | **none** — settlement remains an explicit Phase 05 action |
| cancel | `session.cancelled` | `session.cancelled` | both parties | Phase 05 refund flow, unchanged |
| reschedule | `session.rescheduled` | `session.scheduled` for the new record | both parties | unchanged |

Financial integration: a repeated completion cannot create a second
`session_settlements` row because `settleMilestone` is keyed by
`session_id` (unique) and posts a ledger journal with
`idempotency_key = ledger:settlement:session:<id>`. LMS never calls the ledger.
