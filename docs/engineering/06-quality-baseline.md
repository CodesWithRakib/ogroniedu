# 06 — Quality Baseline: Suites, E2E, Lint/Format, CI, Repo Hygiene

Everything in this document was executed or read this session against code state `c58d026`
(no code changed mid-session — see `00-project-baseline.md` header). Where a prior claim is
contradicted, both the claim and the measurement are shown.

## 1. Baseline suites (re-run this session)

| Gate                   | Command              | Result                                                                               |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| Typecheck              | `pnpm typecheck`     | **PASS** (6 tasks)                                                                   |
| Unit/integration tests | `pnpm test`          | **PASS — 658 tests** (API 53 files / 496; Web 26 files / 134; Database 4 files / 28) |
| Build                  | `pnpm build`         | **PASS** (4 tasks; web build compiles 27+ route entries)                             |
| Docs integrity         | `pnpm docs:validate` | **PASS** (162 files)                                                                 |
| Lint                   | `pnpm lint`          | **FAIL, exit 1** — 16 warnings (F-1, §3)                                             |
| Format                 | `pnpm format:check`  | **FAIL, exit 1** — 52 files (F-2, §4)                                                |

## 2. E2E baseline (live dev stack; API `:4000`, web `:5000`, seeded demo accounts)

Config: `apps/web/playwright.config.ts` (baseURL `http://localhost:5000`, default locale `bn-BD`);
8 specs in `apps/web/e2e/`. Run with all `E2E_STUDENT_*`, `E2E_TUTOR_*`, `E2E_ADMIN_*` credentials supplied.

**Result: 45 tests → 43 passed · 1 failed · 1 did not run.**

| Spec                        | Outcome                                                                                                                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `journey.booking.spec.ts`   | **1 failed** — "student files booking request" (F-3 × F-4; root cause + stack trace in `09-evidence-appendix.md` §2–3); the dependent tutor-inbox test was skipped by serial mode ("1 did not run") |
| `admin.console.spec.ts`     | passed — admin suspends and reactivates a disposable user via UI                                                                                                                                    |
| `tutor.evidence.spec.ts`    | passed — tutor uploads NID evidence + qualification; admin approves from queue                                                                                                                      |
| `auth.guards.spec.ts`       | passed — unauthenticated redirects for guarded routes; revoke-all sessions green                                                                                                                    |
| `keyboard.a11y.spec.ts`     | passed — skip-link/keyboard checks in bn + en                                                                                                                                                       |
| `responsive.matrix.spec.ts` | passed — **20/20** (360/390/768/1280/1440 × 4 public pages)                                                                                                                                         |
| `smoke.public.spec.ts`      | passed — public pages render; contact form creates a real ticket (a re-run hit the per-email daily rate limit → `429`, tolerated by the spec)                                                       |
| `diag.spec.ts`              | passed — stats band present (count=1), `/public/stats` → 200                                                                                                                                        |

Notes: demo password `OgroniDev#2026` lives in `apps/web/e2e/README.md`; the `journey.booking`
failure is **fully explained** by the curated-tutor flash (F-4) plus the validation gap (F-3) —
both documented, neither fixed in this session.

**Second independent run (re-verification, same day, fresh servers):** running just
`journey.booking.spec.ts` again produced **1 failed, 1 did not run** — but the assertion that
failed changed: `expect(booking-request-modal).toBeVisible()` timed out because the click landed
during the curated→real list swap and no modal remained; the settled page showed only the real
tutor ("মোট ১ জন শিক্ষক"). Two runs, two distinct symptom outcomes of the same defect. This is a
**deterministic race with non-deterministic symptom** (F-4), not a flake; the honest current-state
E2E result for that file is "not green in either observed mode". Full outputs and artifacts:
`09-evidence-appendix.md` §3.

## 3. F-1 — `pnpm lint` failures (verbatim list, 16 warnings, `--deny-warnings`)

API — 4 warnings, all `no-useless-escape` in `apps/api/src/modules/auth/utils/phone.utils.ts`
(escape of `(` and `)` inside a character class, lines **11** and **38**, two each).

Web — 12 warnings, all `no-unused-vars`:

| File                                                              | Line                 | Symbol                                                                          |
| ----------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------- |
| `apps/web/test/dashboard-layout.spec.ts`                          | 17                   | `DashboardTopbar` (import)                                                      |
| `apps/web/src/features/dashboard/components/UserNavDropdown.tsx`  | 8, 16, 28            | `Settings`, `Sparkles`, `Badge`                                                 |
| `apps/web/src/features/dashboard/components/DashboardSidebar.tsx` | 7, 9, 10, 11, 12, 45 | `Sparkles`, `ShieldCheck`, `GraduationCap`, `Users`, `User`, param `rolePreset` |
| `apps/web/src/features/dashboard/components/DashboardShell.tsx`   | 10                   | `NavItem`, `RoleConfig` (types)                                                 |

