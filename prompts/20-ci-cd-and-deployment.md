# Phase — CI/CD and Deployment

## Objective

Prepare repeatable staging/production deploy.

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

Separate environments, frozen install, test gates, secret management, migration strategy, health checks, rollout and rollback/forward-fix. Production seed never creates demo users.

## Expected artifacts

CI/CD, deployment docs, env examples, runbooks, smoke tests.

## Verification

Staging deploy, migrations, health, rollback and secret checks.

## Acceptance criteria

- Current phase scope only; no silent feature skipping or unrelated refactor.
- Server-side authorization and ownership tested for affected operations.
- Unit/integration/E2E and negative/failure-path tests added at appropriate levels.
- Bangla/English, accessibility and responsive behavior checked when UI changes.
- Migrations, API docs, test matrix and traceability updated.
- No existing tests disabled or weakened.
- Exact commands and actual outcomes included in the final report.

## Definition of done

Deployment repeatable and documented.

## Required final report

Summarize changes/files/requirement IDs/migrations/tests/commands and real outcomes/security-localization checks/docs/risks/blockers. Mark incomplete if any acceptance criterion fails. Never claim an unexecuted test passed.
