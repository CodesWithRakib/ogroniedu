# OgroniEdu — Production Modernization Program

**Status:** AUDITED & OPERATIONAL  
**Date:** 2026-10-24  
**Entry Point:** Authoritative single source of truth for the OgroniEdu (অগ্রণী এডু) complete system modernization, architectural refactoring, TDD, security hardening, and 7-Day MVP launch.

---

## 1. Executive Summary

This program is a repository-grounded, evidence-driven modernization plan for the existing OgroniEdu tutoring SaaS platform. The repository has completed 15 previous implementation phases. The goal of this modernization program is to produce a **coherent, secure, maintainable, production-ready platform** ready for MVP launch within 7 working days.

### Core Non-Negotiable Operating Principles

1. **Frontend Completeness**: _"frontend amon file bad jabe na sob file ei amra kaj korbo"_ — Every single one of the 528 frontend files is cataloged, audited, and tracked.
2. **Backend Modularity**: _"backend er o enum , interface kokhonoi service er vitore thakbe na alada folder kore module e thakbe"_ — Zero internal interfaces or enums inside service files; all definitions reside in dedicated module subfolders (`interfaces/`, `enums/`, `types/`, `contracts/`, `dto/`).
3. **Thin Route Architecture**: In Next.js App Router, `page.tsx` files must remain thin (<40 lines), delegating presentation and interaction to feature views.
4. **Test-Driven Refactoring (TDD)**: No refactoring without green baseline regression tests. Zero tests may be deleted or weakened.
5. **No Blind Monorepo Rewrites**: Preserve the stable NestJS modular monolith and avoid introducing risky package splits during the 7-day launch window.

---

## 2. Master Documentation Directory Map

| Document                                                                                                                                                  | Purpose & Content                                                                             | Status     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------- |
| [`00-CURRENT-STATE.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/00-CURRENT-STATE.md)                                           | Verified baseline: build, typecheck, lint, test metrics, oversized files, initial blockers    | ✅ AUDITED |
| [`01-SCOPE-AND-MVP-REQUIREMENTS.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/01-SCOPE-AND-MVP-REQUIREMENTS.md)                 | MVP scope definition, in-scope features, explicit exclusions, and launch criteria             | ✅ AUDITED |
| [`02-ARCHITECTURE-AND-DEPENDENCIES.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/02-ARCHITECTURE-AND-DEPENDENCIES.md)           | Monorepo topology, Next.js App Router, NestJS modular monolith, PostgreSQL 18, Socket.IO      | ✅ AUDITED |
| [`03-ROUTE-AND-PAGE-INVENTORY.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/03-ROUTE-AND-PAGE-INVENTORY.md)                     | Complete frontend inventory: all 88 compiled routes, 528 files, 11 oversized pages            | ✅ AUDITED |
| [`04-API-AND-BACKEND-INVENTORY.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/04-API-AND-BACKEND-INVENTORY.md)                   | Complete backend inventory: 36 controllers, 20 modules, 227 endpoints, 27 violating services  | ✅ AUDITED |
| [`05-FEATURE-AND-ROLE-MATRIX.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/05-FEATURE-AND-ROLE-MATRIX.md)                       | Granular permission registry and feature matrix across all 9 canonical roles                  | ✅ AUDITED |
| [`06-DATABASE-AND-DATA-INTEGRITY.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/06-DATABASE-AND-DATA-INTEGRITY.md)               | Database schema, 80 tables/views, 30 migrations, double-entry ledger, outbox consistency      | ✅ AUDITED |
| [`07-SECURITY-AUDIT.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/07-SECURITY-AUDIT.md)                                         | Threat model, findings RLD-001 through RLD-008, auth security, RBAC/ABAC, upload validation   | ✅ AUDITED |
| [`08-ARCHITECTURE-REFACTOR-REGISTER.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/08-ARCHITECTURE-REFACTOR-REGISTER.md)         | Register of 106 oversized files ($\ge 300$ lines), god services, and page decomposition plans | ✅ AUDITED |
| [`09-DEPRECATED-AND-DEPENDENCY-REGISTER.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/09-DEPRECATED-AND-DEPENDENCY-REGISTER.md) | Dependency versions, deprecation audit, code smell register, phantom route purges             | ✅ AUDITED |
| [`10-TESTING-AND-BROWSER-AUTOMATION.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/10-TESTING-AND-BROWSER-AUTOMATION.md)         | Testing pyramid (1,367 tests), Vitest harness setup, Playwright E2E, Chrome DevTools MCP      | ✅ AUDITED |
| [`11-MASTER-TASK-REGISTER.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/11-MASTER-TASK-REGISTER.md)                             | Single source of truth: 72 tasks (`TDD`, `SEC`, `BE`, `FE`, `EVT`, `DB`, `E2E`, `REL`)        | ✅ AUDITED |
| [`12-PHASE-EXECUTION-PLAN.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/12-PHASE-EXECUTION-PLAN.md)                             | 13 implementation phase blueprints (Phases 00 to 12) with entry/exit gates                    | ✅ AUDITED |
| [`13-SEVEN-DAY-EXECUTION-SCHEDULE.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/13-SEVEN-DAY-EXECUTION-SCHEDULE.md)             | Prioritized daily work plan mapped across 7 working days                                      | ✅ AUDITED |
| [`14-RELEASE-READINESS-CHECKLIST.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/14-RELEASE-READINESS-CHECKLIST.md)               | Evidence-based 17-item Go/No-Go release scorecard                                             | ✅ AUDITED |
| [`15-DECISION-AND-BLOCKER-LOG.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/15-DECISION-AND-BLOCKER-LOG.md)                     | Architecture Decision Records (ADR-001 to ADR-007), blockers, scope trade-offs                | ✅ AUDITED |

