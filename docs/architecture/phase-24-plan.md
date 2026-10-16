# Phase 24 — Production Hardening & Operational Excellence Plan

## 0. Purpose

Phase 23 closed the architecture, type-safety, contract-consistency, and
maintainability backlog and proved it with unit, integration, contract, build,
lint, docs, and live browser-E2E evidence. Phase 24 turns that verified codebase
into a production-operable system: correct under load and failure, observable,
secured beyond feature-complete, and continuously proven in CI.

This document is normative for scope and acceptance. It builds only on verified
Phase 23 facts (cited inline) and deliberately does not relitigate Phase 17
(security), 19 (perf benchmarking), or 20 (CI/CD) — it extends them where Phase
23 exposed new surface.

## 1. Entry state (verified, 2026-10-15)

- API: `tsc` PASS · 52 vitest files / 494 tests PASS · `tsc -p tsconfig.build.json` PASS.
- Web: `tsc` PASS · 25 vitest files / 126 tests PASS · `next build` PASS (27 routes).
- Lint: `pnpm lint` (OxLint `--deny-warnings`, turbo task) → 0 warnings/errors, 647 files.
- Docs: `docs:validate` PASS (161 files, 26 canonical docs).
- Contracts: `@ogroniedu/contracts` covers all DTO shapes; `contracts-parity.spec.ts`
  (55 tests) + `query-builder-relations.spec.ts` guard the two bug classes Phase 24's
  predecessors actually hit (envelope violations, wrong TypeORM join paths — the latter
  a live 500 on `GET /api/v1/admin/bookings`, fixed + probed green).
- Live: API (`:4000`) + web (`:5000`) on seeded Postgres; Playwright **45/45 PASS**
  incl. booking journey, admin verification/suspend, tutor evidence.
- DI rule learned the hard way: tsx/esbuild emits no decorator metadata — every
  cross-module provider injection MUST carry explicit `@Inject(...)`. Unit tests and
  `tsc` pass without it; the running container does not.

## 2. Guiding principles

1. **Prove at the boundary that failed before.** Every workstream must add the test
   that would have caught its bug class (as Phase 23 did with the join-path spec).
2. **No silent degradation.** Pagination, errors, empty states, and fallbacks must be
   explicit and typed — never fabricated numbers or swallowed 400s.
3. **Measure, then cut.** No perf refactor without a before/after query-plan or
   bundle-weight number in the PR.
4. **Blast-radius discipline.** Behavior-preserving slices behind facades; controllers
   and route pages untouched unless the contract demands it.
5. **Close the CI gaps Phase 23 found,** don't just document them:
   - `ci.yml` runs format/typecheck/test/build/docs — but NOT `pnpm lint`.
   - `e2e.yml` provisions the staging stack but sets NO `E2E_*` credentials, so the
     seeded journeys (`journey.booking`, `admin.console`, `tutor.evidence`) SKIP in
     CI — green paint over untested paths.

## 3. Workstreams

### WS1 — List-endpoint pagination parity (correctness)

**Problem (verified).** Canonical offset pagination (`meta.pagination`) exists only
where `paginated()`/`buildOffsetMeta()` is called (admin, support, tutor search,
notifications). These return bare `{success:true,data:[...]}` arrays with no page
contract: `GET /api/v1/sessions`, `GET /api/v1/requests` (bookings), all
`GET /api/v1/learning/*` reads, `GET /api/v1/guardians/*`, trust reads,
`GET payments/receipt|reconciliation|ledger` reads. Frontend cannot page them;
clients must over-fetch, and future growth turns them into full-table scans.

**Tasks.**

1. Inventory every array-returning GET; classify: bounded-by-parent (e.g. messages
   in one booking — keep as-is, document) vs unbounded (needs paging).
2. Adopt `OffsetPaginationQueryDto` (+ `pageSize` alias per Phase 23 P1-1) and
   `paginated()` for each unbounded list. Keep legacy top-level fields during
   migration per `api-contract-standard.md` §2, then cut over.
