# Booking & Session State Machines

## Booking statuses

`requested → accepted | awaiting_payment | declined | cancelled | expired`

| From | Allowed to |
| --- | --- |
| `requested` | `accepted`, `awaiting_payment`, `declined`, `cancelled`, `expired` |
| `accepted` | `awaiting_payment`, `confirmed`, `cancelled`, `declined`, `expired` |
| `awaiting_payment` | `confirmed`, `cancelled`, `expired` |
| `confirmed` | `in_progress`, `completed`, `cancelled`, `disputed`, `replacement_requested` |
| `in_progress` | `completed`, `cancelled`, `disputed`, `replacement_requested` |
| `completed` | `disputed`, `replacement_requested` |
| `disputed` | `completed`, `cancelled`, `replacement_requested` |
| `replacement_requested` | `confirmed`, `cancelled`, `completed` |
| `declined` | terminal |
| `cancelled` | terminal |
| `expired` | terminal |

Rules:

- The client never supplies a status. Endpoints name an action
  (`accept`, `decline`, `withdraw`, `confirm`, `cancel`, …) and the server maps
  it to a target status after validating the transition.
- Accepting a request moves it to `awaiting_payment` (payment is required).
- Confirmation happens only through the verified payment webhook, an explicit
  admin/replacement action, or a zero-price server-side confirmation.
- Scheduling a session **never** changes the booking status.
- Every transition writes `booking_status_events`
  (`from_status`, `to_status`, `actor_user_id`, `reason`, `created_at`) and a
  generic audit log entry.
- Invalid transitions return `400`; concurrent transitions that lose a race
  return `409` where a unique/optimistic guard applies.

## Session statuses

`booking_sessions.status`: `scheduled | in_progress | completed | cancelled |
no_show | reschedule_pending`

| From | Allowed to |
| --- | --- |
| `scheduled` | `in_progress`, `cancelled`, `reschedule_pending` |
| `reschedule_pending` | `scheduled`, `cancelled` |
| `in_progress` | `completed`, `cancelled` |
| `completed` | terminal |
| `cancelled` | terminal |
| `no_show` | terminal |

Rules:

- Only `scheduled` and `reschedule_pending` sessions can be rescheduled.
- Only `scheduled`/`reschedule_pending` sessions can be cancelled.
- `startSession` requires the booking to be `confirmed` or `in_progress`.
- `completeSession` requires `in_progress`; when the last active session
  completes, the booking transitions to `completed`.
- `updateMeetingUrl` is allowed only for `scheduled`, `reschedule_pending`, or
  `in_progress`.
- Cancellation releases the GiST slot immediately because the exclusion
  constraint only covers `scheduled|in_progress`.
- A cancellation assessment (refund percentage, reliability note) is stored on
  the session. **No refund or ledger entry is executed in this phase.**

## Recurring series statuses

`booking_session_series.status`: `active | cancelled | completed`

- `active → cancelled` (entire series or truncated at a future occurrence).
- `active → completed` when every occurrence is terminal.
- `this_occurrence` cancellation does not change the series status.
- `this_and_future` cancellation truncates the series (`horizon_end_date` is
  set before the anchor occurrence; no future rows are generated).

## Concurrency

- GiST exclusion `ex_tutor_session_overlap` is the final arbiter for overlapping
  tutor sessions. Application checks produce friendly errors; the constraint
  prevents races.
- Duplicate active booking requests are prevented by the partial unique index
  `uq_bookings_active_request` in addition to the application check.
- Recurring series are idempotent through
  `UNIQUE (booking_id, idempotency_key)`.
- Reminder delivery is idempotent through
  `UNIQUE (idempotency_key)` on `outbox_events` plus the atomic
  `reminder_sent_at IS NULL` update.
