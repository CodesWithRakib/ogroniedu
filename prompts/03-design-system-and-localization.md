# Phase — Design System and Localization

## Objective

Build reusable UI foundation, not all feature pages.

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

Implement locale routing, Bangla/English dictionaries, centralized semantic tokens, accessible typography, responsive shells, forms, feedback states and mobile navigation where appropriate. Avoid hardcoded colors, excessive gradients/shadows and hardcoded user-facing strings.

## Expected artifacts

Tokens, dictionaries, accessible components, shells, UI docs.

## Verification

Both locales, missing-key checks, keyboard, contrast, responsive breakpoints, build.

## Acceptance criteria

- Current phase scope only; no silent feature skipping or unrelated refactor.
- Server-side authorization and ownership tested for affected operations.
- Unit/integration/E2E and negative/failure-path tests added at appropriate levels.
- Bangla/English, accessibility and responsive behavior checked when UI changes.
- Migrations, API docs, test matrix and traceability updated.
- No existing tests disabled or weakened.
- Exact commands and actual outcomes included in the final report.

## Definition of done

New components are accessible, localized and responsive.

## Required final report

Summarize changes/files/requirement IDs/migrations/tests/commands and real outcomes/security-localization checks/docs/risks/blockers. Mark incomplete if any acceptance criterion fails. Never claim an unexecuted test passed.
