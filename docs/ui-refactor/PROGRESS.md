# Progress Tracker — UI/UX Refactor

**Date:** 2026-10-17 · **Overall:** implementation complete; verification complete (credentialed E2E pending); **uncommitted**.

## Status board

| Workstream | Status | Evidence |
| :--- | :--- | :--- |
| Repository audit (routes/components/dark/hex inventory) | ✅ Done | `REPOSITORY_AUDIT.md`, `ROUTE_AND_PAGE_INVENTORY.md`, `EXISTING_COMPONENT_AUDIT.md` |
| Centralised light-only token system (`globals.css`) | ✅ Done | token spec + build render |
| Exact brand hexes centralised + accessible derivations | ✅ Done | `brand.ts`; contrast tests pass |
| Theme system removal (palettes, switcher, persistence, `next-themes`) | ✅ Done | scans = 0; lockfile updated |
| Dark→light codemod conversion (167 files + hand fixes) | ✅ Done | scanners clean |
| Public-route crash fix (radix Slot) | ✅ Done | smoke 200s + regression test |
| Unit/contract tests | ✅ Done | 179/179 across 30 files |
| Production build | ✅ Done | exit 0, zero warnings |
| Route smoke (64 routes) | ✅ Done | `ROUTE_ACCEPTANCE_MATRIX.md` |
| E2E (credential-free) | ✅ Done | 39 passed / 8 skipped / 0 failed |
| E2E (credentialed journeys) | ⏳ Pending environment | needs `E2E_*` seeded accounts |
| Docs set (`docs/ui-refactor/*` + guidelines rewrite) | ✅ Done | this directory + `design-system-and-ui-guidelines.md` v2.0.0 |
| Human review & commit | ⏳ Open | 167 modified/added files under `apps/web/src` + docs + lockfile |

## Numbers at a glance

| Metric | Value |
| :--- | :--- |
| Route pages / layouts | 64 / 9 |
| Source files converted | 167 under `apps/web/src` (+ PWA assets, tests, docs) |
| `dark:` variants eliminated | ~349 across 74 files |
| Hex literals normalised | ~718 across 37 files |
| Dead utilities fixed | 117 (`bg-surface`) |
| Unit tests | 179 passed (2 new regression suites) |
| E2E | 39 passed, 8 skipped, 0 failed |
| Build warnings | 0 |

## Open items

1. **Review**: hand-review the diff (highest-risk: Navbar, dashboard chrome, checkout picker, toaster).
2. **Decide** gap-register B1 (admin layout allow-list) and B2 (delete `components/trust/*`).
3. **Run** credentialed E2E journeys with seeded accounts (`pnpm db:seed`, then `E2E_*` env vars).
4. **Commit** — everything is currently uncommitted; commit message should reference defect A1 fix and the light-only v2.0.0 design system.

## Change log of this tracker

- 2026-10-17: initial board; implementation + verification recorded; QA marks credentialed E2E pending.
