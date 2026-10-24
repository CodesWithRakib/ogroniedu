# OgroniEdu — Production Modernization Program

**Status:** Audit & Documentation Foundation Complete  
**Date:** 2026-10-24  
**Entry Point:** This directory is the single authoritative source of truth for the modernization program.

---

## What This Program Is

This is not a feature-request roadmap. It is a repository-grounded, evidence-driven modernization program for the existing OgroniEdu (অগ্রণী এডু) tutoring SaaS platform. The platform has completed 15 implementation phases and is being prepared for a 7-day MVP launch.

The program's goal is to produce a **coherent, secure, maintainable, production-ready platform** — not merely a collection of pages that compile.

## What This Program Is NOT

- A request to add more features indiscriminately.
- A blanket rewrite of the entire application in one pass.
- A migration to a new framework or package manager.
- A justification to weaken security or validation to make tests pass.

## How to Use This Documentation

1. Read `00-CURRENT-STATE.md` to understand the verified baseline.
2. Read `01-SCOPE-AND-MVP-REQUIREMENTS.md` to understand what is in and out of scope.
3. Read `11-MASTER-TASK-REGISTER.md` to find the current task status.
4. Read `12-PHASE-EXECUTION-PLAN.md` to understand the phase boundaries and dependencies.
5. Read the specific phase document in `phases/` for detailed task instructions.
6. Execute one task at a time, updating the task register after each increment.

## Document Inventory

| # | Document | Purpose |
|---|----------|---------|
| 00 | `00-CURRENT-STATE.md` | Verified baseline: architecture, build, test, lint results |
| 01 | `01-SCOPE-AND-MVP-REQUIREMENTS.md` | MVP scope, exclusions, launch criteria |
| 02 | `02-ARCHITECTURE-AND-DEPENDENCIES.md` | Actual architecture and dependency map |
| 03 | `03-ROUTE-AND-PAGE-INVENTORY.md` | Complete frontend route inventory |
| 04 | `04-API-AND-BACKEND-INVENTORY.md` | Complete backend API and operation inventory |
| 05 | `05-FEATURE-AND-ROLE-MATRIX.md` | Role, permission, feature, and route matrix |
| 06 | `06-DATABASE-AND-DATA-INTEGRITY.md` | Entities, relations, migrations, indexes, transactions |
| 07 | `07-SECURITY-AUDIT.md` | Threat model, findings, mitigations, verification |
| 08 | `08-ARCHITECTURE-REFACTOR-REGISTER.md` | Large files, coupling, duplication, modularization |
| 09 | `09-DEPRECATED-AND-DEPENDENCY-REGISTER.md` | Deprecated code, outdated dependencies, migration decisions |
| 10 | `10-TESTING-AND-BROWSER-AUTOMATION.md` | Testing architecture and execution instructions |
| 11 | `11-MASTER-TASK-REGISTER.md` | Single source of truth for all implementation tasks |
| 12 | `12-PHASE-EXECUTION-PLAN.md` | Detailed phases, dependencies, and exit criteria |
| 13 | `13-SEVEN-DAY-EXECUTION-SCHEDULE.md` | Prioritized daily work plan |
| 14 | `14-RELEASE-READINESS-CHECKLIST.md` | Evidence-based go/no-go criteria |
| 15 | `15-DECISION-AND-BLOCKER-LOG.md` | Architectural decisions, external blockers, scope trade-offs |

## Phase Documents

Each implementation phase has a detailed document in `phases/`. See `12-PHASE-EXECUTION-PLAN.md` for the phase list.

## Related Existing Documentation

The following pre-existing documents in the repository root and `docs/` contain valuable context. They are not superseded — they are historical records:

- `POST_IMPLEMENTATION_AUDIT.md` — Phase A read-only audit (2026-10-22) with findings RLD-001 through RLD-008.
- `docs/PHASE_STATUS.md` — Master phase status tracker for Phases 0–15.
- `docs/PRODUCT_AUDIT.md` — Comprehensive product audit (v2.0).
- `docs/USER_ROLES_AND_PERMISSIONS.md` — Role and permission baseline.
- `docs/USER_JOURNEYS.md` — User journey documentation (contains known phantom-route issues — see RLD-004).
- `docs/ROUTE_AND_NAVIGATION_MAP.md` — Route map (contains known phantom-route issues — see RLD-004).
- `docs/31-architecture-decisions/` — Architecture Decision Records (ADRs).
- `prompts/` — Historical implementation prompt archives (Phases 0–23).

## Key Baseline Metrics (Verified 2026-10-24)

| Metric | Value |
|--------|-------|
| API unit/integration tests | 1,026 passing (96 files) |
| Web unit tests | 308 passing (48 files) |
| Database tests | 33 passing (4 files) |
| Total tests | 1,367 passing |
| TypeScript errors | 0 |
| Oxlint warnings (API) | 11 (all in test files; `--deny-warnings` causes failure) |
| Oxlint warnings (Web) | 0 |
| Backend controllers | 36 |
| Backend modules | 20 |
| Frontend routes | ~83 |
| Database tables/views | 80 (78 tables + 2 views) |
| Migration files | 30 |
| Canonical roles | 9 |