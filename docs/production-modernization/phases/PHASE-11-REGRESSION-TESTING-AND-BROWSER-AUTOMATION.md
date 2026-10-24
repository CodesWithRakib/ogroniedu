# Phase 11 — Automated Regression & Browser Automation

**Phase ID:** `PHASE-11`  
**Phase Name:** Automated Regression & Browser Automation  
**Estimated Effort:** 1 Day (Day 6)  
**Status:** READY  
**Owner:** QA Automation Lead & Test Automation Engineer

---

## 1. Objective and Business Justification
Execute comprehensive regression testing across all tiers and validate the entire platform using headless Playwright E2E suites and live desktop headful browser automation via Chrome DevTools MCP. Ensure that all modernization and architectural refactoring preserved 100% of functional requirements and introduced zero regressions.

---

## 2. Current-State Findings and Evidence
- 1,367 automated tests existing in the repository (Database: 33, Web: 308, API: 1,026).
- 11 Playwright E2E spec files in `apps/web/e2e/` targeting `http://localhost:5000`.
- Automated browser testing protocol established in user rules utilizing `chrome-devtools-mcp` tools on standard ports (Web: 5000, API: 4000, DB: 5432).

---

## 3. Exact Scope
1. Execute full Vitest unit and integration test suite across all 5 workspaces (`pnpm test`); verify 100% pass rate.
2. Execute Playwright E2E test suites (`apps/web/e2e/`):
   - `smoke.public.spec.ts`
   - `auth.guards.spec.ts`
   - `tutor.discovery.spec.ts`
   - `journey.booking.spec.ts`
   - `tutor.verification.spec.ts`
   - `tutor.evidence.spec.ts`
   - `tutor.localization.spec.ts`
   - `admin.console.spec.ts`
   - `keyboard.a11y.spec.ts`
   - `responsive.matrix.spec.ts`
3. Execute automated desktop browser walkthrough via Chrome DevTools MCP tools:
   - Student Dashboard & Booking
   - Guardian Multi-Child & Safety Holds
   - Tutor Availability & Earnings
   - Admin Governance Console
4. Assert zero browser console errors (`list_console_messages`), 100% successful API calls (`list_network_requests`), and verify visual screenshots.

---

## 4. Explicit Exclusions
- Manual exploratory testing of unreleased experimental features (white-label orgs).

---

## 5. Prerequisite Phases
- All implementation phases (`PHASE-01` through `PHASE-10`).

---

## 6. Tasks and Unique Task IDs
- `E2E-001`: Run Playwright E2E suite against local test stack (`port 5000`).
- `E2E-002`: Verify end-to-end booking journey via Playwright.
- `E2E-003`: Verify tutor verification dossier upload and admin approval via Playwright.
- `E2E-004`: Perform automated live browser walkthrough of all 4 role dashboards via Chrome DevTools MCP.
- `E2E-005`: Verify responsive viewport rendering on mobile (375px), tablet (768px), and desktop (1280px).
- `E2E-006`: Verify bilingual Bengali/English UI toggle across public and dashboard pages.

---

## 7. Actual Affected Files and Modules
- Entire platform running on ports 5000, 4000, 5432.
- `apps/web/e2e/**/*`
- `playwright.config.ts`

---

## 8. Files Created, Split, Moved, or Removed
- Created: Test artifacts, traces, and visual screenshots in `apps/web/test-results/` and artifact directories.

---

## 9. Frontend Work
- Ensure test IDs (`data-testid`) are present on all critical interactive workflow elements.

---

## 10. Backend Work
- Run backend API server with test seed data on port 4000.

---

## 11. Database and Migration Work
- Seed test database using `pnpm --filter @ogroniedu/database db:seed`.

---

## 12. Event-Driven Architecture Work
- Confirm outbox worker processes test events during E2E runs.

---

## 13. Security Requirements
- Ensure no real credentials are leaked in Playwright test reports or screenshots.

---

## 14. Unit Test Requirements
- Full Vitest suite: 1,367/1,367 tests passing.

---

## 15. Integration Test Requirements
- Zero integration test regressions across all packages.

---

## 16. Browser Automation and E2E Scenarios
- Complete user journey coverage from landing page to booking confirmation and dashboard management.

---

## 17. Required Commands
```pwsh
# 1. Full Unit & Integration Suite
pnpm test

# 2. Playwright E2E Suite
pnpm --filter @ogroniedu/web e2e

# 3. Verification of Zero Lint Warnings
pnpm lint
```

---

## 18. Acceptance Criteria
1. Full unit/integration test suite reports 1,367+ passing tests (0 failures, 0 errors).
2. Playwright E2E suite passes all critical user journey specs.
3. Chrome DevTools MCP browser inspection confirms zero unhandled console errors and HTTP 200 API responses.
4. Screenshots confirm clean responsive layout on mobile and desktop viewports.

---

## 19. Failure and Rollback Considerations
- If an E2E test fails due to animation timing, adjust Playwright `expect.toPass()` retry window.

---

## 20. Definition of Done
- Complete test suite green, E2E passing, visual inspection signed off.

---

## 21. Expected Evidence
- Playwright HTML and JSON test reports in `apps/web/test-results/`; screenshots captured via MCP.

---

## 22. Known Risks and Blockers
- None.

---

## 23. Estimated Effort
- 1 Day.

---

## 24. Next-Phase Dependencies
- Unblocks `PHASE-12-PRODUCTION-BUILD-AND-RELEASE-READINESS.md`.
