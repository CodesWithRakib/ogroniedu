# Phase — Architecture and Monorepo Foundation

## Objective

Implement approved tooling and foundations only.

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

Decide pnpm/Turborepo versus alternatives; record ADR. Set strict TS, shared lint/format, env validation, safe config, CI, request IDs, structured logging, health/readiness and test conventions. Avoid empty placeholder modules.

## Expected artifacts

Workspace config, shared config, CI, env example, ADR and smoke tests.

## Verification

Frozen install, lint, typecheck, tests, build, docs validation.

## Acceptance criteria

- Current phase scope only; no silent feature skipping or unrelated refactor.
- Server-side authorization and ownership tested for affected operations.
- Unit/integration/E2E and negative/failure-path tests added at appropriate levels.
- Bangla/English, accessibility and responsive behavior checked when UI changes.
- Migrations, API docs, test matrix and traceability updated.
- No existing tests disabled or weakened.
- Exact commands and actual outcomes included in the final report.

## Definition of done

Clean checkout can install/build; no secret exposure.

## Required final report

Summarize changes/files/requirement IDs/migrations/tests/commands and real outcomes/security-localization checks/docs/risks/blockers. Mark incomplete if any acceptance criterion fails. Never claim an unexecuted test passed.
