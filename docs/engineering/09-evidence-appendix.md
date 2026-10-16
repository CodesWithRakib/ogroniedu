# 09 — Evidence Appendix: Artifacts, Commands, Excerpts

Session-generated evidence is preserved in
`C:\Users\RAKIB\AppData\Local\Temp\opencode\audit-evidence\` (temp storage — copy into the repo
with the docs commit if long-term retention is desired). Each item below states how it was
produced and shows the key content; transcript-only evidence is labeled as such. No artifact in
this appendix was edited after capture.

## 1. API route map (22 controllers / 120 routes)

- **Artifact:** `api-server-log-with-500.txt` (33,916 bytes).
- **How produced:** captured from the API dev server stdout during the audit.
- **Caveat (correcting the filename):** this file is a **boot log** — it contains all 120
  `Mapped {…} route` lines plus an `EADDRINUSE` from a duplicate start attempt. It does **not**
  contain the booking 500 stack; that evidence is in §3.
- **Parse command used:** `Select-String -Path … -Pattern "Mapped \{"` → 120 matches; grouped by
  base path (`03-backend-and-api.md` §2).

## 2. F-3 — dev-validation gap (mechanism + live consequences)

**a) Mechanism probe (tsx vs tsc-built dist)** — artifacts `probe-metadata.ts`,
`probe-metadata-dist.cjs`, output `f3-metadata-probe-output.txt`:

```
== tsx (dev source import) ==
{ "runtime": "tsx (dev source import)",
  "ctorParamtypes": "undefined",
  "loginMethodParamtypes": "undefined" }

== node (tsc-built dist) ==
{ "runtime": "node (tsc-built dist)",
  "ctorParamtypes": ["AuthService"],
  "loginMethodParamtypes": ["LoginDto", "Object", "Object"] }
