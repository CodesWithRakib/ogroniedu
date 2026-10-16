# 20 — Testing Strategy

Test pyramid: unit business rules/state transitions/permissions; integration DB transactions/constraints/queues/provider adapters; API E2E auth/validation/authorization/contracts; browser E2E critical guardian/tutor/admin journeys; nonfunctional security/accessibility/localization/load/restore/failure recovery. Candidate tools: Vitest or Jest, Supertest, Playwright, and a suitable load tool; verify compatibility before selection.

Use isolated DBs/schemas, deterministic fixtures, no production data, and both allowed/forbidden actors. Mock external networks in unit tests but retain meaningful adapter contract/integration tests. Do not mock the behavior being tested. Fix flaky causes instead of rerunning until green.

CI gates: frozen install, lint/format, typecheck, unit/integration, API E2E, browser smoke, build, dependency/secret checks, migration validation, docs links. Coverage is a signal, not proof; prioritize booking, authorization, payments, ledger, guardian access, verification. Any critical data leak, unverified payment path, unbalanced ledger, double booking, missing migration, disabled test or exposed secret blocks release.
