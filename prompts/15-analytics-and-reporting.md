# Phase — Analytics and Reporting

## Objective

Build accurate operational metrics from source-of-truth data.

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

Define conversion, completion, cancellation, no-show, tutor response, retention, payments, refunds, disputes and support metrics. Avoid double counting; document events/time windows and access.

## Expected artifacts

Metric definitions, aggregate queries/read models if justified, dashboard, tests.

## Verification

Known fixture reconciliation, access, time boundaries, query performance.

## Acceptance criteria

- Current phase scope only; no silent feature skipping or unrelated refactor.
- Server-side authorization and ownership tested for affected operations.
- Unit/integration/E2E and negative/failure-path tests added at appropriate levels.
- Bangla/English, accessibility and responsive behavior checked when UI changes.
- Migrations, API docs, test matrix and traceability updated.
- No existing tests disabled or weakened.
- Exact commands and actual outcomes included in the final report.

## Definition of done

Every metric has a precise definition and reconciles.

## Required final report

Summarize changes/files/requirement IDs/migrations/tests/commands and real outcomes/security-localization checks/docs/risks/blockers. Mark incomplete if any acceptance criterion fails. Never claim an unexecuted test passed.
