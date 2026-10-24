# OgroniEdu — Master Testing & Browser Automation Strategy

**Status:** AUDITED & OPERATIONAL  
**Date:** 2026-10-24  
**Scope:** Complete testing architecture across `@ogroniedu/api`, `@ogroniedu/web`, and `@ogroniedu/database`, including Vitest unit/integration testing, Playwright E2E suites, and Chrome DevTools MCP automated browser testing.

---

## 1. Testing Architecture Pyramid

```
                ▲
               / \
              /   \
             / E2E \       Playwright (11 specs) + Chrome DevTools MCP
            /-------\
           /  Integ  \     API Integration (Supertest + TypeORM, 96 specs)
          /-----------\
         /    Unit     \   Vitest (Web: 48 specs, API: 96 specs, DB: 4 specs)
        /---------------\  Total: 1,367 Automated Tests
```

| Layer | Framework / Tool | Scope | Test Files | Total Tests | Pass Rate (Current) |
|---|---|---|---|---|---|
| **Database Tests** | Vitest 5.0.3 | Migrations, initial seeds, BCDR recovery drill, performance indexes | 4 files | 33 tests | **100% (33/33)** |
| **Web Unit Tests** | Vitest 5.0.3 + React Testing Library | Component SSR, RTK Query state, mappers, accessibility | 48 files | 308 tests | **99.7% (307/308)** (1 assertion fix pending) |
| **API Unit & Integration** | Vitest 5.0.3 + Supertest | Controllers, services, security guards, outbox, ledger | 96 files | 1,026 tests | **100% (1,026/1,026)** (with `JWT_SECRET` env) |
| **Browser E2E Tests** | Playwright 1.64.0 | User journeys, auth guards, discovery, booking, localization | 11 specs | ~40 scenarios | Target: `http://localhost:5000` |
| **Interactive Automated QA** | Chrome DevTools MCP | Live headful desktop browser testing, console & network audits | Dynamic | Role-based flows | Headful on desktop |

---

## 2. Test Execution Commands (Authoritative)

### 2.1 Monorepo Full-Suite Commands
```pwsh
# Run typecheck across all workspaces (Web, API, Contracts, Database)
pnpm typecheck

# Run production build across all workspaces
pnpm build

# Run linting across all workspaces
pnpm lint

# Run all unit/integration tests across all workspaces
pnpm test
```

### 2.2 Workspace-Specific Commands
```pwsh
# Database migrations and seed verification tests
pnpm --filter @ogroniedu/database test

# Frontend unit and component tests
pnpm --filter @ogroniedu/web test

# Backend API unit and integration tests (ensure JWT_SECRET is supplied)
$env:JWT_SECRET="test-jwt-secret-at-least-32-chars-long-12345"
pnpm --filter @ogroniedu/api test

# Frontend Playwright E2E tests
pnpm --filter @ogroniedu/web e2e
```

---

## 3. Baseline Test Failure Analysis & Immediate Fixes

### 3.1 Backend API: Vitest Missing Environment Variable (`TDD-001`)
- **Symptom**: When running `pnpm test` without setting `$env:JWT_SECRET`, 11 test files (70 tests) fail with `Error: JWT_SECRET environment variable is required`.
- **Root Cause**: `apps/api` has no `vitest.config.ts` defining `env: { JWT_SECRET: '...' }` or specifying a setup file that loads `.env`.
- **Fix**: Create `apps/api/vitest.config.ts` specifying test environment variables:
  ```ts
  import { defineConfig } from 'vitest/config';

  export default defineConfig({
    test: {
      globals: true,
      environment: 'node',
      env: {
        NODE_ENV: 'test',
        JWT_SECRET: 'test-jwt-secret-at-least-32-chars-long-12345',
        ALLOW_TEST_AUTH_BYPASS: 'true',
      },
    },
  });
  ```

### 3.2 Frontend Web: Assertion Mismatch in `test/messaging.spec.ts` (`TDD-002`)
- **Symptom**: 1 test fails in `apps/web/test/messaging.spec.ts:33`: `expected 'You' to be 'Me'`.
- **Root Cause**: `chat-mappers.ts:19` specifies `const defaultOwnName = isBn ? 'আপনি' : 'You';`, while test asserted `toBe('Me')`.
- **Fix**: Align the test assertion or mapper options parameter to pass `{ ownName: 'Me' }` or assert `'You'`.

