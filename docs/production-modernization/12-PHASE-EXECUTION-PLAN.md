# OgroniEdu — Phase Execution Plan

**Status:** DRAFT (Phase 0)  
**Purpose:** Map all 15 phases with deliverables, owners, and gate criteria.

---

## 1. Phase Overview

| Phase | Title | Primary Owner | Duration | Deliverable | Gate Criteria |
|---|---|---|---|---|---|
| 0 | Audit & Inventory | — | Complete | Documentation set (00–10) | All 11 inventory files created and verified |
| 1 | Architecture TDD Foundation | Backend Lead | 1w | TDD test scaffolding | `pnpm turbo run test:unit` 100% pass on new scaffolds |
| 2 | Auth Package Extraction | Backend | 1w | `@ogroniedu/auth` package | T-001 complete; all auth unit tests pass |
| 3 | Payments Package Extraction | Backend | 1w | `@ogroniedu/payments` package | T-002 complete; provider adapters functional |
| 4 | File Download & Storage | Backend | 1w | `GET /api/v1/files/:fileId/download` | T-003 complete; integration test passes |
| 5 | Guardrails & Security Gating | Backend/Security | 1w | Test-dispatch gating + JWT_SECRET fail-fast | SEC-002, T-004, T-007, T-013 complete |
| 6 | DB Constraints & Indexes | DB Team | 1w | FK constraints + optimized indexes | T-006, T-012 migration passes |
| 7 | Domain Package Refactors (tutors/learning/trust/admin) | Backend | 2w | Packages extracted | T-005, T-009, T-010 complete; all tests pass |
| 8 | Deprecated Code & Dependency Cleanup | Backend | 1w | DEP- prefixed items addressed | All DEP items resolved or documented |
| 9 | TDD Enforcement & Coverage | QA/Backend | 1w | ≥90% coverage on core modules | Coverage report meets targets |
| 10 | E2E & Browser Automation | QA | 1w | Playwright suite stable | All E2E passing; flaky tests quarantined |
| 11 | Release Readiness & checklist | Release Lead | 3d | 15-RELEASE checklist | All checklist items green |
| 12 | Seven-Day Execution Schedule | PM | 2d | 7-day sprint plan | Schedule approved; resource conflicts resolved |
| 13 | Release Decision & Blocker Log | Release Lead | Ongoing | Decision log maintained | No P0/P1 blockers unresolved |
| 14 | Post-Launch Monitoring | Ops | 2w | Monitoring dashboards | Alerts configured; runbooks documented |

---

## 2. Phase Dependencies

```
Phase 0 ──> Phase 1 ──> Phase 2 ──> Phase 3 ──> Phase 4
     │              │              │              │
     └──> Phase 5 ──> Phase 6 ──> Phase 7 ──> Phase 8
                │              │              │
                └──> Phase 9 ──> Phase 10
                                   │
                                   └──> Phase 11
                                      │
                                      └──> Phase 12
                                         │
                                         └──> Phase 13
                                            │
                                            └──> Phase 14
```

---

## 3. Phase Gate Criteria (Detailed)

Each phase has concrete gate criteria:

| Phase | Gate Must Pass |
|---|---|
| 1 | Unit test scaffolding runs; no regressions in existing tests |
| 2 | `@ogroniedu/auth` exports AuthService, JwtService, AccountAccessService; `pnpm turbo run build` succeeds |
| 3 | All payment provider adapters (SSLCommerz, bKash, Nagad) functional in isolation |
| 4 | `GET /api/v1/files/:fileId/download` returns tutor evidence file or 404 with proper error envelope |
| 5 | `TEST_DISPATCH_ENABLED` env flag defaults to false; test-dispatch returns 403 when flag false |
| 6 | New FK constraints on `file_assets` do not break existing queries; indexes reduce query latency ≥10% |
| 7 | All three domain packages (`@ogroniedu/tutors`, `@ogroniedu/learning`, `@ogroniedu/trust`) build and pass 100% unit tests |
| 8 | All DEP-xxx items resolved; no deprecated patterns remaining in app code |
| 9 | Coverage report: auth ≥95%, bookings ≥95%, payments ≥95%, learning ≥90%, trust ≥90% |
| 10 | All E2E tests passing; flaky tests quarantined or fixed; Playwright config stable |
| 11 | Release checklist 15 items all green; security audit P0/P1 items resolved |
| 12 | 7-day sprint plan approved; no overallocation > 80% capacity |
| 13 | Decision log: all P0/P1 blockers resolved OR documented with mitigation + ETA |
| 14 | Monitoring dashboards live; on-call runbooks documented |

---

## 4. Phase Deliverable Checklist (Per Phase)

| Phase | Checklist Item |
|---|---|
| 1 | ✅ `test/` scaffolding created per domain |
| 2 | ✅ New package structure: `packages/auth/` with `src/`, `__tests__/`, `index.ts` |
| 3 | ✅ Payment adapters unit tested in sandbox mode |
| 4 | ✅ Download endpoint returns `Content-Disposition` + signed URL |
| 5 | ✅ Env validation: `JWT_SECRET` required in production |
| 6 | ✅ Migration `031-add-file-asset-fk.sql` created and applied locally |
| 7 | ✅ Package exports documented in `packages/*/README.md` |
| 8 | ✅ `DEP-001` through `DEP-010` all addressed or migrated |
| 9 | ✅ Istanbul/coverage report generated; thresholds in `jest.config.ts` |
| 10 | ✅ Playwright test retry config applied; no flaky tests in CI |
| 11 | ✅ All 15 checklist items verified; sign-off obtained |
| 12 | ✅ Sprint board reflects 7-day plan; capacity chart shows <80% overallocation |
| 13 | ✅ Decision log entry for each P0/P1 item with resolution status |
| 14 | ✅ Grafana/Prometheus dashboards provisioned; runbooks in `ops/` |

---

## 5. Owner RACI Matrix

| Role | R | A | C | I |
|---|---|---|---|---|
| Backend Lead | ✅ | ✅ | ✅ | ✅ |
| Frontend Lead | ✅ | ❌ | ✅ | ✅ |
| DB Team | ✅ | ✅ | ✅ | ✅ |
| Security Officer | ✅ | ✅ | ✅ | ✅ |
| QA Lead | ✅ | ✅ | ✅ | ✅ |
| Release Lead | ✅ | ✅ | ✅ | ✅ |
| PM / Product | ✅ | ✅ | ✅ | ✅ |

---

*End of `12-PHASE-EXECUTION-PLAN.md`.*