```

Commands (run from `apps/api`, temp scripts deleted afterwards; copies in the evidence dir):
`pnpm exec tsx tmp-probe-metadata.ts` and `node tmp-probe-dist.cjs`.
Supporting: `apps/api/dist/modules/auth/auth.controller.js` contains 11
`__metadata("design:paramtypes"` occurrences (grep on the earlier `pnpm build` output).

**b) Live HTTP probe matrix** — artifacts `repro-f3-f4.mjs`, `f3-f4-repro-output.json`
(2026-10-16 10:03–10:04 local, API on `:4000`):

| Probe                                                 | Expected (validation on)     | Observed                                                    | Verdict                                    |
| ----------------------------------------------------- | ---------------------------- | ----------------------------------------------------------- | ------------------------------------------ |
| `POST /auth/login` `{}`                               | 400 (required field)         | **500** `INTERNAL_ERROR`                                    | F-3                                        |
| `POST /auth/login` `identifier:"a"` (`@MinLength(3)`) | 400                          | **401** (service reached)                                   | F-3                                        |
| `POST /auth/login` unknown property                   | 400 (`forbidNonWhitelisted`) | **401** (ignored)                                           | F-3                                        |
| valid demo login                                      | 200 + raw payload            | 200, body keys `user, accessToken, refreshToken, expiresIn` | contract note (`03-backend-and-api.md` §4) |
| `POST /requests` fake tutor id                        | 400 (`@IsUUID`)              | **500** uuid cast                                           | F-4/§3                                     |
| malformed JSON                                        | 400                          | **500** with `meta: {}` (no requestId)                      | F-3                                        |

**c) Server-side stack excerpt** — `f3-f4-server-log-excerpt.txt`:

```
[cd277a51-…] POST /api/v1/auth/login - 500 INTERNAL_ERROR: Cannot read properties of undefined (reading 'toLowerCase')
TypeError: Cannot read properties of undefined (reading 'toLowerCase')
    at AuthService.login (apps\api\src\modules\auth\auth.service.ts:168:74)
[ac67d2a8-…] POST /api/v1/requests - 500 INTERNAL_ERROR: Undefined value encountered in property
'GuardianStudentLinkEntity.studentUserId' of a where condition …
[no-id] POST /api/v1/auth/login - 500 INTERNAL_ERROR: Expected double-quoted property name in JSON at position 20
```

(The middle line is a bonus datum: a request missing `studentId` reaches TypeORM's undefined-where
guard — a 500 that validation would have made a 400.)

## 3. F-4 — curated-tutor incident (two runs, two symptoms, one defect)

**Run 1 (full baseline suite, earlier in the session — transcript record).**
Overall: 45 tests → 43 passed / 1 failed / 1 did not run. Preserved artifacts for the failure:

- `journey-booking-error-context.md` — Playwright error context. Key lines: modal stayed visible
  after submit; the modal held **"তানভীর হাসান (Tanvir Hasan)"** (the curated fake tutor); alert
  text `Internal server error. Please contact support with request ID.`
- `journey-booking-failure.png` — failure screenshot.
- Server-side stack (captured in transcript during run 1; independently re-derived in the exact
  repro below).

**Exact reproduction (this session, fresh API)** — `repro-f4-exact.mjs` →
`f4-exact-repro-output.json`:

```
{ "loginStatus": 200,
  "requesterId": "33333333-3333-4333-c333-333333333333",
  "status": 500,
  "body": { "success": false,
            "error": { "code": "INTERNAL_ERROR", "message": "Internal server error. …" },
            "meta": { "requestId": "e693f810-5830-48a8-85ca-63629e5f2a5a" } } }
```

Server log (`f3-f4-server-log-excerpt.txt`):

```
[e693f810-…] POST /api/v1/requests - 500 INTERNAL_ERROR: invalid input syntax for type uuid: "tutor-buet-1"
QueryFailedError: invalid input syntax for type uuid: "tutor-buet-1"
    at async BookingsService.createRequest (apps\api\src\modules\bookings\bookings.service.ts:97:26)
    at async BookingsController.createRequest (apps\api\src\modules\bookings\bookings.controller.ts:36:21)
```

**Run 2 (re-verification of the failing spec, same day, fresh servers)** — artifacts
`e2e-journey-booking-rerun.txt` (console output), `e2e-rerun2-error-context.md`,
`e2e-rerun2-failure.png`:

```
Running 2 tests using 1 worker
  x  1 … student discovers a tutor and files a booking request (26.5s)
  -  2 … tutor sees the incoming request in the inbox
1 failed / 1 did not run
Error: expect(locator).toBeVisible() failed — Locator: booking-request-modal — element(s) not found
      at journey.booking.spec.ts:49:25
```

The failure snapshot (in `e2e-rerun2-error-context.md`) shows the settled page with the **real**
tutor only ("মোট ১ জন শিক্ষক পাওয়া গেছে"; card `রক রাশেদ করিম`), i.e. run 2's click landed during
the curated→real swap and no modal remained. Reproduce with:

```powershell
# servers: pnpm --filter @ogroniedu/api dev  (temporary, killed after use in this session)
#          pnpm --filter @ogroniedu/web dev
$env:E2E_BASE_URL="http://localhost:5000"
$env:E2E_STUDENT_EMAIL="student.demo@ogroniedu.com"; $env:E2E_STUDENT_PASSWORD="OgroniDev#2026"
$env:E2E_TUTOR_EMAIL="tutor.demo@ogroniedu.com";     $env:E2E_TUTOR_PASSWORD="OgroniDev#2026"
pnpm --filter @ogroniedu/web e2e -- journey.booking.spec.ts
```

After the run, the tracked `apps/web/test-results/.last-run.json` was restored from git and
untracked Playwright artifacts were removed (repo left clean except `docs/engineering/`).

## 4. F-6 — hydration mismatch (fresh reproduction, run 2)

- **Artifact:** `f6-hydration-log-excerpt.txt` (from the web dev server log during run 2).
- Key lines: `Uncaught Error: Hydration failed because the server rendered HTML didn't match the
client … at BottomNavbar (src/components/shell/BottomNavbar.tsx:139:15)` within
  `LocaleLayout (src\app\[locale]\layout.tsx:95:17)`; diff shows server `href="/bn/login"` +
  `User` icon vs client `href="/bn/dashboard/student"` + `LayoutDashboard`; repeated
  "Encountered a script tag while rendering React component" warnings. Observed on
  `/bn/dashboard/student` and `/bn/tutors` while authenticated.

## 5. Database evidence

- **Artifact:** `db-constraint-breakdown.mjs` (+ first-pass `db-stats.mjs`, `db-seed-check.mjs`).
- Measured output (2026-10-16): tables **45**, views **1**, indexes **122**; `pg_constraint`
  rows **515** = primary key 45 · foreign key 78 · unique 21 · check 69 · not-null 301 ·
  exclusion 1.
- `schema_migrations`: 12 rows, `001_initial_schema.sql` (2026-10-10) → `012_support_tickets.sql`
  (2026-10-12).
- Row counts: users 24 · tutor_profiles 9 (published 2) · bookings 14 · subjects 8 ·
  education_levels 5 · curricula 4 · user_roles 25 · auth_sessions 162 · support_tickets 10 ·
  audit_logs 35.
- Exclusion constraint SQL: `packages/database/src/migrations/001_initial_schema.sql:289-301`
  (`ex_tutor_session_overlap`, GiST on `booking_sessions`).
- How produced: `node tmp-audit-constraints.mjs` from `packages/database` (temp file, deleted;
  script preserved in the evidence dir). Connection config read from repo-root `.env`; **no
  credentials printed** at any point.

## 6. Baseline gate outputs

- `baseline-lint.txt` — `pnpm lint` (exit 1): verbatim 16 warnings (4 API `phone.utils.ts`
  lines 11/38; 12 web across `dashboard-layout.spec.ts`, `UserNavDropdown.tsx`,
  `DashboardSidebar.tsx`, `DashboardShell.tsx`). Re-run command: `pnpm lint`.
- `baseline-format.txt` — `pnpm format:check` (exit 1): 52 files listed with the summary line
  `Code style issues found in 52 files.`; the `docs/engineering/` set is not among them.
  Re-run command: `pnpm format:check`.
- Suite passes (typecheck/build/tests/docs:validate) are recorded in `06-quality-baseline.md` §1
  (transcript-recorded; commands are one-line re-runs: `pnpm typecheck`, `pnpm test`, `pnpm build`,
  `pnpm docs:validate`).

## 7. Git evidence

| Command                                               | Result                                                                                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `git log --oneline -3`                                | `a90fd06 docs: initialize comprehensive project documentation…` ← `c58d026 feat: add role-based dashboard layouts…` ← `6e114b5 …` |
| `git show --stat a90fd06`                             | docs set + `.gitignore` (removed the `docs` ignore line); **no code files**                                                       |
| `git diff --stat c58d026 a90fd06 -- "*.ts" "*.tsx"`   | empty (zero code diff)                                                                                                            |
| `git ls-tree -r --name-only c58d026 -- docs` \| count | 14 (at audit start)                                                                                                               |
| `git ls-files docs` \| count                          | 121 (after `a90fd06`)                                                                                                             |
| `git ls-files apps/web/test-results`                  | `apps/web/test-results/.last-run.json` (tracked artifact)                                                                         |
| `git status --porcelain` (end of session)             | only `docs/engineering/` files (M ×3, ?? ×7)                                                                                      |

## 8. Environment facts

Node v26.8.1 · pnpm 12.10.1 · Turbo 2.11.7 · NestJS 12.1.2 · TypeORM 1.1.2 · Next.js 16.4.0
(Turbopack) · React 19.3.0 · PostgreSQL 18 (local service) · TypeScript 7.0.2 (root dev tooling).
Both dev servers used in this session (API `:4000`, web `:5000`) were stopped and the ports
verified closed before the session concluded.

## 9. Evidence rules & known gaps

1. Prefer primary artifacts (logs, JSON, screenshots) over narrative. Where only a transcript
   record exists (suite pass summaries, run-1 E2E output), it is labeled as such above.
2. "Skipped" and "did not run" are never counted as passed (`06-quality-baseline.md` §2).
3. The `api-server-log-with-500.txt` filename is historical; its actual content is the boot route
   map (§1 caveat).
4. All reproduction scripts are read-only with respect to the repository; the only repo writes in
   this session were the `docs/engineering/` files themselves and transient test artifacts that
   were restored/removed afterwards.