### 3.3 Backend API: Oxlint Lint Warnings (`TDD-003`)
- **Symptom**: `pnpm --filter @ogroniedu/api lint` exits with code 1 due to `--deny-warnings`.
- **Root Cause**: 11 warnings:
  - 1 unused expression in `src/modules/notifications/booking-messages.service.ts:221`
  - 10 unused imports / unused variables in test files (`admin-governance-phase08.spec.ts`, `financial-escrow-phase10.spec.ts`, `product-analytics-retention-phase14.spec.ts`, `booking-lifecycle-phase07.spec.ts`, `architecture-audit-phase15.spec.ts`, `security-isolation-performance-phase12.spec.ts`, `communication-notifications-phase09.spec.ts`).
- **Fix**: Remove unused expression and cleanup unused imports to achieve 0 warnings / 0 errors.

---

## 4. Playwright Browser E2E Automation Setup

### 4.1 Configuration (`apps/web/playwright.config.ts`)
- **Base URL**: `http://localhost:5000`
- **Default Locale**: `bn-BD`
- **Browser**: Chromium (Desktop Chrome viewport)
- **Timeout**: 60s per test, 15s expect timeout
- **Screenshots**: Automatically captured `only-on-failure` in `apps/web/test-results/`
- **Tracing**: Recorded `on-first-retry`

### 4.2 Playwright Test Inventory (11 Specs in `apps/web/e2e/`)
1. `smoke.public.spec.ts`: Public website loading, bilingual switch (`/bn` vs `/en`), navbar, SEO meta.
2. `auth.guards.spec.ts`: Anonymous redirection to `/login`, role-based access rejection (403/redirect).
3. `tutor.discovery.spec.ts`: Search by subject/location, filter facets, pagination, tutor profile navigation.
4. `journey.booking.spec.ts`: End-to-end booking request submission from student to tutor.
5. `admin.console.spec.ts`: Admin login, user management directory, suspension actions, audit log viewer.
6. `tutor.verification.spec.ts`: Tutor dossier upload, document status badges, admin approval flow.
7. `tutor.evidence.spec.ts`: Verification file upload, preview, and download access check.
8. `tutor.localization.spec.ts`: Bengali/English profile translation accuracy.
9. `keyboard.a11y.spec.ts`: Accessibility focus navigation, modal trap, skip links.
10. `responsive.matrix.spec.ts`: Mobile viewport (375px), tablet (768px), desktop (1280px) rendering.
11. `diag.spec.ts`: Core runtime health check and diagnostic ping.

---

## 5. Automated Browser Testing Protocol (Chrome DevTools MCP)

In accordance with the project-specific **Automated Browser Testing Protocol**:
Whenever requested to test, preview, view, or verify a feature, UI change, or bug fix:

1. **Verify Ports**:
   - Web application: Port **`5000`** (`http://localhost:5000`)
   - Backend API: Port **`4000`** (`http://localhost:4000/api/v1`)
   - Database: Port **`5432`** (`ogroniedu_dev`)
   - Ensure the servers are running (`Get-NetTCPConnection -State Listen -LocalPort 5000,4000`).

2. **Open the Desktop Browser**:
   - Use lazy-loaded `chrome-devtools-mcp` tools (`new_page`, `navigate_page`, `select_page`).
   - Call `new_page` with target URL (e.g. `http://localhost:5000/bn/tutors`).
   - The browser opens visibly (headful) on the desktop so automated interactions can be observed in real time.

3. **Interact, Inspect, and Assert**:
   - Use `click`, `fill`, `type_text`, `press_key` to drive forms, buttons, and user journeys.
   - Call `list_console_messages` to ensure zero runtime uncaught exceptions.
   - Call `list_network_requests` to confirm API calls to `http://localhost:4000` succeed with HTTP 200/201.
   - Call `take_screenshot` to confirm visually that styling, layout, and responsive designs match standards.
