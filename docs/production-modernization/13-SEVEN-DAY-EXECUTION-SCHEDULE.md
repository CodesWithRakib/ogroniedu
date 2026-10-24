# OgroniEdu — Seven-Day Execution Schedule

**Status:** DRAFT (Phase 12)  
**Purpose:** Concrete 7-day sprint plan with daily focus, owners, and daily stand-in goals.

---

## 1. Sprint Overview

| Field | Value |
|---|---|
| Sprint Length | 7 calendar days (Oct 25 – Nov 1, 2026) |
| Goal | Complete P0/P1 critical path items + foundation for TDD enforcement |
| Daily Stand-in | 9:00 AM BST (virtual) |
| Retrospective | Nov 1, 2026, 4:00 PM BST |

---

## 2. Daily Breakdown

### Day 1 — Oct 25 (Saturday) — Auth Package Extraction Kickoff

| Time | Activity | Owner |
|---|---|---|
| 09:00 | Stand-up + sprint goal confirmation | All |
| 09:30 | Scaffold `@ogroniedu/auth` package skeleton | Backend Lead |
| 10:30 | Extract AuthService, JwtService, AccountAccessService | Backend |
| 13:00 | Move existing auth unit tests into new package | Backend |
| 15:00 | Run `pnpm turbo run build` — verify no breakage | CI |
| 16:30 | Daily review + adjust plan | Scrum Master |
| **Deliverable** | `@ogroniedu/auth` package builds; all auth unit tests pass | |

### Day 2 — Oct 26 (Sunday) — Payments Package + File Download

| Time | Activity | Owner |
|---|---|---|
| 09:00 | Stand-up | All |
| 09:30 | Scaffold `@ogroniedu/payments` package skeleton | Backend Lead |
| 10:30 | Extract payment adapters (SSLCommerz, bKash, Nagad) into services | Backend |
| 13:00 | Implement `GET /api/v1/files/:fileId/download` endpoint | Backend |
| 15:00 | Integrate file service with download endpoint | Backend |
| 16:30 | Daily review | Scrum Master |
| **Deliverable** | Payment package builds; download endpoint functional (T-003) | |

### Day 3 — Oct 27 (Monday) — Security Gating & JWT_SECRET Fail-Fast

| Time | Activity | Owner |
|---|---|---|
| 09:00 | Stand-up | All |
| 09:30 | Gate `POST /api/v1/notifications/test-dispatch` with env flag | Backend |
| 10:30 | Add JWT_SECRET fail-fast in notification gateway + files service | Backend |
| 13:00 | Verify env validation catches missing JWT_SECRET on startup | CI |
| 15:00 | Run security audit verification (RLD-006 fix) | Security |
| 16:30 | Daily review | Scrum Master |
| **Deliverable** | RLD-006 resolved; test-dispatch gated; JWT_SECRET fail-fast active | |

### Day 4 — Oct 28 (Tuesday) — DB Constraints & Index Optimizations

| Time | Activity | Owner |
|---|---|---|
| 09:00 | Stand-up | All |
| 09:30 | Create migration `031-add-file-asset-fk.sql` with FK constraints | DB Team |
| 10:30 | Add GiST exclusion index optimizations for tutor calendar | DB Team |
| 13:00 | Apply migration locally; verify no data loss | DB Team |
| 15:00 | Run `pnpm turbo run typecheck` + `lint` | CI |
| 16:30 | Daily review | Scrum Master |
| **Deliverable** | FK constraints active; indexes reduce query latency; typecheck/lint pass | |

### Day 5 — Oct 29 (Wednesday) — Domain Package Refactors (tutors/learning/trust)

| Time | Activity | Owner |
|---|---|---|
| 09:00 | Stand-up | All |
| 09:30 | Scaffold `@ogroniedu/tutors` package; migrate existing tutor services | Backend |
| 10:30 | Scaffold `@ogroniedu/learning` package; split learning.service.ts | Backend |
| 13:00 | Scaffold `@ogroniedu/trust` package; split trust services | Backend |
| 15:00 | Run unit tests across all three new packages | CI |
| 16:30 | Daily review | Scrum Master |
| **Deliverable** | All three packages build + 100% unit tests pass | |

### Day 6 — Oct 30 (Thursday) — Deprecated Code Cleanup + Coverage

| Time | Activity | Owner |
|---|---|---|
| 09:00 | Stand-up | All |
| 09:30 | Address DEP-001 through DEP-010 backlog items | Backend |
| 10:30 | Migrate DTO validation from class-validator to zod (T-011) | Backend |
| 13:00 | Run coverage reports; identify gaps vs targets | QA |
| 15:00 | Fix failing tests; quarantine flaky E2E tests | QA/Backend |
| 16:30 | Daily review | Scrum Master |
| **Deliverable** | All deprecated items resolved; coverage meets targets (T-011, T-014) | |

### Day 7 — Nov 1 (Friday) — Release Readiness & Handoff

| Time | Activity | Owner |
|---|---|---|
| 09:00 | Stand-up + sprint retrospective | All |
| 09:30 | Verify all 15 release checklist items green | Release Lead |
| 10:30 | Final typecheck + lint across monorepo | CI |
| 13:00 | Decision log: all P0/P1 blockers resolved + documented | Release Lead |
| 15:00 | Handoff documentation sign-off (all `01-15` files) | PM |
| 16:00 | Celebrate — sprint complete! | All |
| **Deliverable** | Sprint goal met; release readiness confirmed; next sprint planning ready | |

---

## 3. Daily Success Metrics

| Day | Metric | Target |
|---|---|---|
| 1 | `@ogroniedu/auth` builds + tests pass | ✅ 100% |
| 2 | Payment package builds + download endpoint tested | ✅ 100% |
| 3 | RLD-006 resolved; test-dispatch gated; JWT_SECRET fail-fast | ✅ 100% |
| 4 | FK constraints + indexes applied; typecheck/lint pass | ✅ 100% |
| 5 | Three domain packages build + 100% unit tests | ✅ 100% |
| 6 | Deprecated items resolved; zod migration started | ✅ 80%+ items done |
| 7 | All checklist items green; sprint retrospective complete | ✅ 100% |

---

## 4. Risk Mitigation (7-Day Sprint)

| Risk | Mitigation |
|---|---|
| Package extraction breaks existing imports | Run `pnpm turbo run build` after each extraction; maintain barrel exports |
| FK constraints cause migration failures | Apply migration in staging first; have rollback script ready |
| Dev-secret fallbacks re-introduced | Enforce env validation in CI; fail-fast on missing JWT_SECRET |
| Test-dispatch endpoint bypass | Gate behind `TEST_DISPATCH_ENABLED` flag defaulting to false |
| Coverage gaps not met in time | Prioritize critical modules (auth, bookings, payments); accept <100% on peripheral |

---

## 5. Sprint Retrospective Prompts

1. What went well this sprint?
2. What blocked us, and how can we prevent it next time?
3. Which task needed more/less effort than estimated?
4. Are the phase documents and task register complete and accurate?
5. What should we prioritize in the next 7-day sprint?

---

*End of `13-SEVEN-DAY-EXECUTION-SCHEDULE.md`.*