# Phase — Production Readiness Gate

## Objective

Make a go/no-go recommendation; do not force launch.

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

Evaluate legal/provider approvals, verification operations, support, minor consent review, payments, security, accessibility/localization, performance, restore, incident response, rollback and critical defects. Run only approved safe smoke tests.

## Expected artifacts

Readiness report, risk acceptance, pilot/rollback/escalation checklist.

## Verification

Attach actual test/deploy/restore evidence; list all unknowns.

## Acceptance criteria

- Current phase scope only; no silent feature skipping or unrelated refactor.
- Server-side authorization and ownership tested for affected operations.
- Unit/integration/E2E and negative/failure-path tests added at appropriate levels.
- Bangla/English, accessibility and responsive behavior checked when UI changes.
- Migrations, API docs, test matrix and traceability updated.
- No existing tests disabled or weakened.
- Exact commands and actual outcomes included in the final report.

## Definition of done

Recommend GO only if critical gates pass; otherwise NO-GO with blockers.

## Required final report

Summarize changes/files/requirement IDs/migrations/tests/commands and real outcomes/security-localization checks/docs/risks/blockers. Mark incomplete if any acceptance criterion fails. Never claim an unexecuted test passed.
