# OgroniEdu — Master Phase Execution Plan

**Status:** APPROVED & OPERATIONAL  
**Date:** 2026-10-24  
**Scope:** 13-Phase modernization and release plan detailing entry criteria, scope, task maps, and exit criteria.

---

## 1. Phase Dependency Graph

```
Phase 00: Baseline Audit & Inventory (Day 1)
   │
   ▼
Phase 01: Architecture & TDD Foundation (Day 2)
   │
   ├──────────────────────────────┬──────────────────────────────┐
   ▼                              ▼                              ▼
Phase 02: Frontend Modularization Phase 03: Backend Modularization Phase 04: Security & Storage
(Thin Routes & Leaf Components)  (Interface/Enum Extraction)    (File Download & Gating)
   │                              │                              │
   ├──────────────────────────────┼──────────────────────────────┘
   ▼                              ▼
Phase 05: Event-Driven & Outbox  Phase 06: Database & Index Optimizations
   │                              │
   └──────────────┬───────────────┘
                  ▼
Phase 07: Core Marketplace & Booking Lifecycle
   │
   ├──────────────────────────────┬──────────────────────────────┐
   ▼                              ▼                              ▼
Phase 08: Learning LMS & Class   Phase 09: Messaging & Sockets   Phase 10: Role Dashboards
   │                              │                              │
   └──────────────────────────────┴──────────────────────────────┘
                                  │
                                  ▼
Phase 11: Regression Testing & Browser Automation (Day 6)
(Full Vitest 1,367+ Green + Playwright E2E + Chrome DevTools MCP)
                                  │
                                  ▼
Phase 12: Production Build & Release Readiness (Day 7)
(Production Build, Docker, BCDR Replay Drill, Final Go/No-Go)
```

---

## 2. Phase Summaries & Exit Gates

### Phase 00 — Baseline Audit & Master Documentation Foundation
- **Target Day**: Day 1
- **Focus**: Repository discovery, baseline builds/tests/lints, cataloging 1,105 files, 88 routes, 36 controllers, 20 modules, 80 tables, 106 oversized files, establishing authoritative documentation.
- **Exit Gate**: All 16 master docs in `docs/production-modernization/` and all detailed phase files in `phases/` generated.

### Phase 01 — Architecture & TDD Foundation
- **Target Day**: Day 2
- **Focus**: Test harness repair (`TDD-001`: `apps/api/vitest.config.ts`), frontend test assertion fix (`TDD-002`: `test/messaging.spec.ts`), elimination of 11 Oxlint warnings (`TDD-003`).
- **Exit Gate**: `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` ALL pass green with zero errors and zero warnings across all workspaces.

### Phase 02 — Frontend Modularization & Thin Route Refactoring
- **Target Day**: Day 3
- **Focus**: Decomposing 11 oversized `page.tsx` routes into thin wrappers (<40 lines) delegating to `src/features/<domain>/`; modularizing monolithic `navigation.ts` (853 lines) into role configs; decomposing top god components (`tutor-details-page.tsx`, `profile-page.tsx`, `GuardianChildrenManager.tsx`).
- **Exit Gate**: All 88 routes compile, zero oversized route pages remain, visual inspection via Chrome DevTools confirms zero layout regression.

### Phase 03 — Backend Service Modularization & Interface/Enum Extraction
- **Target Day**: Day 4
- **Focus**: Enforce user's non-negotiable rule: extract all internal interfaces/enums from 27 services into dedicated `interfaces/`, `enums/`, `dto/` folders; decompose top 6 god services (>600 lines: `auth.service.ts`, `tutor-replacement.service.ts`, `safety-reports.service.ts`, `tutor-verification.service.ts`, `assignments.service.ts`, `analytics.service.ts`).
- **Exit Gate**: Zero interfaces or enums inside service files; all 1,026 backend unit/integration tests pass.

### Phase 04 — Application Security Hardening & Storage Access
- **Target Day**: Day 5
- **Focus**: Implement missing `GET /api/v1/files/:fileId/download` with signed URL verification (`SEC-001`); add automated regression test for test-dispatch role gating (`SEC-002`); eliminate dev-secret fallback strings (`SEC-003`); enforce binary magic-number MIME validation (`SEC-004`).
- **Exit Gate**: Admin can preview and download verification dossiers; unauthenticated test-dispatch returns 403; security test suite passes.

### Phase 05 — Event-Driven Architecture & Transactional Outbox
- **Target Day**: Day 5
- **Focus**: Verify outbox transactional boundary across bookings, payments, and safety reports; enforce max retry 5 with dead-letter logging (`EVT-001`); verify webhook idempotency (`EVT-002`).
- **Exit Gate**: Outbox worker dispatches events with `FOR UPDATE SKIP LOCKED`; zero duplicate event processing.

### Phase 06 — Database Integrity, Migrations & Performance Indexes
- **Target Day**: Day 5
- **Focus**: Add foreign key constraints from `file_assets` to entity tables (`DB-001`); add compound indexes for tutor search geo-queries (`DB-002`); run cold recovery migration replay drill (`DB-003`).
- **Exit Gate**: Database tests pass 33/33; zero foreign key orphans; migration 031 and 032 verified.

### Phase 07 — Core Marketplace & Tutoring Lifecycle Hardening
- **Target Day**: Days 3–4
- **Focus**: Tutor discovery, booking request creation, tutor accept/decline, 48h/24h booking expiry sweepers, session scheduling, rescheduling state machine, SSLCommerz/bKash/Nagad escrow checkout, double-entry ledger posting, tutor replacement guarantee.
- **Exit Gate**: End-to-end booking lifecycle regression suite passes; double-entry ledger debits equal credits.

### Phase 08 — Learning Management & Classroom Workflow
- **Target Day**: Day 4
- **Focus**: Assignments creation, submissions uploader, rubric grading drawer, lesson planner, attendance recording, student progress panel, interactive whiteboard local canvas + Google Meet launcher.
- **Exit Gate**: Learning test specs pass; classroom tools render cleanly without errors.

### Phase 09 — Real-time Communication & Notifications
- **Target Day**: Day 4
- **Focus**: Socket.IO notification gateway, booking chat cursor pagination, content safety regex redaction (phone, payment, links), unread counts, audio alerts.
- **Exit Gate**: Real-time notifications and chat message read receipts pass all unit and integration tests.

### Phase 10 — Role Dashboards & Governance Consoles
- **Target Day**: Days 3–4
- **Focus**: Student dashboard, Guardian portal (multi-child oversight, safety alert notifications), Tutor dashboard (profile, verification, earnings), Organization portal (members, branches), Admin governance (users, disputes, taxonomy, audit logs).
- **Exit Gate**: All 9 canonical roles navigate to their authorized portals without 403 or routing errors.

### Phase 11 — Automated Regression & Browser Verification
- **Target Day**: Day 6
- **Focus**: Run full Vitest regression suite (1,367+ tests); run Playwright E2E suite (11 specs); perform automated headful desktop browser walkthrough using Chrome DevTools MCP tools (`new_page`, `click`, `fill`, `evaluate_script`, `take_screenshot`).
- **Exit Gate**: 100% test pass rate, 0 console errors, 0 failed API network calls, visual screenshots verified.

### Phase 12 — Production Build, Operations & Release Readiness
- **Target Day**: Day 7
- **Focus**: Full production build verification (`pnpm build`); Docker staging compose validation; environment variable fail-fast checks; production deployment runbook; final evidence-based release report.
- **Exit Gate**: Release manager signoff on `14-RELEASE-READINESS-CHECKLIST.md`; platform declared MVP Go.
