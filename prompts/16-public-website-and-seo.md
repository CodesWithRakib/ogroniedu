# Phase — Public Website and SEO

## Objective

Build polished public pages using real content/data.

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

Implement landing/search/profile/how-it-works/pricing/safety/FAQ/contact/policies and SEO. No fake testimonials, unsupported outcomes or unverified claims. Public APIs only expose published fields.

## Expected artifacts

Public routes, metadata/sitemap, content strategy, UI tests.

## Verification

Locale metadata, canonical URLs, accessibility, responsive layout, private field exclusion.

## Acceptance criteria

- Current phase scope only; no silent feature skipping or unrelated refactor.
- Server-side authorization and ownership tested for affected operations.
- Unit/integration/E2E and negative/failure-path tests added at appropriate levels.
- Bangla/English, accessibility and responsive behavior checked when UI changes.
- Migrations, API docs, test matrix and traceability updated.
- No existing tests disabled or weakened.
- Exact commands and actual outcomes included in the final report.

## Definition of done

All public claims supportable and bilingual.

## Required final report

Summarize changes/files/requirement IDs/migrations/tests/commands and real outcomes/security-localization checks/docs/risks/blockers. Mark incomplete if any acceptance criterion fails. Never claim an unexecuted test passed.
