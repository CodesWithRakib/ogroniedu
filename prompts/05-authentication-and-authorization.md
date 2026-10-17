# Phase — Authentication and Authorization

## Objective

Implement secure identity/session/permission foundation.

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

Implement registration/login/logout/refresh/recovery/contact verification, password hashing, session revocation, rate limits, DTO validation, secure cookie/CSRF strategy, permissions and ownership helpers. Audit privileged grants. Consider stronger admin authentication.

## Expected artifacts

Auth module, guards/policies, DTOs, API docs, tests.

## Verification

Auth unit/integration/E2E, abuse, revoked session, role denial and cross-user access.

## Acceptance criteria

- Current phase scope only; no silent feature skipping or unrelated refactor.
- Server-side authorization and ownership tested for affected operations.
- Unit/integration/E2E and negative/failure-path tests added at appropriate levels.
- Bangla/English, accessibility and responsive behavior checked when UI changes.
- Migrations, API docs, test matrix and traceability updated.
- No existing tests disabled or weakened.
- Exact commands and actual outcomes included in the final report.

## Definition of done

No protected endpoint relies on UI-only checks.

## Required final report

Summarize changes/files/requirement IDs/migrations/tests/commands and real outcomes/security-localization checks/docs/risks/blockers. Mark incomplete if any acceptance criterion fails. Never claim an unexecuted test passed.