3. Extend `query-builder-relations.spec.ts`-style coverage: assert every paged
   endpoint returns `meta.pagination.strategy === 'offset'` at the controller
   level (mocked service, shape assertion — no DB needed).
4. Update web consumers to `parseOffsetCollection` + real paging (follow the
   `use-notifications-feed` accumulation pattern; no window-growth hacks).

**Acceptance.** No unbounded list endpoint without `meta.pagination`; controller
shape tests for each; web feeds page with totals intact; E2E tutor-search paging passes.

### WS2 — Query performance & data-access hygiene (performance)

**Problem.** Phase 19 benchmarked; Phase 23 found but did not fix: in-memory
filtering in `TutorSearchService` ("indexed DB-query rewrite is tracked
follow-up"), unbounded `getMany()` reads, raw-SQL analytics without `EXPLAIN`
evidence, ledger hot paths (`verifySystemLedgerIntegrity`), and the public-stats
query the code itself calls "safe to cache aggressively" — but nothing caches it.

**Tasks.**

1. `EXPLAIN (ANALYZE, BUFFERS)` the top-10 heaviest queries (tutor search, session
   lists, booking lists, analytics ×5, ledger verification, admin lists) on
   seed-scale ×10 data; record plans in `docs/database/` before changing anything.
2. Add the missing indexes the plans justify (composite `(status, created_at)`,
   `(tutor_user_id, starts_at)`, `(student_user_id, status)` candidates — verify,
   don't assume).
3. Move tutor-search filtering into indexed DB queries with the same ranking
   contract pinned by `discovery.search.spec.ts` (score parity test on fixtures).
4. Cache `GET /api/v1/public/stats` (short TTL, stale-while-revalidate semantics
   documented; invalidation on the write paths that change counts).
5. Audit N+1: every `getMany` with relations must join in one query (the join-path
   spec now guards renames — extend it to flag `find({relations})` without
   `select` on wide entities).

**Acceptance.** p95 latency deltas recorded per endpoint; no full-table scans on
paged reads; search ranking parity green; cache-hit metric exposed.

### WS3 — Reliability under failure (resilience)

**Problem.** Outbox + idempotency exist for payments/notifications, but coverage is
uneven: which domain writes bypass the outbox (assignment grading? attendance?
reviews? replacement cases?) is undocumented, and webhook replay/duplicate drills
run only as unit tests.

**Tasks.**

1. Outbox audit matrix: every state-changing domain event → outbox row? Close gaps
   or record explicit why-nots (e.g. synchronous-only flows).
2. Failure-injection tests (test doubles, no staging needed): DB save throws
   mid-dispatch (business state must survive — the outbox invariant), gateway down,
   duplicate webhook delivery, clock-skew replay. Promote the existing log-line
   assertions into explicit invariant specs.
3. Backup/restore drill on a scratch database: `pg_dump` → restore → migrate →
   seed-check + smoke E2E. Record RTO/RPO actually achieved vs `docs/` claims.
4. Idempotency-key coverage: assert all POST order/payment mutations require and
   honor keys (one negative test per endpoint: same key twice → one effect).

**Acceptance.** Outbox matrix 100% accounted; failure-injection specs green; drill
report with measured RTO/RPO filed under `docs/`.

### WS4 — Security & privacy, second pass

**Problem.** Phase 17 hardened; Phase 23 changed the auth surface (token utils
extraction, role-helper rollout incl. super_admin in single-`admin` checks) and
added file-upload + impersonation-adjacent flows that deserve re-verification.

**Tasks.**

1. Re-run the threat-model checklist (`docs/17-security-and-threat-model.md`)
   against the Phase 23 diff: token issuance path, role-bypass alignment,
   consent-gate extraction, guardian-access fan-out (notification recipient
   enumeration risk), file magic-byte + signed-URL paths.
2. Dependency + secret audit: `pnpm audit` triage, JWT/DB secret rotation
   procedure dry-run on staging, verify no default secrets reachable in
   production config paths (the `env.validation.ts` production invariants +
   negative tests).
3. Rate-limit tuning with numbers: login/OTP/ticket/contact endpoints under
   synthetic burst; adjust `RateLimiterService` windows from data, not defaults.
4. PII redaction re-verification: audit log `safeMetadata` contents sampled from
   the seeded E2E run (booking journey + admin console) — no emails/phones/tokens
   in `audit_logs`; extend `redact.util` coverage test with the new flows.

**Acceptance.** Threat-model delta signed off; audit clean or triaged with dates;
burst-test numbers recorded; redaction spec covers all Phase 23 flows.

### WS5 — Observability & SLOs

**Problem.** Structured logs, requestIds, and error codes exist but terminate in
stdout. No SLOs, no dashboards, no alerting; `requestId` propagation ends at the
API boundary (web `requestIdOf` parses but nothing correlates).

**Tasks.**

1. Define SLOs: availability (target 99.9%), p95 latency per route class, error
   budget on `5xx` + `UPSTREAM_ERROR`, E2E journey success rate.
2. Log pipeline: ship structured logs (requestId, user/role, route, code,
   latency) to the stack's sink; dashboard per SLO with the canonical error
   codes as dimensions.
3. End-to-end request tracing: `x-request-id` already emitted by web (`base-api.ts`);
   assert API echoes it (`meta.requestId` equality test through a live health +
   authed endpoint) and add it to error toasts' support-copy.
4. Alert rules: 5xx rate, p95 breach, E2E nightly failure, ledger imbalance,
   outbox lag (unpublished events older than N minutes — needs the query first).
5. Runbook updates in `docs/` per alert (triage steps, not just pager text).

**Acceptance.** Dashboards live; alerts fire on synthetic fault injection;
requestId traceable browser→API→logs in a recorded demo.

### WS6 — CI that proves what Phase 23 proved locally

**Problem (verified).** `ci.yml` lacks `pnpm lint`; `e2e.yml` lacks seeded
credentials so 3 journey specs skip silently in CI.

**Tasks.**

1. Add `pnpm lint` to `ci.yml` between typecheck and test (turbo task exists).
2. Seed E2E credentials as CI secrets (`E2E_STUDENT_*`, `E2E_TUTOR_*`,
   `E2E_ADMIN_*`) and assert in `e2e.yml` that zero specs skip
   (`playwright test --reporter=json` + `jq` skip-count gate, or a wrapper
   script that fails on `skipped > 0` for the journey files).
3. Cache Playwright browsers + pnpm store (the install dominates E2E runtime).
4. Nightly scheduled E2E (cron) independent of pushes, reporting to the SLO
   dashboard (WS5).
5. Keep the fast path fast: unit/typecheck/lint stay on every PR; full E2E on
   `main` + nightly + manual dispatch.

**Acceptance.** CI runs lint; E2E skip-count gate green with journeys executing;
nightly scheduled; median PR pipeline time recorded before/after caching.

### WS7 — Frontend performance & delivery

**Problem.** 27 routes, one bundle story unverified: no bundle budget, no
route-level splitting audit, hero images unmeasured, `next dev` compile latency
(55s+ cold E2E starts observed) hints at heavy first-load modules.

**Tasks.**

1. Bundle budget: `next build` analyzer report per route; set budgets
   (first-load JS per route class) and fail CI on regression.
2. Audit `next/dynamic` candidates: modals (booking/score/replacement), charts,
   admin tabs (verification queue is the heaviest), rich editors.
3. Image/media: hero + tutor avatar sizing, `next/image` conversion with remote
   patterns documented, LCP measured on `/bn` + `/en` home.
4. Fonts/i18n payload: subset Bengali font loading, dictionary code-splitting
   per route (messages are eager today — verify before changing).
5. Keep the a11y + responsive matrix green throughout (they run in the E2E set).

**Acceptance.** Budgets set + enforced; LCP deltas recorded; no a11y/responsive
regressions; cold-start E2E time reduced or explained.

### WS8 — Product & UX follow-ups (needs product sign-off)

Explicitly deferred in Phase 23, now scoped for decisions:

1. Marketing fallback numbers on the home stats strip (`10,000+`/`2,500+` when
   the stats API is down) vs the E2E contract "never fabricated numbers" —
   decide: real-only with skeleton, or labeled estimates.
2. Remaining long-JSX pages (home, dashboard pages, GuardianChildrenManager is
   DONE) — split only with visual-review capacity; they are assemblers, not
   logic debt.
3. Shared error factories — standardizing user-facing copy needs content review
   (bn + en) before any message churn.
4. Void-mutation and legacy-field cutover completion (`total/page/limit` removal
   per contract §2 migration note) once web reads `meta.pagination` everywhere.

## 4. Non-goals

- No new product features, no new roles, no pricing/business-rule changes.
- No framework upgrades (Next/Nest/TS major bumps are their own phase).
- No microservice extraction; the modular monolith stands.
- No synthetic rewriting of passing tests to new frameworks.

## 5. Execution plan

Batch order (dependency-aware): WS6 first (gates protect everything after) →
WS1 (contracts for paging) → WS2 (perf, needs WS1 paging in place) → WS3 + WS4
(parallelizable) → WS5 (needs WS3 fault modes + WS4 event taxonomy) → WS7 →
WS8 (product-gated, last).

Per batch: implement → `tsc` (both) → `vitest` (both) → `oxlint --deny-warnings`
→ `prettier` → `next build` + API build → targeted live E2E → record actual
numbers in the phase report. Same evidence bar as Phase 23; no "fixed" claim
without a failing-then-passing test or a before/after measurement.

## 6. Definition of done

- All unbounded lists paged with `meta.pagination`; controller shape tests green.
- Perf: recorded deltas on every touched path; no full-table scans; search parity green.
- Reliability: outbox matrix complete; failure-injection specs green; drill RTO/RPO filed.
- Security: threat-model delta signed; audit triaged; burst numbers recorded; redaction green.
- Observability: SLO dashboards + alerts live; requestId traceable end-to-end (demo recorded).
- CI: lint gated; E2E journeys execute (skip-gate green); nightly scheduled.
- Frontend: budgets enforced; LCP deltas recorded; a11y/responsive green.
- Product follow-ups decided (not deferred silently).
- Phase 24 report with actual measurements, not adjectives.

## 7. Risks & mitigations

| Risk                                                 | Mitigation                                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Perf work changes ranking/pricing behavior           | Fixture parity tests first (as WS2.3 mandates); E2E journey as backstop                         |
| Cache staleness shows wrong counts/fees              | Short TTL + documented invalidation; never cache money paths                                    |
| E2E in CI flakes (dev-compile cold starts seen: 55s) | Build-then-`next start` in CI instead of `next dev`; keep generous timeouts only where measured |
| Alert fatigue                                        | Alerts only on SLO burn + ledger/outbox integrity; everything else dashboards                   |
| Scope creep into features                            | Non-goals enforced at batch planning; product items need sign-off (WS8)                         |

## 8. Traceability

- Continues: `docs/architecture/phase-23-audit-report.md` (§9), `phase-23-remediation-backlog.md`.
- Normative contract: `docs/architecture/api-contract-standard.md` (§7 meta ownership).
- Prior phases: 14 (admin), 15 (analytics), 16 (SEO), 17 (security), 19 (perf), 20 (CI/CD).
- Live evidence baseline: 45/45 Playwright on seeded local stack (2026-10-15).
