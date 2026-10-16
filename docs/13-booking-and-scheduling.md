# 13 — Booking and Scheduling

Suggested booking lifecycle: `requested -> accepted -> awaiting_payment (if needed) -> confirmed -> in_progress -> completed`; terminal/exception states include `declined`, `cancelled`, `expired`, `disputed`, `replacement_requested`. Client cannot set arbitrary status.

Store instants as `timestamptz`; recurring rules retain IANA timezone and local-time intent. Validate end > start, tutor availability, blocked periods, learner authorization, booking participants, duration/buffer and cancellation policy. DB-backed protection is required against concurrent overlap. Generate recurring sessions idempotently. Reschedules record actor, requester, acceptance, timestamps and reason.

Tests: adjacent slots pass; overlaps fail; concurrent same-slot requests allow at most one; cancelled slot reuse follows policy; timezone round-trips; recurrence retry creates no duplicates; unrelated users cannot cancel/reschedule; reminder retries do not duplicate.
