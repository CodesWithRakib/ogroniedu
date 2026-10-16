# 00 — Project Baseline & Verification Methodology

**Date:** 2026-10-16 · **Commit:** `c58d026` ("feat: add role-based dashboard layouts and auth service implementation", 2026-10-15) · **Working tree:** clean at start and end of audit (test artifacts created by the E2E run were restored/removed).

## 1. Environment

| Item | Value |
|------|-------|
| OS | Windows 11 (win32), PowerShell 7 |
| Node | v26.8.1 |
| pnpm / Turbo | 12.10.1 / 2.11.7 |
| API | NestJS 12.1.2, TypeORM 1.1.2 (`pg` 8.23.1), runs via `tsx watch src/main.ts` in dev; `tsc` build → `node dist/main.js` for prod |
| Web | Next.js 16.4.0 (Turbopack dev), React 19.3.0, RTK Query 2.13, next-intl 4.14, Tailwind 4.3 |
| DB | PostgreSQL 18 (local service), dev DB `ogroniedu_dev`, migrations 001–012 applied |
| Test runners | API: Vitest; Web: Vitest + Playwright (e2e, separate); DB: Vitest |
| Credentials | repo-root `.env` (not printed); seeded demo accounts use dev-only password `OgroniDev#2026` (documented in `apps/web/e2e/README.md`) |

## 2. What was verified vs. what was inspected

**Executed with evidence (this session):**
- `pnpm typecheck` → PASS (6 tasks)
- `pnpm test` → PASS (API 53 files / 496 tests; Web 26 files / 134 tests; Database 4 files / 28 tests = 658 total)
- `pnpm build` → PASS (4 tasks; 27+ routes compiled)
- `pnpm docs:validate` → PASS (162 files)
- `pnpm lint` → **FAIL, exit 1** (4 API + 12 web warnings; both apps use `--deny-warnings`)
- `pnpm format:check` (prettier) → **FAIL, exit 1** (14 files)
- Playwright E2E against live dev stack (API :4000, web :5000), all `E2E_*` creds provided → **45 tests: 43 passed, 1 failed, 1 did not run**
- Live API probes (Node `fetch` scripts): login shapes, tutor search, booking-request POST → 500 root cause
- tsx metadata probes: `Reflect.getMetadata('design:paramtypes', …)` → `undefined` under tsx; built `dist/` contains `__metadata("design:paramtypes", …)` → prod builds have metadata
- DB statistics queries against `ogroniedu_dev` (45 tables, 1 view, 122 indexes, 515 constraints, 12 migrations)
- Web/API dev-server logs inspected for warnings/errors (hydration mismatches, 401 floods, socket rejects, rate limiting)

**Inspected statically (no execution):** CI workflows, Dockerfile/staging compose, `.gitignore`, docs claims, navigation/guard code, seeds, static-data constants.

**Not verified (out of scope / requires environment not present):** Redis-backed rate limiting/distributed locks under load, real payment provider webhooks, real email/SMS delivery, staging Docker image build, load/performance benchmarks, backup/restore drill.

## 3. Frozen baseline metrics (append to future audits)

| Metric | Value |
|--------|-------|
| API controllers / mapped routes | 22 / 120 |
| DB tables / views / indexes / constraints | 45 / 1 / 122 / 515 (78 FK, 21 unique, 69 check, 1 GiST exclusion) |
| TypeORM entities | 41 (`apps/api/src/modules/**/entities`) |
| Migrations | 12 SQL files (`packages/database/src/migrations/001…012`) |
| Web pages (`page.tsx`) | 44 (43 localized + root redirect) |
| RTK Query services | 17 (`apps/web/src/store/services/`) |
| Web feature modules | 15 (`apps/web/src/features/`) |
| E2E specs | 8 (`apps/web/e2e/*.spec.ts`) |
| Total automated tests | 658 passing |

## 4. Evidence rules applied

1. No claim without an executed command or file:line reference.
2. Pre-existing failures are labeled as such; regressions introduced by this session are labeled separately (there were none — tree restored to clean).
3. "Skipped ≠ passed": E2E skips (missing creds in CI) are reported as skips, and CI's own e2e workflow does not provide `E2E_ADMIN_*` (see `06-quality-baseline.md`).

## 5. Reproduction quick-start

```powershell
# Baseline suites
pnpm typecheck ; pnpm test ; pnpm build ; pnpm docs:validate
pnpm lint ; pnpm format:check        # both currently exit 1

# Live E2E (requires local Postgres + seeded dev DB)
pnpm --filter @ogroniedu/api dev     # :4000
pnpm --filter @ogroniedu/web dev     # :5000
$env:E2E_BASE_URL="http://localhost:5000"
$env:E2E_STUDENT_EMAIL="student.demo@ogroniedu.com"; $env:E2E_STUDENT_PASSWORD="OgroniDev#2026"
$env:E2E_TUTOR_EMAIL="tutor.demo@ogroniedu.com";     $env:E2E_TUTOR_PASSWORD="OgroniDev#2026"
$env:E2E_ADMIN_EMAIL="admin.demo@ogroniedu.com";     $env:E2E_ADMIN_PASSWORD="OgroniDev#2026"
pnpm --filter @ogroniedu/web e2e
```

Raw outputs captured during the audit are listed in `09-evidence-appendix.md`.
