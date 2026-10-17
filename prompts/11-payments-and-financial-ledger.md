# Phase — Payments and Financial Ledger

## Objective

Implement sandbox provider integration and financial integrity.

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

Verify provider docs, merchant eligibility, fees, signatures, settlement and sandbox. Implement provider adapter, payment order, verified callback, idempotency, reconciliation, receipts, refund and ledger if approved. No success based on redirect.

## Expected artifacts

Payment module, adapter contract, migrations, ledger/reconciliation/runbook.

## Verification

Invalid signature, duplicate event, amount mismatch, failed/pending state, duplicate posting, refund bounds, journal balance, outage.

## Acceptance criteria

- Current phase scope only; no silent feature skipping or unrelated refactor.
- Server-side authorization and ownership tested for affected operations.
- Unit/integration/E2E and negative/failure-path tests added at appropriate levels.
- Bangla/English, accessibility and responsive behavior checked when UI changes.
- Migrations, API docs, test matrix and traceability updated.
- No existing tests disabled or weakened.
- Exact commands and actual outcomes included in the final report.

## Definition of done

No live money until provider/business/accounting approvals.

## Required final report

Summarize changes/files/requirement IDs/migrations/tests/commands and real outcomes/security-localization checks/docs/risks/blockers. Mark incomplete if any acceptance criterion fails. Never claim an unexecuted test passed.
