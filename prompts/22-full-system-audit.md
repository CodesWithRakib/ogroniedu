# Phase — Full-System Audit

## Objective

Audit repository against requirements; do not add unrelated features.

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

Map every FR/NFR to implementation, data, API, UI, tests and evidence. Find static mocks, TODO features, unsafe any, missing authorization/migrations/locales, disabled tests, payment flaws, races, broken docs and version drift. Fix safe scoped defects; log the rest.

## Expected artifacts

Traceability report, defect backlog, drift report, evidence index.

## Verification

Full lint/typecheck/unit/integration/E2E/build/docs checks with actual results.

## Acceptance criteria

- Current phase scope only; no silent feature skipping or unrelated refactor.
- Server-side authorization and ownership tested for affected operations.
- Unit/integration/E2E and negative/failure-path tests added at appropriate levels.
- Bangla/English, accessibility and responsive behavior checked when UI changes.
- Migrations, API docs, test matrix and traceability updated.
- No existing tests disabled or weakened.
- Exact commands and actual outcomes included in the final report.

## Definition of done

Audit is honest and evidence-based.

## Required final report

Summarize changes/files/requirement IDs/migrations/tests/commands and real outcomes/security-localization checks/docs/risks/blockers. Mark incomplete if any acceptance criterion fails. Never claim an unexecuted test passed.