Attribution (verified with `git show --stat c58d026`): `phone.utils.ts` was **added** and the
dashboard components **created** by commit `c58d026` itself — i.e., the last commit before this
audit introduced the warnings without re-running the gate.

## 4. F-2 — `pnpm format:check` failures (52 files; scope note)

The repo-root script is `prettier --check "**/*.{ts,tsx,md,json}"` — it covers the whole tree,
including `docs/` and `turbo.json`. Measured breakdown:

| Scope                                 | Files                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api`                            | 3 (`auth.service.ts`, `dto/register.dto.ts`, `test/query-builder-relations.spec.ts`)                                                                   |
| `apps/web`                            | 11 (dashboard components ×4, app page wrappers ×3, `next-env.d.ts`, `ARCHITECTURE.md`, `test/dashboard-layout.spec.ts`, `test-results/.last-run.json`) |
| Root                                  | 1 (`turbo.json`)                                                                                                                                       |
| `docs/` (pre-existing canonical docs) | 37                                                                                                                                                     |
| **Total**                             | **52**                                                                                                                                                 |

The first pass this session counted **14** files — that is exactly the `apps/api` + `apps/web`
subset (3 + 11); the full repo-root scope additionally flags docs and tooling config. The
`docs/engineering/` set from this audit is **prettier-clean** (formatted with
`pnpm exec prettier --write "docs/engineering/*.md"`), so it contributes 0 to this count.
Attribution mirrors F-1: the failing app files are all from `c58d026`.

**Pipeline interaction:** `ci.yml` runs `pnpm format:check` (line 50). As written, the current
tree fails CI at the format gate — F-2 is not cosmetic.

## 5. CI coverage gaps (read from workflows)

| Gap                                                                                                                                                       | Evidence                                    | Consequence                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml` runs format, docs, typecheck, tests, build, Dockerfile builds — but **never `pnpm lint`** (despite the job name "Lint, Test, Typecheck & Build") | `ci.yml:49-62`; no `lint` match in the file | F-1 can ship undetected                                                                                                                                               |
| `e2e.yml` passes only `E2E_STUDENT_*` and `E2E_TUTOR_*` from secrets; **no `E2E_ADMIN_*`**                                                                | `e2e.yml:58-62`                             | `admin.console` journey cannot run in CI even with secrets configured; other journey specs skip when their secrets are absent (behavior documented in the e2e README) |
| E2E triggers only on `workflow_dispatch` or push to `main` touching `apps/web/e2e/**` / `playwright.config.ts`                                            | `e2e.yml:3-9`                               | App-code changes that break journeys never trigger the suite                                                                                                          |
| No nightly/scheduled E2E run                                                                                                                              | absent in `e2e.yml`                         | Regressions surface only on manual dispatch                                                                                                                           |
| `deploy.yml` gates on `format:check` + `typecheck`                                                                                                        | `deploy.yml:46,50`                          | Currently-failing format gate blocks deploys from this tree                                                                                                           |

Phase 24 WS6 already scopes closing these gaps — this section is independent confirmation with
line numbers, not a new plan.

## 6. F-8 — Repo hygiene (re-verified, partially resolved mid-session)

- **At audit start** (`c58d026`): `.gitignore` contained `docs` and `prompts`; `git ls-files docs`
  counted exactly **14** files — the earlier working note was correct.
- **Mid-session the owner committed `a90fd06`** (2026-10-16 09:44 +0600, "docs: initialize
  comprehensive project documentation…") which removed the `docs` ignore rule and tracked the
  documentation set: `git ls-files docs` → **121**; **zero code diff** between `c58d026` and
  `a90fd06` (`git diff --stat` for `*.ts`/`*.tsx` empty).
- **Residual issues:** `apps/web/test-results/.last-run.json` (a Playwright artifact) is
  **tracked in git** (`git ls-files apps/web/test-results` → 1 file) and is also one of the 52
  format failures; `prompts/` remains ignored (may be intentional — owner call); this audit set
  (`docs/engineering/02`–`09`) is currently untracked and should be committed with `00`/`01`/README.

## 7. Reconciling with the Phase-23 "green" record

Phase 24 §1 (entry state, 2026-10-15) records: lint 0 warnings / 647 files; Playwright 45/45;
docs 161 files; tests 494 + 126; typecheck pass. This audit at `c58d026` measures: lint **16
warnings**; E2E **43/45** with 1 skip; docs **162** (our set adds files); tests **496 + 134 + 28**;
typecheck pass. The red gates cluster exactly in files added by `c58d026` (the commit dated the
same day as the claims). The evidence supports **post-verification drift at the closing commit**
(components added after the gates were last run), not a fabricated report — but the current
commit is red on lint, format, and the booking journey, and that is the honest baseline any next
phase must start from.
