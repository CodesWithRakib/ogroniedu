# Phase — Users, Students, Guardians and Consent

## Objective

Implement profile and explicit guardian-child lifecycle.

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

Build profiles, multi-child guardian APIs, link request/verification/revocation, policy-dependent consent, access-scoped records, minimal child PII and audit. Do not invent legal age rules; require approved policy.

## Expected artifacts

Profiles/relationship module, UI/API, tests, policy docs.

## Verification

Multi-child, unauthorized link, revoked access, unrelated-child denial, export/deletion behavior.

## Acceptance criteria

- Current phase scope only; no silent feature skipping or unrelated refactor.
- Server-side authorization and ownership tested for affected operations.
- Unit/integration/E2E and negative/failure-path tests added at appropriate levels.
- Bangla/English, accessibility and responsive behavior checked when UI changes.
- Migrations, API docs, test matrix and traceability updated.
- No existing tests disabled or weakened.
- Exact commands and actual outcomes included in the final report.

## Definition of done

All guardian access is relationship-scoped.

## Required final report

Summarize changes/files/requirement IDs/migrations/tests/commands and real outcomes/security-localization checks/docs/risks/blockers. Mark incomplete if any acceptance criterion fails. Never claim an unexecuted test passed.
