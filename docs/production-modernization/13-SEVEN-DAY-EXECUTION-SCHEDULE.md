# OgroniEdu — Seven-Day MVP Execution Schedule

**Status:** APPROVED & REALISTIC  
**Target Window:** 7 Working Days to Production MVP Launch  
**Owner:** Release Manager & Full-Stack Architecture Team

---

## 1. Schedule Overview & Daily Focus

```
Day 1 ──► Audit, Baseline Metrics & Authoritative Documentation (Phase 00)
Day 2 ──► TDD Foundation, Vitest Config, Web Test Fix, Oxlint Cleanup (Phase 01)
Day 3 ──► Frontend Modularization, Thin Routes & Feature Views (Phase 02)
Day 4 ──► Backend Modularization, Interface Extraction & God Services (Phase 03, 07-10)
Day 5 ──► Security Hardening, File Download, Database Migrations & Outbox (Phase 04-06)
Day 6 ──► Automated Regression, Playwright E2E & Chrome DevTools Visual QA (Phase 11)
Day 7 ──► Production Build, Docker Staging Validation & Go/No-Go Release (Phase 12)
```

---

## 2. Daily Milestone Plan

### Day 1 — Repository Discovery, Baseline & Documentation Foundation

- **Objectives**: Complete deep audit of all 1,105 files, 88 compiled routes, 36 controllers, 20 modules, 80 tables/views, 106 oversized files, and 27 services violating interface isolation. Establish the master documentation hierarchy and detailed phase blueprints.
- **Tasks**: `INV-001` through `INV-010`.
- **Target Deliverables**:
  - `00-CURRENT-STATE.md` through `15-DECISION-AND-BLOCKER-LOG.md` fully authored and repository-grounded.
  - Detailed phase blueprints in `phases/` generated.
- **Quality Gate**: Zero ambiguities regarding codebase architecture, baseline test failures, or task dependencies.

---

### Day 2 — Architecture & TDD Foundation (Achieving 100% Green Baseline)

- **Objectives**: Stabilize testing and linting harnesses so TDD can be strictly enforced for all subsequent refactorings.
- **Tasks**:
  - `TDD-001`: Create `apps/api/vitest.config.ts` providing `JWT_SECRET` and test environment variables. (Brings API tests from 952 to 1,026 / 1,026 PASS).
  - `TDD-002`: Fix assertion in `apps/web/test/messaging.spec.ts:33` to match `chat-mappers.ts`. (Brings Web tests from 307 to 308 / 308 PASS).
  - `TDD-003`: Eliminate 11 Oxlint warnings in API (`booking-messages.service.ts:221` and test specs).
- **Quality Gate**: Running `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` ALL succeed with exit code 0 across the monorepo.

---

### Day 3 — Frontend Modularization & Thin Route Refactoring

- **Objectives**: Decompose the 11 oversized `page.tsx` routes into thin Server Component route handlers delegating to feature views; decompose monolithic `navigation.ts` into role-specific files.
- **Tasks**:
  - `FE-001`: Decompose `bookings/[id]/page.tsx` (829 lines) into `src/features/bookings/components/detail/`.
  - `FE-002`: Decompose `guardian/children/[studentId]/page.tsx` (728 lines) into `src/features/guardian/components/child-detail/`.
  - `FE-003`: Decompose `sessions/[id]/page.tsx` (634 lines) into `src/features/bookings/components/session-detail/`.
  - `FE-004`: Decompose `assignments/[id]/page.tsx` (577 lines) into `src/features/learning/components/assignment-detail/`.
  - `FE-005`: Decompose `bookings/[id]/pay/page.tsx` (575 lines) into `src/features/payments/components/checkout/`.
  - `FE-006`: Modularize `src/lib/navigation.ts` (853 lines) into `src/lib/navigation/*`.
  - `FE-007` to `FE-016`: Decompose remaining oversized pages and god components.
- **Quality Gate**: Next.js production build succeeds with all 88 routes intact; zero page files exceed 40 lines.

---

