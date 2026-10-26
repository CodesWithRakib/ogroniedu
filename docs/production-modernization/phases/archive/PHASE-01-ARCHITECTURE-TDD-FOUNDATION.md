# Phase 1 — Architecture TDD Foundation

**Date:** Following Phase 0  
**Duration:** 1 day  
**Owner:** Backend Lead

---

## Objective

Establish TDD scaffolding infrastructure before making any architectural extraction changes. Create test fixtures, service-under-test templates, and CI integration points so that all subsequent refactor phases guarantee zero regressions.

---

## Scope

| Task | Description                                                                                                                                                      |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1.1 | Add `__tests__` directories to `packages/auth`, `packages/payments`, `packages/tutors`, `packages/learning`, `packages/trust`, `packages/admin` skeletons        |
| S1.2 | Create `pnpm turbo run test:unit` invocation in CI pipeline (root `package.json` scripts)                                                                        |
| S1.3 | Configure Istanbul coverage thresholds in `jest.config.ts`: `coverageThreshold` for each package: statements ≥ 80%, branches ≥ 80%, functions ≥ 90%, lines ≥ 85% |
| S1.4 | Add Playwright config with `retries: 2` and `expectTimeout: 10000` to stabilize flaky E2E                                                                        |
| S1.5 | Fix `learning.e2e.spec.ts` and `notifications.e2e.spec.ts` flakiness: add deterministic fixtures, isolate user state, increase retry config                      |

---

## Acceptance Criteria

- [ ] All package `__tests__/` directories initialized
- [ ] `pnpm turbo run test:unit` runs green across all packages (no new failures from scaffolding)
- [ ] Istanbul coverage reports generated with target thresholds defined
- [ ] Playwright config stable; both flaky test suites pass within 2 retries
- [ ] CI pipeline updated with test gate for new packages

---

_End of Phase 1._
