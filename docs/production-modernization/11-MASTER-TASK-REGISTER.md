# OgroniEdu — Master Task Register

**Status:** DRAFT (Phase 0)  
**Purpose:** Centralized task tracker with IDs, priorities, dependencies, and acceptance criteria.

---

## 1. Task ID Structure

| Format | Example | Description |
|---|---|---|
| `T-###` | `T-001` | Top-level task |
| `T-###-S##` | `T-001-S01` | Sub-task (2-digit suffix) |
| `SEC-###` | `SEC-001` | Security-specific task |

All tasks referenced in this register use the `T-###` format unless security-specific.

---

## 2. Open Tasks (Prioritized P0–P3)

### Priority P0 — Critical Path

| ID | Title | Priority | Owner | Dependencies | Acceptance Criteria |
|---|---|---|---|---|---|
| T-001 | Refactor AuthService into `@ogroniedu/auth` package | P0 | Backend | T-013, T-011 | New package exports AuthService, JwtService, AccountAccessService; all existing tests pass 100%; new package builds with `pnpm turbo run build` |
| T-002 | Refactor PaymentsService into `@ogroniedu/payments` package | P0 | Backend | T-003, T-004 | New package exports payment adapters, LedgerService; all provider adapters functional; contract tests pass |
| T-003 | Implement `GET /api/v1/files/:fileId/download` endpoint | P0 | Backend | T-006, T-012 | Endpoint returns signed URL or file bytes; integration test verifies download works for tutor evidence |
| T-004 | Gate / remove `POST /api/v1/notifications/test-dispatch` | P0 | Backend | SEC-002 env config test flag | Test dispatch only available when `TEST_DISPATCH_ENABLED=true` AND role is super_admin or admin; otherwise returns 403 |

### Priority P1 — High Impact

| ID | Title | Priority | Owner | Dependencies | Acceptance Criteria |
|---|---|---|---|---|---|
| T-005 | Create `@ogroniedu/tutors` package with domain exports | P1 | Backend | T-001, T-003 | Package exports TutorsService, verification helpers; existing tutor tests unchanged and pass |
| T-006 | Add foreign key from `file_assets` to `tutor_profiles` + `bookings` | P1 | DB | T-012 | New FKs enforce referential integrity; existing migrations pass; no data loss |
| T-007 | Remove dev-secret fallbacks in notification gateway + files service | P1 | Backend | RLD-006 fix | Both files fail loudly if `JWT_SECRET` env missing; no hardcoded fallback paths |
| T-008 | Consolidate admin operations into `@ogroniedu/admin` package | P1 | Backend | T-010, T-002 | Package exports admin service subset; all admin endpoints still functional after migration |

### Priority P2 — Important But Not Critical

| ID | Title | Priority | Owner | Dependencies | Acceptance Criteria |
|---|---|---|---|---|---|
| T-009 | Refactor LearningService into `@ogroniedu/learning` package | P2 | Backend | T-005, T-008 | Package exports learning sub-services; all learning unit tests pass 100% |
| T-010 | Create `@ogroniedu/trust` package with safety/disputes/reviews/replacements | P2 | Backend | T-009, T-005 | Package exports trust services; existing trust tests unchanged and pass |
| T-011 | Migrate DTO validation from `class-validator` to `zod` | P2 | Backend | T-001, T-005 | All DTOs validated via zod schemas; existing validation logic unchanged in behavior |
| T-012 | Add FK constraints and index optimizations to `file_assets` + `outbox` | P2 | DB | T-006 | New indexes; migration 031 creates them; existing data intact |

### Priority P3 — Hardening / Infrastructure

| ID | Title | Priority | Owner | Dependencies | Acceptance Criteria |
|---|---|---|---|---|---|
| T-013 | Fail-fast on missing `JWT_SECRET` in production env | P3 | Backend | T-001, T-007 | App crashes on startup if `JWT_SECRET` not set (production mode); dev has fallback |
| T-014 | Add binary magic-number verification to file upload pipeline | P3 | Backend | T-003 | Upload validation uses `magic-number` lib; valid MIME types accepted; invalid rejected |
| T-015 | Expand health checks to include dependency pings | P3 | Backend | T-013 | Health endpoint returns `ready: true` only when DB + Redis + JWT secret configured |
| T-016 | Document/re-scope collaborative whiteboard claim (RLD-003) | P3 | Docs | None | Markdown doc in `docs/` with scope clarification and UI impact analysis |

---

## 3. Completed Tasks (for reference)

| ID | Title | Completed | Notes |
|---|---|---|---|
| T-000 | Audit codebase and document baseline state | 2026-10-24 | See `00-CURRENT-STATE.md` |
| T-001 | Audit routes, APIs, features, roles | 2026-10-24 | See inventories |
| T-002 | Identify security findings (RLD-001 to RLD-008) | 2026-10-24 | See security audit |
| T-003 | Build documentation hierarchy | 2026-10-24 | See all `01-15` files |

---

## 4. Task Dependencies Graph (Top-Level)

```
T-001 (auth) ──> T-005 (tutors package)
T-001 ──> T-011 (zod validation)
T-001 ──> T-013 (JWT_SECRET fail-fast)
T-002 (payments) ──> T-008 (admin package)
T-002 ──> T-006 (file FK constraints)
T-003 (file download) ──> T-012 (index optimizations)
T-003 ──> T-014 (magic-number verification)
T-004 (test-dispatch gate) ──> SEC-002 (env flag)
T-005 ──> T-009 (learning package)
T-005 ──> T-011 (zod validation)
T-006 ──> T-012 (index optimizations)
T-007 ──> T-013 (JWT_SECRET fail-fast)
T-008 ──> T-010 (trust package)
T-009 ──> T-010 (trust package co-dependency)
T-010 ──> (all above)
T-011 ──> (all DTO migrations)
T-012 ──> T-006 (FK constraints)
T-013 ──> (env validation across all)
T-014 ──> T-003 (file download)
T-015 ──> T-013 (health depends on JWT_SECRET)
```

---

## 5. Acceptance Criteria Format (Standardized)

Each task acceptance criteria follows this template:

```markdown
### Acceptance Criteria

- [ ] **Given** <precondition>, **when** <action>, **then** <outcome>
- [ ] **Given** <alternate precondition>, **when** <alternate action>, **then** <alternate outcome>
- [ ] **Given** <edge case>, **when** <edge action>, **then** <edge outcome>
```

All criteria must be verifiable via automated test or manual verification in the CI pipeline.

---

## 6. Task Status Tracking

| Status | Meaning |
|---|---|
| `pending` | Not started |
| `in_progress` | Actively being worked |
| `blocked` | Waiting on external dependency |
| `under_review` | Code review pending |
| `completed` | Done and merged |
| `cancelled` | No longer needed |

---

*End of `11-MASTER-TASK-REGISTER.md`.*