### Day 4 — Backend Service Modularization & Interface Extraction

- **Objectives**: Enforce the non-negotiable architectural rule: extract internal interfaces from the 27 services into dedicated `interfaces/`, `enums/`, `dto/` folders; decompose top oversized god services.
- **Tasks**:
  - `BE-001` to `BE-027`: Extract interfaces out of the 27 identified services.
  - `BE-028`: Decompose `auth.service.ts` (1,096 lines) into registration, session, OTP, and magic-link services.
  - `BE-029`: Decompose `tutor-replacement.service.ts` (1,053 lines) into scoring and arbitration services.
  - `BE-030`: Decompose `safety-reports.service.ts` (1,039 lines) into incident and action services.
  - `BE-031`: Decompose `tutor-verification.service.ts` (992 lines) into dossier and reviewer services.
  - `BE-032`: Decompose `assignments.service.ts` (922 lines) into assignment, submission, and grading services.
  - `BE-033`: Decompose `analytics.service.ts` (789 lines) into operational and financial services.
- **Quality Gate**: Zero interfaces or enums inside service files; all 1,026 backend unit/integration tests pass.

---

### Day 5 — Security Hardening, Storage, Database & Outbox Integrity

- **Objectives**: Resolve all identified security findings, implement missing file download streaming, verify outbox reliability, and apply database integrity optimizations.
- **Tasks**:
  - `SEC-001` (`RLD-001`): Implement `GET /api/v1/files/:fileId/download` with HMAC signed URL token verification.
  - `SEC-002` (`RLD-002`): Add automated negative test verifying test-dispatch 403 Forbidden gating.
  - `SEC-003` (`RLD-006`): Eliminate hardcoded dev-secret fallback strings; fail fast if `JWT_SECRET` missing.
  - `SEC-004`: Enforce binary magic-number MIME type inspection for uploads.
  - `EVT-001`: Enforce max retry 5 with dead-letter logging in outbox worker.
  - `DB-001`: Add foreign key constraints from `file_assets` to entity tables via migration 031.
  - `DB-002`: Add compound geo-search indexes via migration 032.
  - `DB-003`: Run cold recovery BCDR migration replay drill.
- **Quality Gate**: Admin can preview and download verification dossiers; database drill passes; security test suite passes 100%.

---

### Day 6 — Automated Regression, Playwright E2E & Chrome DevTools Visual QA

- **Objectives**: Execute full automated regression testing across all tiers and conduct live browser testing using Chrome DevTools MCP.
- **Tasks**:
  - Full Vitest regression test run: 1,367+ tests passing across Database, Web, and API.
  - `E2E-001` to `E2E-003`: Run Playwright E2E suites (`smoke.public.spec.ts`, `auth.guards.spec.ts`, `journey.booking.spec.ts`, `tutor.verification.spec.ts`, `tutor.evidence.spec.ts`).
  - `E2E-004`: Automated desktop browser walkthrough of Student, Guardian, Tutor, and Admin dashboards via Chrome DevTools MCP (`new_page`, `navigate_page`, `list_console_messages`, `list_network_requests`, `take_screenshot`).
  - `E2E-005` & `E2E-006`: Responsive viewport verification (mobile, tablet, desktop) and bilingual Bengali/English toggle audit.
- **Quality Gate**: 100% automated test pass rate; zero uncaught browser console errors; zero failed API calls.

---

### Day 7 — Production Build, Operations, Docker & Release Signoff

- **Objectives**: Final release preparation, container build validation, production environment validation, and go/no-go signoff.
- **Tasks**:
  - `REL-001`: Verify production build (`pnpm build`) and assert zero server secrets leaked in client bundle.
  - `REL-002`: Validate `.env.example` against `env.validation.ts` schema.
  - `REL-003`: Validate Docker multi-container staging compose build (`docker-compose.staging.yml`).
  - `REL-004`: Complete all items in `14-RELEASE-READINESS-CHECKLIST.md` and produce final evidence report.
- **Quality Gate**: Platform declared **MVP Go** with documented, reproducible verification evidence.
