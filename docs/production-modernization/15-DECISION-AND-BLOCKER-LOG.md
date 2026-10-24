# OgroniEdu — Decision and Blocker Log

**Status:** LIVE (Phase 13)  
**Purpose:** Track all decisions made and blockers encountered during the modernization program.

---

## 1. Decision Log

| ID | Date | Decision | Context | Owner | Status | Resolution/Notes |
|---|---|---|---|---|---|---|
| D-001 | 2026-10-24 | Adopt Next.js App Router with Server Components for all new pages | Aligns with Vercel best practices; reduces bundle size; improves SEO | Backend Lead | ✅ Completed | All route inventory updated (03-ROUTE-AND-PAGE-INVENTORY.md) |
| D-002 | 2026-10-24 | Use NestJS with `@nestjs/graphql` for future GraphQL API (Phase 5+) | Avoids maintaining separate GraphQL server; unifies data layer | Architecture Team | 📝 Pending | Will defer to Phase 5; not in 7-day sprint |
| D-003 | 2026-10-24 | Fail-fast on missing `JWT_SECRET` in production (RLD-006) | Prevents silent degradation; clearer startup failures | Security Officer | ✅ Completed | Env validation added; see `11-MASTER-TASK-REGISTER.md` T-013 |
| D-004 | 2026-10-24 | Gate `POST /api/v1/notifications/test-dispatch` behind env flag | Balance developer convenience with production safety | Backend Lead | ✅ Completed | `TEST_DISPATCH_ENABLED` defaults to false |
| D-005 | 2026-10-24 | Extract domain packages (`@ogroniedu/auth`, `@ogroniedu/payments`, etc.) | Improves modularity; enables independent testing | Backend Lead | 📝 In Progress | Phase 2–7 in 7-day sprint schedule |
| D-006 | 2026-10-24 | Add FK constraints + indexes to `file_assets` for referential integrity | Enforce data integrity; reduce ad-hoc queries | DB Team | ✅ Completed | Migration `031` created and applied locally |
| D-007 | 2026-10-24 | Migrate DTO validation from `class-validator` to `zod` | Modern schema lib; better DX; smaller bundle | Backend Lead | 📝 Pending | Scheduled Phase 11 (after 7-day sprint) |
| D-008 | 2026-10-24 | Keep local disk file storage for now; plan S3 migration later | Avoid scope creep; storage costs; current scope sufficient | CTO | ✅ Completed | Note: RLD-001 download endpoint implemented first |
| D-009 | 2026-10-24 | Preserve soft-delete pattern across all entities; never hard-delete production data | Data safety compliance | Architecture Team | ✅ Completed | All migrations use `deleted_at` + `is_deleted` |
| D-010 | 2026-10-24 | Adopt Istanbul coverage with 90% threshold for core modules | Quantifiable quality gate; CI integration | QA Lead | ✅ Completed | Coverage targets defined in `10-TESTING-AND-BROWSER-AUTOMATION.md` |

---

## 2. Blocker Log

| ID | Date | Blocker | Impact | Owner | Resolution | Target Resolution |
|---|---|---|---|---|---|---|
| B-001 | 2026-10-24 | Dev-secret fallbacks in notification gateway + files service (RLD-006) | Security risk; must fix before prod | Security/Backend | ✅ Resolved: fail-fast env validation | Day 3 of 7-day sprint |
| B-002 | 2026-10-24 | Missing `GET /api/v1/files/:fileId/download` endpoint (RLD-001) | Tutor evidence unreachable; blocks verification flow | Backend | 📝 In Progress | Day 2 of 7-day sprint |
| B-003 | 2026-10-24 | `POST /api/v1/notifications/test-dispatch` unguarded (RLD-002) | Abuse vector; any authenticated user can dispatch events | Security | ✅ Resolved: env flag gating | Day 3 of 7-day sprint |
| B-004 | 2026-10-24 | Flaky E2E tests in `learning.e2e.spec.ts` and `notifications.e2e.spec.ts` | Reduces CI reliability; blocks confident release | QA | 📝 In Progress | Day 6 of 7-day sprint (quarantine/fixed) |
| B-005 | 2026-10-24 | Migration `031` FK constraints may break existing queries | Risk of data downtime during apply | DB Team | ✅ Mitigated: apply in staging first, have rollback | Day 4 of 7-day sprint |
| B-006 | 2026-10-24 | Package extraction may break existing import paths across monorepo | Developer experience regression | Backend | ✅ Mitigated: run `pnpm turbo run build` after each extraction | Ongoing — verify each extraction |
| B-007 | 2026-10-24 | Coverage gaps identified: notifications at 67% vs 90% target | May fail Phase 9 gate | QA | 📝 In Progress | Day 6 of 7-day sprint (add tests) |
| B-008 | 2026-10-24 | `class-validator` → `zod` migration scope unclear | May overreach into Phase 11 | Backend Lead | ✅ Decision: defer to post-sprint | D-007 documented; schedule accordingly |

---

## 3. Blocked Tasks (Waiting on External Dependencies)

| Task ID | Blocker | Dependent Tasks | mitigation |
|---|---|---|---|
| T-005 | Waiting on `@ogroniedu/auth` package completion (B-006) | T-009, T-011 | Proceed with partial extraction; re-integrate later |
| T-009 | Waiting on T-005 completion | T-010 | Start learning package scaffolding in parallel; wire later |
| T-011 | Waiting on T-005, T-005 completion | — | Can start zod schema definitions without full package |

---

## 4. Decision Status Key

| Symbol | Meaning |
|---|---|
| ✅ | Completed and verified |
| 📝 | Documented; pending implementation |
| 🟡 | In progress |
| ❌ | Cancelled or postponed |

---

## 5. Open Blocks Requiring Resolution (Before Release)

| Block ID | Blocking Item | Affected Phases | Action Required |
|---|---|---|---|
| B-002 | Implement `GET /api/v1/files/:fileId/download` + persist upload bytes | Phase 4, 7, 11 | Complete file download endpoint; integrate with tutor evidence flow |
| B-007 | Increase notification test coverage to ≥90% | Phase 9, 11 | Add unit tests for notification dispatch, preferences, real-time fanout |
| B-004 | Fix flaky E2E tests (learning + notifications) | Phase 10, 11 | Add retry config; isolate state leakage; add deterministic fixtures |

---

*End of `15-DECISION-AND-BLOCKER-LOG.md`.*