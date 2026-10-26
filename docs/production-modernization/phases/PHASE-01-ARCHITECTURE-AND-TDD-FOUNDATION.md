# Phase 01 — Architecture & TDD Foundation

**Phase ID:** `PHASE-01`  
**Phase Name:** Architecture & TDD Foundation  
**Estimated Effort:** 1 Day (Day 2)  
**Status:** READY  
**Owner:** Backend Lead & QA Lead

---

## 1. Objective and Business Justification

Establish an indisputably green baseline across all test runners and linters before modifying application architecture. TDD cannot function effectively if test suites fail due to missing configuration or linter warnings break CI builds.

---

## 2. Current-State Findings and Evidence

- **Backend API Tests**: 11 test files (70 tests) fail with `Error: JWT_SECRET environment variable is required` because Vitest does not load environment variables by default. When `$env:JWT_SECRET` is set, all 1,026 tests pass 100%.
- **Frontend Web Tests**: 1 test in `apps/web/test/messaging.spec.ts:33` fails with `expected 'You' to be 'Me'` due to display name default in `chat-mappers.ts`. 307 tests pass.
- **Backend Linting**: `pnpm --filter @ogroniedu/api lint` fails with exit code 1 due to 11 Oxlint warnings (1 unused expression in `booking-messages.service.ts:221`, 10 unused imports in test files) and `--deny-warnings`.

---

## 3. Exact Scope

1. Create `apps/api/vitest.config.ts` defining test environment variables (`JWT_SECRET`, `NODE_ENV=test`, `ALLOW_TEST_AUTH_BYPASS=true`).
2. Fix assertion in `apps/web/test/messaging.spec.ts:33`.
3. Fix the unused expression in `apps/api/src/modules/notifications/booking-messages.service.ts:221`.
4. Remove unused imports in the 7 API test files.
5. Verify that `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` ALL pass 100% green across all workspaces.

---

## 4. Explicit Exclusions

- No modification of business logic or database schemas.
- No changes to production dependencies.

---

## 5. Prerequisite Phases

- `PHASE-00-BASELINE-AND-INVENTORY.md` (Completed).

---

## 6. Tasks and Unique Task IDs

- `TDD-001`: Create `apps/api/vitest.config.ts` with test environment configuration.
- `TDD-002`: Align display name expectation in `apps/web/test/messaging.spec.ts`.
- `TDD-003`: Eliminate 11 Oxlint warnings across API modules and test specs.

---

## 7. Actual Affected Files and Modules

- `apps/api/vitest.config.ts` (new)
- `apps/web/test/messaging.spec.ts`
- `apps/api/src/modules/notifications/booking-messages.service.ts`
- `apps/api/test/admin-governance-phase08.spec.ts`
- `apps/api/test/financial-escrow-phase10.spec.ts`
- `apps/api/test/product-analytics-retention-phase14.spec.ts`
- `apps/api/test/booking-lifecycle-phase07.spec.ts`
- `apps/api/test/architecture-audit-phase15.spec.ts`
- `apps/api/test/security-isolation-performance-phase12.spec.ts`
- `apps/api/test/communication-notifications-phase09.spec.ts`

---

## 8. Files Created, Split, Moved, or Removed

- Created: `apps/api/vitest.config.ts`.
- Modified: `apps/web/test/messaging.spec.ts`, `apps/api/src/modules/notifications/booking-messages.service.ts`, test files.

---

## 9. Frontend Work

- Update test case in `apps/web/test/messaging.spec.ts:33` to assert `'You'` (the default non-Bengali sender name from `chat-mappers.ts`) or supply `{ ownName: 'Me' }`.

---

## 10. Backend Work

- Configure Vitest test runner with environment variables.
- Remove dead expression in `booking-messages.service.ts:221`.
- Clean unused imports in test specifications.

---

## 11. Database and Migration Work

- None required.

---

## 12. Event-Driven Architecture Work

- None required.

---

## 13. Security Requirements

- Ensure `JWT_SECRET` in `vitest.config.ts` is explicitly a test-only fixture and is not loaded in production mode.

---

## 14. Unit Test Requirements

- `@ogroniedu/api`: 1,026 passing tests across 96 files.
- `@ogroniedu/web`: 308 passing tests across 48 files.
- `@ogroniedu/database`: 33 passing tests across 4 files.
- Total: 1,367 passing tests (100% pass rate).

---

## 15. Integration Test Requirements

- Supertest API suites run green.

---

## 16. Browser Automation and E2E Scenarios

- Confirm Playwright test config reads `E2E_BASE_URL`.

---

## 17. Required Commands

```pwsh
# 1. Typecheck
pnpm typecheck

# 2. Linting (Must exit 0 with 0 warnings)
pnpm lint

# 3. All Unit and Integration Tests (Must exit 0 with 1,367 tests passing)
pnpm test
```

---

## 18. Acceptance Criteria

1. `pnpm typecheck` returns 0 errors.
2. `pnpm lint` returns 0 warnings and 0 errors across all 527 web files and 520 api files.
3. `pnpm test` executes cleanly without requiring manual shell environment variables and reports 1,367 / 1,367 tests passing.

---

## 19. Failure and Rollback Considerations

- Changes are isolated to test configuration and test specs. Safe to roll back via git checkout if needed.

---

## 20. Definition of Done

- CI build pipeline executes cleanly: typecheck, lint, and all test suites pass 100%.

---

## 21. Expected Evidence

- Terminal logs confirming 0 lint warnings and 1,367 passing tests.

---

## 22. Known Risks and Blockers

- None.

---

## 23. Estimated Effort

- 1 Day.

---

## 24. Next-Phase Dependencies

- Unblocks `PHASE-02-FRONTEND-MODULARIZATION-PAGES.md` and `PHASE-03-BACKEND-SERVICE-INTERFACE-MODULARIZATION.md`.
