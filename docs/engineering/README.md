# Ogroni Edu — Engineering Audit (Independent Re-Verification, 2026-10-16)

**Auditor:** principal-architect audit session (AI), requested by project owner
**Repository:** `C:\Sofof_tech_2026\ogroniedu` @ `c58d026` (2026-10-15), working tree clean at audit start. Mid-session the project owner committed `a90fd06` (2026-10-16 09:44, docs + `.gitignore` only — zero code diff verified), which tracked the docs set and removed the old `docs` gitignore entry.
**Scope:** independent re-verification of the platform's current state, feature/route/API/DB inventories, static-data audit, security/maintainability findings, and a prioritized execution plan. **No implementation changes were made in this session.**

---

## Executive summary

The platform is a functional, feature-rich bilingual tutoring marketplace at **Phase 23 complete / Phase 24 planned**. The core stack (NestJS API, Next.js 16 web, PostgreSQL 18, TypeORM, RTK Query, Socket.IO) is coherent, the database is well-normalized (45 tables, 122 indexes, 78 FKs, 1 exclusion constraint), and the automated baseline largely passes: **typecheck, build, unit/integration tests (658 tests), and docs validation all pass**.

However, this independent audit **contradicts two Phase-23 "green" claims** and found several previously-undocumented defects with reproduction evidence:

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                            | Severity                  | Evidence                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ----------------------------------------------------- |
| F-1 | **`pnpm lint` fails** (16 warnings: 4 API + 12 web)                                                                                                                                                                                                                                                                                                                                                                | Medium (CI gate)          | `pnpm lint` → exit 1                                  |
| F-2 | **`pnpm format:check` fails** (repo-root scope: **52 files** unformatted — 14 app/tooling + 37 pre-existing docs + `turbo.json`; the `docs/engineering/` set is prettier-clean)                                                                                                                                                                                                                                    | Low–Medium                | `pnpm format:check` → exit 1                          |
| F-3 | **DTO validation silently disabled in dev** (`tsx watch` emits no `design:paramtypes` → global `ValidationPipe` is a no-op; 500s instead of 400s)                                                                                                                                                                                                                                                                  | **High**                  | live API probes + metadata probes under tsx           |
| F-4 | **Curated fake tutors flash on `/tutors` and are clickable**; submitting one → API 500 (`invalid input syntax for type uuid`) — **this is what broke the E2E booking journey**                                                                                                                                                                                                                                     | **High** (product-facing) | E2E run, live browser probe, API log stack trace      |
| F-5 | Static/demo data presented as real in 10+ places (home stats, dashboards, tutor details reviews, "99.99% uptime" widget, demo quick-fill login, fake Google button)                                                                                                                                                                                                                                                | Medium–High               | file:line inventory in `05-static-data-audit.md`      |
| F-6 | **React hydration mismatches** in `BottomNavbar` (auth-state-dependent SSR vs client render) on most pages; "script tag inside component" warnings                                                                                                                                                                                                                                                                 | Medium                    | web dev-server logs; `BottomNavbar.tsx:139`           |
| F-7 | Admin-console nav is shown to `support_agent` / `compliance_reviewer` / pure `super_admin`, but `/dashboard/admin/*` gates on role `admin` only (dead links / redirects)                                                                                                                                                                                                                                           | Medium                    | `navigation.ts:266-323`, `RoleDashboardLayout.tsx:27` |
| F-8 | Repo hygiene (largely resolved mid-session): at audit start `docs/` was `.gitignore`d (only **14** tracked docs files); the owner's commit `a90fd06` removed the `docs` ignore and tracked **121** docs files. Residual: `prompts/` still ignored (intended?); Playwright artifact `apps/web/test-results/.last-run.json` **tracked in git**; this audit set (`02`–`09`) currently untracked, pending owner commit | Low–Medium                | `.gitignore`, `git show a90fd06`, `git ls-files`      |

**As-built status (Phase 24 Pre-Gate, 2026-10-16 → 2026-10-17).** All six Pre-Gate steps were
implemented after this audit, one commit per step: F-3 → PG-1 `6e87fc5` (+ watcher scoping
`83cf532`), F-4 → PG-2 `454ac2d`, F-1/F-2 → PG-3 `72ccdb0` (+ `59477d6` after later feature
work), F-6 → PG-4 `6a41dbe`, F-7/R-1 → PG-5 `65b14df`, SEC-6 → PG-6 `a4b1471`; SEC-1 and the
SEC-4 subset of F-5 landed upstream in the owner's `b3b29e3`. As-built baselines and per-step
outcomes: `06` §0 and `08` §2.1. As-built E2E: **47/47 green** at HEAD (the suite grew 45 → 47
with the owner's specs; `06` §0). F-8 remains owner-tracked (`08` §6): the audit set itself is
committed (`4b027a0`); the `prompts/` and Playwright-artifact questions are unchanged.

**Live E2E baseline (staging-style dev stack, seeded demo accounts): 45 tests → 43 passed, 1 failed, 1 did not run.** The single failure is fully explained by F-3 + F-4 (root-caused with API stack trace and a deterministic browser reproduction).

### Verdict

- The product is **not** in the state its own Phase-23 report claims (lint/format are red), but the reds are mechanical and cheap to fix.
- The **highest-value pre-gate fixes** are F-3 (dev/prod validation divergence) and F-4 (fake tutors being actionable), followed by F-6/F-7.
- After those, the existing `docs/architecture/phase-24-plan.md` (WS1–WS8) remains the correct next phase; this audit adds a small **Phase 24 Pre-Gate** worklist (`08-execution-roadmap.md`).

---

## Document index

| Document                  | Contents                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `00-project-baseline.md`  | Environment, methodology, verification matrix, evidence log                                     |
| `01-product-discovery.md` | Feature inventory (API modules × web features × DB), delivered vs partial                       |
| `02-routing-and-ux.md`    | Route inventory (44 pages), guard architecture, role↔navigation matrix, runtime UX findings     |
| `03-backend-and-api.md`   | 22 controllers / 120 routes, envelope contract, authorization audit, **F-3 dev validation gap** |
| `04-database.md`          | 45 tables / 12 migrations / integrity objects, seed & dev data                                  |
| `05-static-data-audit.md` | Complete fabricated-data register with file:line + the E2E-proven curated-tutor incident        |
| `06-quality-baseline.md`  | Test/build/typecheck/docs evidence, lint/format failures, E2E run details, repo hygiene         |
| `07-security-findings.md` | Auth/guard posture, rate limiting, error semantics, security-relevant findings                  |
| `08-execution-roadmap.md` | Phase status reconciliation, Pre-Gate P0 list, Phase 24 mapping, risk register, decision log    |
| `09-evidence-appendix.md` | Raw command outputs and reproduction scripts (paths + excerpts)                                 |

> Note: docs are tracked since the owner's `a90fd06` commit (the old `docs` gitignore entry was removed); this engineering set (`02`–`09`) is committed since `4b027a0`. As-built updates from the Phase 24 Pre-Gate are marked "As-built" and cite their commits.
