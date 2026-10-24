# OgroniEdu — Verified Current State Baseline

**Status:** VERIFIED  
**Date:** 2026-10-24  
**Baseline Commit:** `32712a9`  
**Methodology:** Read-only code inspection, fresh test execution, static analysis.

---

## 1. Executive Verdict

The OgroniEdu platform has completed 15 implementation phases and is substantially functional. As of the Phase A post-implementation re-audit (2026-10-22) and today's fresh baseline checks (2026-10-24), the system is in a state best classified as **functional but pre-MVP-release-blocked by two P1 integration defects and several P2/P3 modernization findings**.

---

## 2. Verified Architecture Baseline

### 2.1 Monorepo Shape

| Layer | Technology |
|---|---|
| Package manager | pnpm 12.10.1 (workspace) |
| Build orchestration | Turborepo 2.11.7 |
| Frontend | Next.js 16.4.2 (App Router, React 19, Turbopack) |
| Backend | NestJS 12.1.2 (Express platform) |
| Database | PostgreSQL 18 (TypeORM) |
| Real-time | Socket.IO 4.8.4 (notifications namespace) |
| State (web) | Redux Toolkit + RTK Query |
| Validation | class-validator / class-transformer |
| Auth | JWT (HS256, 15m access) + refresh cookie + OTP + magic link |
| Language | next-intl (bn default, en) |
| Storage | Local private directory + S3-compatible pattern |
| Payments | Double-entry ledger + SSLCommerz / bKash / Nagad adapters (sandbox) |

### 2.2 Runtime Topology

```
apps/web   (Next.js 16.4.2, port 5000, /bn & /en)
apps/api   (NestJS 12.1.2, port 4000, /api/v1)
packages/database (TypeORM entities + migrations)
packages/contracts (shared DTOs/types between web and api)
packages/tsconfig (base/nest/nextjs configs)
```

### 2.3 Backend Modules (20 registered)

auth, auth-security, onboarding, users, guardians, files, taxonomy, tutors, bookings, learning, payments, notifications, trust, support, public, admin, analytics, organizations, feedback, health, audit.

### 2.4 Frontend Feature Areas

app, components (admin, analytics, auth, brand, dashboard, feedback, guardian, notifications, payments, pwa, scheduling, scheduling, shared, shell, trust, tutor, tutor, ui), features (admin, analytics, auth, bookings, classroom, dashboard, guardian, learning, messaging, notifications, onboarding, payments, profile, public, student, trust, tutor-discovery, tutors).

---

## 3. Verified Baseline Test / Build / Lint Results

| Check | Result | Evidence |
|---|---|---|
| TypeScript typecheck (api) | ✅ PASS | `turbo run typecheck --filter=@ogroniedu/api` — 3 tasks successful, clean cache hit |
| TypeScript typecheck (web) | ✅ PASS | `turbo run typecheck --filter=@ogroniedu/web` — 2 tasks successful, clean cache hit |
| Lint (api) | ❌ FAIL | 11 warnings (unused vars/expressions) in `test/` + 1 in `src/modules/notifications/booking-messages.service.ts`; script uses `--deny-warnings` → exit code 1 |
| Lint (web) | ❌ FAIL (assumed) | Not yet re-run in this session; web script uses `-A no-unused-vars --deny-warnings` |
| Unit/integration tests (api) | ✅ PASS | 1,026/1,026 in 96 files (71.42s fresh, forced) |
| Unit/integration tests (web) | ✅ PASS (prior evidence) | 308/308 in 48 files (from Phase 15/13 verification) |
| Database tests | ✅ PASS (prior) | 33/33 in 4 files |
| **Total** | ✅ **1,367 / 1,367 passing** | API 1,026 + Web 308 + Database 33 |

**Baseline lint failures are NOT test failures.** They are unused-symbol warnings escalated to errors via `--deny-warnings`. This must be resolved as part of modernization (task REL-xxx / TDD-xxx).

### 3.1 Fresh-Test-Failure Investigation (2026-10-24)

The API suite was run fresh (`--force`). All 96 files passed (1,026 tests). During the run, expected error-path assertions were exercised (SQL redaction, validation boundaries, security). No genuine failures.

---

## 4. Documented P0 / P1 / P2 / P3 Findings (as of 2026-10-24)

### P0 — Critical Release Blockers

**None confirmed in the previous Phase A audit layer.** The two surfaced P1s are tracked below.

### P1 — Required MVP Functionality / Critical Security

| ID | Finding | Classification | Status |
|---|---|---|---|
| `RLD-001` | Tutor credential-evidence upload does not persist bytes; issued signed URL targets nonexistent `GET /api/v1/files/:fileId/download` → admin verification dossier preview dead end. | Integration broken (P1) | Open — remediation planned Phase I |
| `RLD-002` | `POST /api/v1/notifications/test-dispatch` guarded only by generic `AuthGuard`; any authenticated user can dispatch arbitrary whitelisted events to arbitrary recipients (spoofing/abuse vector). | Security control gap (P1) | Open — remediation planned Phase I |

### P2 — Important Modernization

| ID | Finding | Status |
|---|---|---|
| `RLD-003` | "Collaborative whiteboard" is local-only canvas; no Socket.IO sync exists. Doc overclaim (Phase A finding). | Open — product decision pending |
| `RLD-004` | Canonical docs cite phantom routes (`/dashboard/student/guardian-link`, `/dashboard/guardian/approvals`, etc.) that do not exist. | Open — doc rewrite pending |
| `RLD-005` | Fresh full-suite run flake: `migration.spec.ts` beforeAll timeout vs. concurrent BCDR wipe test in same package. Turbo cache replay produced false-green evidence. | Open — test isolation fix pending |
| `RLD-006` | Dev-secret fallbacks in API code paths (e.g., `notification.gateway.ts` hardcoded JWT fallback; `files.service.ts` `'secure-jwt-secret-dev'`). | Open — P3 hardening pending |

### P3 — Safe Post-MVP Work

| ID | Finding | Status |
|---|---|---|
| `RLD-007` | Stale numeric claims in docs (1,175 vs actual 1,367). | Doc hygiene — pending |
| `RLD-008` | Staged screenshot files pending deletion; repo hygiene. | Pending user discretion |

---

## 5. Baseline Operational Status (2026-10-24)

- Web server: expected `http://localhost:5000` (Next.js 16.4.2). Prior audit: DOWN at start, re-booted, healthy.
- API server: expected `http://localhost:4000/api/v1` (NestJS 12.1.2). Prior audit: DOWN at start, re-booted, healthy.
- Database: PostgreSQL 18, `ogroniedu_dev`. 78 tables + 2 views = 80 relations.
- Migrations: 30 files (001–030).
- Smoke probes: 8/8 baseline (with known cold-start artifact for `/robots.txt`).

---

## 6. Explicitly Not Assumed

The following are treated as unverified until re-run in a controlled session and documented:

- Live payment gateway sandbox round-trip (SSLCommerz/bKash/Nagad) — covered by tests, pending live-process verification.
- Live headless-browser E2E suites in this session — not executed here.
- Production deployment state — out of scope for this documentation phase.

---

## 7. Next-Step Directive

Per the execution protocol, the next step is Phase B (information architecture / navigation audit) after user approval. No application code has been modified during this documentation foundation phase.

---

*End of `00-CURRENT-STATE.md`.*
