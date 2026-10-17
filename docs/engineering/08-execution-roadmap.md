# 08 — Execution Roadmap: Phase Status, Pre-Gate, Phase 24 Mapping

This document reconciles the historical phase records with what this audit measured, defines a
small **Phase 24 Pre-Gate** (P0/P1), and maps all findings onto the already-normative
`docs/architecture/phase-24-plan.md` (WS1–WS8). **No item below was implemented in this session.**

## 1. Phase status reconciliation (as of `c58d026` code, 2026-10-16)

| Record says (Phase 24 §1 entry state, 2026-10-15) | This audit measured                                                     | Delta class                |
| ------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------- |
| `pnpm lint` → 0 warnings / 647 files              | **16 warnings** (F-1) in files added by the closing commit `c58d026`    | Post-verification drift    |
| Playwright **45/45 PASS**                         | **43 passed / 1 failed / 1 skipped** — failure root-caused to F-3 + F-4 | Drift (curated-tutor race) |
| `docs:validate` 161 files                         | **162** — current tree validates (our set included)                     | Growth                     |
| Tests 494 + 126                                   | **496 + 134 + 28 = 658**                                                | Growth                     |
| `tsc` both PASS; build PASS                       | Confirmed PASS                                                          | No change                  |

Honest statement for the record: the departures cluster exactly in the files `c58d026` added —
the same commit dated with the closing claims. This is consistent with gates last run _before_
that commit, not with fabricated results. Regardless of cause, **the current commit is red on
lint, format, and one product journey**, and Phase 24's "entry state" should be restated with
these numbers in its report when the owner next updates phase docs (errata, not rework).

## 2. Phase 24 Pre-Gate (recommended: Phase 24 "batch 0", before WS6 begins)

Rationale: Phase 24's own principles demand "prove at the boundary that failed before" and "no
silent degradation." Starting WS1–WS8 on a tree where dev validation is inert (F-3), the flagship
journey flakes (F-4), and both style gates are red (F-1/F-2) would carry that debt into every
subsequent measurement. These items are small, test-backed, and unblock the rest.

| ID       | Item                                                                                                                                                                                | Findings  | Size | Acceptance (evidence bar)                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| **PG-1** | Restore DTO validation in the dev runtime (or run dev against built output) **and** add a live boundary smoke test: malformed/extra-field DTO → 400                                 | F-3       | S–M  | Probe matrix from `03-backend-and-api.md` §5 returns 400s; new test fails on the old runtime and passes on the new one    |
| **PG-2** | Remove the clickable curated-tutor path on `/tutors`; render skeleton/empty until search resolves; never submit non-real ids                                                        | F-4, S-1  | S    | Browser probe: no `tutor-buet-*` card clickable at any moment; E2E booking journey green (45/45)                          |
| **PG-3** | Restore green gates: fix F-1 (16 warnings) and F-2 (52 files, `prettier --write` scope as decided)                                                                                  | F-1, F-2  | S    | `pnpm lint` exit 0; `pnpm format:check` exit 0; CI format gate green again                                                |
| **PG-4** | Fix `BottomNavbar` hydration mismatch (render auth-dependent links only after store hydration)                                                                                      | F-6       | S    | No hydration error in dev console across bn/en pages; a11y suite stays green                                              |
| **PG-5** | Align admin-family navigation with route gates (either widen `allow` for `/dashboard/admin/*` or filter nav per role)                                                               | F-7, R-1  | S–M  | Each of the 4 admin-family roles sees only routes it can open; redirect loop gone                                         |
| **PG-6** | Security quick wins: gate demo quick-fill strip + delete fake "Google" button (SEC-4); gate Swagger by env (SEC-6); hard-refuse test-auth bypass when `NODE_ENV=production` (SEC-1) | SEC-1/4/6 | S    | Login page in a prod-mode build shows neither; `/api/docs` 404s (or admin-only) in prod config; unit test for bypass gate |

Recommendation: PG-1 and PG-2 first (they are also the two root causes of the E2E red), then PG-3,
then PG-4/PG-5/PG-6. Nothing in this list overlaps WS1–WS5 scope; PG-3/PG-6 partially pre-deliver
WS6/WS4 items, which is fine.

### 2.1 As-built status (2026-10-16 → 2026-10-17) — all six steps delivered

