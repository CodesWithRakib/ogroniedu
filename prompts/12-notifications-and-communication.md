# Phase — Notifications and Communication

## Objective

Implement notification preferences, outbox worker and approved channels.

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

Build bilingual templates, retries/backoff, delivery attempts, deduplication and participant-scoped messaging if approved. Add channels only after official provider terms/consent review.

## Expected artifacts

Notification module, jobs, templates, access rules, runbooks.

## Verification

Retry/idempotency, preferences, unauthorized messages, redacted errors, provider contracts.

## Acceptance criteria

- Current phase scope only; no silent feature skipping or unrelated refactor.
- Server-side authorization and ownership tested for affected operations.
- Unit/integration/E2E and negative/failure-path tests added at appropriate levels.
- Bangla/English, accessibility and responsive behavior checked when UI changes.
- Migrations, API docs, test matrix and traceability updated.
- No existing tests disabled or weakened.
- Exact commands and actual outcomes included in the final report.

## Definition of done

Delivery failure cannot corrupt committed business state.

## Required final report

Summarize changes/files/requirement IDs/migrations/tests/commands and real outcomes/security-localization checks/docs/risks/blockers. Mark incomplete if any acceptance criterion fails. Never claim an unexecuted test passed.
