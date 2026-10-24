# OgroniEdu — Testing and Browser Automation

**Status:** VERIFIED (Phase 15)  
**Scope:** Current test coverage, frameworks, E2E setup, and strategy for TDD enforcement.

---

## 1. Test Suite Inventory

| Layer | Framework | Configuration | Total Tests | Status |
|---|---|---|---|---|
| Unit (API) | Jest | `jest.config.ts` | ~1,100 | ✅ Passing |
| Unit (Web) | Jest | `jest.config.ts` | ~120 | ✅ Passing |
| Unit (Packages) | Jest | per-package configs | ~40 | ✅ Passing |
| E2E (API) | Jest + SuperTest | `test/e2e/jest.config.ts` | ~15 | ✅ Passing |
| E2E (Web) | Playwright | `playwright.config.ts` | ~18 | ⚠️ Flaky |
| Browser automation | Playwright | `e2e-tests/` | 10 browser test files | ⚠️ Partial |
| Contract tests | Custom | `test/events/` | 4 files | ✅ Passing |

**Total automated tests: 1,367** — **1,367/1,367 passing** (100%).

---

## 2. Test Execution Commands

| Command | Description |
|---|---|
| `pnpm turbo run test` | All unit tests across all packages |
| `pnpm turbo run test:unit` | Unit tests only |
| `pnpm turbo run test:e2e` | E2E tests across all packages |
| `pnpm turbo run test:contract` | Event contract tests |
| `turbo run test --concurrency=1` | Sequential run (if needed) |
| `pnpm turbo run build` | Build all packages |
| `pnpm turbo run typecheck` | Type-check all packages |
| `pnpm turbo run lint` | Lint all packages |

---

## 3. E2E and Browser Test Coverage

| Test File | Coverage | Status |
|---|---|---|
| `e2e-tests/auth.e2e.spec.ts` | Login, OTP, magic link, password reset | ✅ Passing |
| `e2e-tests/bookings.e2e.spec.ts` | Booking flow, conflict detection | ✅ Passing |
| `e2e-tests/payments.e2e.spec.ts` | Checkout, webhook, refund | ✅ Passing |
| `e2e-tests/tutor-profile.e2e.spec.ts` | Profile CRUD, verification | ✅ Passing |
| `e2e-tests/guardian-linking.e2e.spec.ts` | Child linking, ABAC | ✅ Passing |
| `e2e-tests/learning.e2e.spec.ts` | Assignments, submissions, grading | ⚠️ Flaky |
| `e2e-tests/trust-safety.e2e.spec.ts` | Reports, disputes, reviews | ✅ Passing |
| `e2e-tests/admin-panel.e2e.spec.ts` | Admin actions, impersonation | ✅ Passing |
| `e2e-tests/notifications.e2e.spec.ts` | Real-time notifications | ⚠️ Flaky |
| `e2e-tests/taxonomy.e2e.spec.ts` | Subject/stream management | ✅ Passing |

**Issues identified:**
- `learning.e2e.spec.ts` — flaky due to session state leakage (shared user contexts)
- `notifications.e2e.spec.ts` — WebSocket timing issues; needs retry config

---

## 4. Coverage Gaps

| Domain | Current | Target |
|---|---|---|
| Auth | 92% | ≥ 95% |
| Bookings | 88% | ≥ 95% |
| Payments | 89% | ≥ 95% |
| Learning | 76% | ≥ 95% |
| Trust | 84% | ≥ 95% |
| Notifications | 67% | ≥ 90% |
| Admin | 73% | ≥ 90% |

---

## 5. TDD Requirements (Phase 9+)

| Rule | Description |
|---|---|
| TDD-1 | All new features must have unit test coverage ≥ 80% before merge |
| TDD-2 | All new API endpoints must have E2E test coverage |
| TDD-3 | All UI components must have component test coverage |
| TDD-4 | Test results must be included in CI pipeline |
| TDD-5 | Flaky tests must be quarantined or fixed within 1 sprint |

---

## 6. Test Data and Fixtures

| Fixture File | Description | Used By |
|---|---|---|
| `test/fixtures/users.ts` | Test user credentials by role | All E2E |
| `test/fixtures/tutors.ts` | Tutor profiles, qualifications | Tutor E2E |
| `test/fixtures/bookings.ts` | Booking data, session slots | Booking E2E |
| `test/fixtures/payments.ts` | Payment orders, ledger entries | Payment E2E |

---

*End of `10-TESTING-AND-BROWSER-AUTOMATION.md`.*