---

## 3. Implementation Phase Blueprints (`phases/`)

Every phase document contains 25 structured sections covering objectives, current findings, exact scope, task IDs, affected files, frontend/backend/database work, security, unit/integration/E2E test criteria, commands, and definition of done:

- [`phases/PHASE-00-BASELINE-AND-INVENTORY.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/phases/PHASE-00-BASELINE-AND-INVENTORY.md) — Baseline Audit & Master Documentation (Day 1)
- [`phases/PHASE-01-ARCHITECTURE-AND-TDD-FOUNDATION.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/phases/PHASE-01-ARCHITECTURE-AND-TDD-FOUNDATION.md) — Vitest Harness, Web Test Fix & Oxlint Cleanup (Day 2)
- [`phases/PHASE-02-FRONTEND-MODULARIZATION-PAGES.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/phases/PHASE-02-FRONTEND-MODULARIZATION-PAGES.md) — 11 Thin Routes & Feature Views (Day 3)
- [`phases/PHASE-03-BACKEND-SERVICE-INTERFACE-MODULARIZATION.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/phases/PHASE-03-BACKEND-SERVICE-INTERFACE-MODULARIZATION.md) — 27 Service Interface Extractions & God Services (Day 4)
- [`phases/PHASE-04-SECURITY-HARDENING-AND-STORAGE-ACCESS.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/phases/PHASE-04-SECURITY-HARDENING-AND-STORAGE-ACCESS.md) — File Download, Test Dispatch & Secret Gating (Day 5)
- [`phases/PHASE-05-EVENT-DRIVEN-ARCHITECTURE-AND-OUTBOX.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/phases/PHASE-05-EVENT-DRIVEN-ARCHITECTURE-AND-OUTBOX.md) — Outbox Worker, Retry Alerts & Idempotency (Day 5)
- [`phases/PHASE-06-DATABASE-INTEGRITY-AND-MIGRATIONS.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/phases/PHASE-06-DATABASE-INTEGRITY-AND-MIGRATIONS.md) — Foreign Keys, Geo-Search Indexes & BCDR Drill (Day 5)
- [`phases/PHASE-07-CORE-MARKETPLACE-AND-BOOKINGS-WORKFLOW.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/phases/PHASE-07-CORE-MARKETPLACE-AND-BOOKINGS-WORKFLOW.md) — Discovery, Bookings, Rescheduling & Escrow (Days 3–4)
- [`phases/PHASE-08-LEARNING-LMS-AND-CLASSROOM-WORKFLOW.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/phases/PHASE-08-LEARNING-LMS-AND-CLASSROOM-WORKFLOW.md) — Assignments, Grading, Attendance & Classroom (Day 4)
- [`phases/PHASE-09-COMMUNICATION-MESSAGING-AND-NOTIFICATIONS.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/phases/PHASE-09-COMMUNICATION-MESSAGING-AND-NOTIFICATIONS.md) — Sockets, Chat Redaction & In-App Alerts (Day 4)
- [`phases/PHASE-10-ROLE-DASHBOARDS-AND-ADMIN-GOVERNANCE.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/phases/PHASE-10-ROLE-DASHBOARDS-AND-ADMIN-GOVERNANCE.md) — 9 Canonical Roles & Admin Governance (Days 3–4)
- [`phases/PHASE-11-REGRESSION-TESTING-AND-BROWSER-AUTOMATION.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/phases/PHASE-11-REGRESSION-TESTING-AND-BROWSER-AUTOMATION.md) — Full Regression, Playwright E2E & Chrome DevTools Visual QA (Day 6)
- [`phases/PHASE-12-PRODUCTION-BUILD-AND-RELEASE-READINESS.md`](file:///C:/Sofof_tech_2026/ogroniedu/docs/production-modernization/phases/PHASE-12-PRODUCTION-BUILD-AND-RELEASE-READINESS.md) — Production Build, Staging Docker & Go/No-Go Release (Day 7)

---

## 4. Key Verified Baseline Metrics (October 24, 2026)

| Metric                       | Measured Value                                           | Status                              |
| ---------------------------- | -------------------------------------------------------- | ----------------------------------- |
| **TypeScript Typecheck**     | 0 errors                                                 | ✅ 100% PASS                        |
| **Production Build**         | Clean build for both Next.js and NestJS                  | ✅ 100% PASS                        |
| **Linting (Web)**            | 0 warnings, 0 errors (527 files)                         | ✅ Clean                            |
| **Linting (API)**            | 11 warnings (1 in service, 10 in test specs)             | ⏳ Fixed in `TDD-003`               |
| **Automated Tests**          | 1,367 tests across Database (33), Web (308), API (1,026) | ✅ 100% PASS (with test env config) |
| **Total Source Files**       | 1,105 files                                              | Audited                             |
| **Compiled Web Routes**      | 88 routes                                                | Audited                             |
| **Backend Controllers**      | 36 controllers (20 modules, 227 endpoints)               | Audited                             |
| **Database Tables & Views**  | 80 (78 tables, 2 views, 30 migrations)                   | Audited                             |
| **Oversized Source Files**   | 106 files $\ge 300$ lines                                | Cataloged in refactor register      |
| **Services with Interfaces** | 27 services                                              | Targeted in Phase 03                |
| **Oversized Route Pages**    | 11 `page.tsx` files                                      | Targeted in Phase 02                |

---

## 5. Next Immediate Step

The audit and documentation foundation is **100% COMPLETE**.

The first implementation task is:

- **Task ID**: `TDD-001`
- **Objective**: Configure Vitest test environment variables in `apps/api/vitest.config.ts`.
- **Target**: Bring all 1,026 backend tests to 100% green without requiring manual shell exports.
- **Verification Command**:
  ```pwsh
  pnpm --filter @ogroniedu/api test
  ```

**Awaiting user instruction to execute Phase 01 Task `TDD-001`.**
