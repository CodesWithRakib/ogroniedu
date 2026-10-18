# Tutor Replacement Guarantee Workflow (Phase 03)

## 1. Source of policy

`docs/BUSINESS_RULES.md` §3 is the repository’s contractual statement:

- Eligible when the tutor cancels / no-shows, when the student is dissatisfied after the first
  trial session and requests within **48 hours**, or when the tutor profile is suspended.
- Operations offers up to **2** alternate verified tutors matching subject, class, curriculum and
  budget within **24 hours**.
- If no suitable tutor is accepted, the guardian receives a **100% refund**.

The Phase 03 brief mentions a 48-hour replacement target. The repository says 24-hour matching and a
48-hour request window. **The repository policy is authoritative**; the target is a configurable
constant (`TUTOR_REPLACEMENT_MATCH_TARGET_HOURS`, default 24, bounded 1–48) so operations can adjust
without a code change. This document records the discrepancy instead of inventing a new promise.

## 2. Eligibility (server-side, conservative)

A request is accepted only when **all** of the following hold:

1. The authenticated user is the booking’s `student_user_id` or `requester_user_id`.
2. The booking exists and is not `declined`, `cancelled`, `expired`, or `completed` without a
   qualifying event. Accepted statuses: `accepted`, `awaiting_payment`, `confirmed`, `in_progress`,
   `disputed`, `replacement_requested`.
3. No other non-terminal replacement case exists for the booking (also enforced by a partial unique
   index).
4. Reason-specific evidence:

| Reason                        | Additional requirement                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `trial_dissatisfaction`       | A completed first session exists and `now - first_completed_session <= 48h`.                         |
| `teaching_mismatch`           | Same 48-hour first-session window; treated as trial dissatisfaction for policy purposes.             |
| `tutor_no_show`               | At least one `booking_sessions.status = 'no_show'`.                                                  |
| `frequent_tutor_cancellation` | At least two sessions cancelled with `cancellation_assessment.initiatedByRole = 'tutor'`.            |
| `unprofessional_conduct`      | At least one session exists or the booking is confirmed; a human reviewer evaluates the explanation. |
| `other`                       | Booking share at least one session; human review required.                                           |

If a reason cannot be evidenced, the request is rejected with a clear 400 message. No case is created
“optimistically”.

## 3. Status machine

```
requested ──► under_review ──► matching ──► offered ──► accepted ──► closed
    │              │               │            │
    │              ├───────────────┴────────────┴──► rejected ──► closed
    │              │               │            │
    └──────────────┴───────────────┴────────────┴──► refund_eligible ──► closed
    │
    └──► cancelled (owner, before matching)
```

- `accepted` may only be reached through the **participant consent endpoint**
  (`POST /:id/accept`), never by staff status update.
- `offered → matching` is the participant decline path (offer withdrawn, case re-enters matching).
- Every transition is validated against `REPLACEMENT_TRANSITIONS`; invalid transitions return 400.
- Terminal statuses set `resolved_at`.
- `refund_eligible` records **eligibility only**. No refund is executed here.

## 4. Deadlines and escalation

- `deadline_at = requested_at + matchTargetHours` computed with server time and stored.
- `POST /:id/extend` (admin only) extends the deadline, records `extended_at` and a mandatory
  `extension_reason`, and appends a history event. A second extension is allowed only by
  `super_admin`.
- The overdue sweep (`TutorReplacementDeadlineScheduler`) runs every 15 minutes, uses a PostgreSQL
  advisory lock, and is idempotent:
  - only cases in `requested|under_review|matching|offered` with `deadline_at < now()` and
    `overdue_notified_at IS NULL` are selected;
  - it sets `overdue_notified_at` and dispatches `tutor.replacement` with `status=overdue`;
  - it never changes `deadline_at`, never reopens a resolved case, and never auto-refunds.
- Operations can also trigger the sweep explicitly: `POST /api/v1/tutor-replacements/ops/sweep-overdue`.

## 5. Candidate matching

- `GET /:id/candidates` returns real discovery results for the booking’s `subject_id` and
  `education_level_id`, excluding the current tutor.
- The same eligibility rules as public search apply (verified, published, active, unexpired).
- Candidates are suggestions only. An offer is recorded by staff
  (`PATCH /:id { status: 'offered', replacementTutorUserId }`) and requires participant acceptance.
- No tutor is auto-assigned, and no candidate is fabricated when none exists; the case stays
  `matching` and becomes overdue for staff review.

## 6. Refund eligibility vs execution

| Concept                     | Where stored                                                                            | Effect                                 |
| --------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------- |
| Refund eligibility decision | `refund_eligibility` (`not_determined`/`eligible`/`not_eligible`) + `refund_decided_at` | Staff decision, visible to participant |
| Refund execution / ledger   | Payments module (out of scope)                                                          | Not triggered by this phase            |

Setting `status = refund_eligible` requires `refund_eligibility = eligible`. The UI says “eligible
for refund review” and never “refunded”.

## 7. Notes and privacy

- `user_visible_note` is shown to the case owner.
- `internal_note` is only returned to admin/super_admin responses.
- Public/participant responses whitelist case fields and booking IDs; they never serialize the raw
  entity, tutor contact details, or internal notes.
- History is append-only; each events endpoint filters internal notes by caller role.

## 8. Notifications

Reuses the existing `tutor.replacement` event (no duplicate event type). Payload:
`{ caseId, bookingId, status }`. Recipients:

- participant owner on request, offer, resolution, overdue;
- assigned staff member (or all admin/super_admin users when unassigned) on request and overdue.

Navigation target: `/tutor-replacements/<caseId>` (authorization-checked page). Dispatch happens
after commit; failures are logged and never roll back the business transaction. The API is
idempotent per case transition because notifications are only emitted for newly written status
changes and the overdue marker is set exactly once.
