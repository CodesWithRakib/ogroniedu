# Phase — Booking and Scheduling

## Objective

Implement state machine and conflict-safe sessions.

## Required reading

- `prompts/00-master-instructions.md`
- `README.md`
- `docs/04-product-requirements.md`
- `docs/05-user-roles-and-permissions.md`
- `docs/traceability-matrix.md`
- `docs/20-testing-strategy.md`
- `docs/checklists/definition-of-done.md`
- Relevant architecture, database, API, security and previous phase report

## Scope

Implement booking lifecycle, service agreement snapshot, one-off/recurring model, timezone intent, availability/blocked periods, cancellation/reschedule, DB conflict protection, outbox reminders and participant permissions. No slow external calls inside critical transaction.

## Expected artifacts

Booking/session modules, migrations, outbox, calendar UI, tests.

## Verification

Concurrent conflicts, invalid transitions, timezone, retries, cancelled slot reuse, permissions, E2E.

## Acceptance criteria

- Current phase scope only; no silent feature skipping or unrelated refactor.
- Server-side authorization and ownership tested for affected operations.
- Unit/integration/E2E and negative/failure-path tests added at appropriate levels.
- Bangla/English, accessibility and responsive behavior checked when UI changes.
- Migrations, API docs, test matrix and traceability updated.
- No existing tests disabled or weakened.
- Exact commands and actual outcomes included in the final report.

## Definition of done

At most one overlapping active session per tutor under approved rule.

## Required final report

Summarize changes/files/requirement IDs/migrations/tests/commands and real outcomes/security-localization checks/docs/risks/blockers. Mark incomplete if any acceptance criterion fails. Never claim an unexecuted test passed.
