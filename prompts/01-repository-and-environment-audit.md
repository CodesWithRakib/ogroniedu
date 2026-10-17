# Phase — Repository and Environment Audit

## Objective

Inspect only; do not implement features.

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

Read root docs, manifests, workspace config, apps/packages, CI, env examples, migrations, tests, routes and git status. Map current features to FR/NFR IDs. Find architecture gaps, missing tests, production mock data, `any`, secrets, authorization gaps, localization gaps and version risks. Verify exact versions from official sources and update VERSION-VERIFICATION.md. Create prioritized backlog with dependencies, risks and acceptance criteria.

## Expected artifacts

Audit report, repository map, traceability gaps, backlog, version evidence.

## Verification

Run only safe inspection/validation commands; record real outputs.

## Acceptance criteria

- Current phase scope only; no silent feature skipping or unrelated refactor.
- Server-side authorization and ownership tested for affected operations.
- Unit/integration/E2E and negative/failure-path tests added at appropriate levels.
- Bangla/English, accessibility and responsive behavior checked when UI changes.
- Migrations, API docs, test matrix and traceability updated.
- No existing tests disabled or weakened.
- Exact commands and actual outcomes included in the final report.

## Definition of done

No feature implementation changes; all unknowns and blockers documented.

## Required final report

Summarize changes/files/requirement IDs/migrations/tests/commands and real outcomes/security-localization checks/docs/risks/blockers. Mark incomplete if any acceptance criterion fails. Never claim an unexecuted test passed.