| Step | Commit(s)                     | As-built outcome (evidence kept with the session's per-step summaries)                                                                                                                                                                                                                                                                             |
| ---- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-1 | `6e87fc5`, `83cf532`          | Dev runtime runs the tsc-built output (`scripts/dev.mjs` = `tsc -w` + `node --watch dist/main.js`; `tsx` removed). Live probe matrix 6/6 → 400s with field details; new `test/validation-boundary.spec.ts` (4 tests); 5xx sanitizer hardened. Watcher later scoped to `dist` after E2E showed `node_modules` churn restarting the API mid-request. |
| PG-2 | `454ac2d`                     | `CURATED_SAMPLE_TUTORS` deleted; skeleton grid while the first search resolves; submit refuses tutor ids the search never returned. Seed student id corrected to an RFC-4122-valid variant (`…-b333-…`) — the invalid id had been masked by the dead validation (F-3). `journey.booking` green.                                                    |
| PG-3 | `72ccdb0`                     | Lint **16 → 0** warnings; 52 files formatted (matches the audit count 1:1) + docs-validator angle-bracket link fix; `pnpm lint` / `format:check` exit 0.                                                                                                                                                                                           |
| PG-4 | `6a41dbe`                     | `BottomNavbar` hydration mismatch fixed with the mounted-gate pattern; 11-page browser probe → **0 hydration errors**; `next-env.d.ts` prettier-ignored.                                                                                                                                                                                           |
| PG-5 | `65b14df`                     | Admin-family nav aligned with route gates (least privilege): pure `super_admin` no longer bounced from `/dashboard/admin/*`; `support_agent`/`compliance_reviewer` get exactly the single console entry they can open; role probe matrix all-stable.                                                                                               |
| PG-6 | `a4b1471` (+ owner `b3b29e3`) | Swagger env-gated (prod 404 + no log line; dev 200; unit test). SEC-1 (prod hard-refuse) and SEC-4 (demo strip gated, fake Google removed) were delivered upstream in `b3b29e3` and verified in a prod-mode `next build` + `next start` probe.                                                                                                     |

The §2 acceptance rows were met with live-probe evidence. E2E grew **45 → 47** with the owner's
post-Pre-Gate specs; the final full run is **47/47** (`06` §0). Two suite follow-ups after those
specs landed: `0a6d076` (admin console journey aligned with the modular admin pages — the spec
still waited on the pre-refactor `admin-dashboard-view` testid and clicked removed tabs) and
`fb3fc77` (shared login helpers wait out the API's 5-attempts/min login rate limit for the
seeded accounts); `59477d6` restored the lint/format gates after the same feature work.

## 3. Findings → Phase 24 WS mapping

| Audit finding                                | Phase 24 workstream impact                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| F-3 dev validation gap                       | Pre-Gate PG-1; also protects WS1 (paging DTOs) and WS4 (rate-limit bursts) from false signals                 |
| F-4 curated tutors                           | Pre-Gate PG-2; WS8 rows 1–2 (stats fallbacks) share the same "no fabricated data" principle                   |
| F-1/F-2                                      | Pre-Gate PG-3; WS6.1 adds `pnpm lint` to CI permanently                                                       |
| F-5 static/demo register                     | WS8 (product sign-off); SEC-4 subset pulled into PG-6                                                         |
| F-6 hydration                                | PG-4; also improves WS7's first-load/CLS measurements                                                         |
| F-7 admin-family nav                         | PG-5; admin-surface sanity for WS1/WS4 audits                                                                 |
| F-8 repo hygiene                             | Owner action (commit this set; decide `prompts/`; ignore the tracked `.last-run.json`); not a code workstream |
| CI gaps (§06)                                | WS6.1/6.2/6.4 — unchanged, now with line-level evidence                                                       |
| Pagination debt, perf, outbox, observability | Unchanged — `phase-24-plan.md` WS1–WS5, WS7 remain normative as written                                       |

## 4. Risk register (if Pre-Gate is skipped)

| Risk                                                      | Likelihood | Impact                        | Mitigation                                           |
| --------------------------------------------------------- | ---------- | ----------------------------- | ---------------------------------------------------- |
| Dev/E2E keep testing a runtime prod never runs (F-3)      | high       | medium                        | PG-1; add the boundary smoke test to CI              |
| Booking journey regression becomes "known flake"          | high       | high (flagship journey trust) | PG-2; keep 45/45 as an exit gate                     |
| WS2 perf numbers measured on a red/green-mismatched tree  | medium     | medium                        | PG-3 first                                           |
| Product demos show fake tutors/reviews/testimonials (F-5) | certain    | medium–high                   | PG-6 subset + WS8 decisions before any external demo |
| CI format gate red blocks deploy from this tree           | certain    | medium                        | PG-3                                                 |

## 5. Decision log (this session)

1. **D-1** — This audit is re-verification + planning only; no source edits, no commits, no fixes.
   All findings are documented with reproduction paths for the implementing phase.
2. **D-2** — E2E booking failure treated as **defect**, not flake: PC-1 root cause (F-3 mechanism)
   and PC-2 (F-4 trigger) are both reproduced deterministically.
3. **D-3** — Phase 24 plan remains the next phase **after** the Pre-Gate; its exit criteria stand,
   with the Pre-Gate's acceptance tests added to its first batch.
4. **D-4** — F-5 items requiring copy/UX decisions are routed to WS8 rather than unilaterally
   removed; only the security-adjacent subset (demo credentials, fake OAuth) is escalated to P0/P1.

## 6. Open questions for the owner (needed before implementation)

1. ~~Commit plan for this audit set (`docs/engineering/02`–`09` untracked; `00/01/README` modified)
   — commit as one docs commit after review?~~ **Resolved:** the set is committed (`4b027a0`);
   the Pre-Gate as-built updates live with it.
2. `prompts/` gitignore — intended to stay untracked?
3. Remove `apps/web/test-results/.last-run.json` from git tracking (and ignore `test-results/`)?
   — **partially addressed in the working tree** (2026-10-17: `.gitignore` lists
   `apps/web/test-results/` + `apps/web/playwright-report/`); untracking the already-tracked
   artifact still needs `git rm --cached` — owner decision.
4. Confirm phase-24 errata: restate entry-state numbers (lint 16 → fixed by PG-3; E2E 43/45) in
   the phase record, or annotate Phase 23 retroactively?
5. WS8 product decisions for the home-stats fallbacks (real-only vs labeled estimates) — owner +
   marketing/bn-copy input.
