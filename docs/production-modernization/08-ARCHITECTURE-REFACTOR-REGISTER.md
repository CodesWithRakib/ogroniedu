# OgroniEdu — Architecture Refactor Register

**Status:** DRAFT (Phase 0)  
**Purpose:** Track all architectural improvement initiatives identified during the audit.

---

## 1. Refactor Inventory

| ID | Area | Title | Priority | Complexity | Effort (Est.) | Risk |
|---|---|---|---|---|---|---|
| REF-001 | Auth | Extract auth flow into dedicated `@ogroniedu/auth` package | P1 | High | 3d | Medium |
| REF-002 | Payments | Create `@ogroniedu/payments` domain package (adapters + services) | P1 | High | 4d | Medium |
| REF-003 | Tutors | Extract tutor-domain into `@ogroniedu/tutors` package | P1 | High | 4d | Low |
| REF-004 | Bookings | Consolidate `BookingsService` + `SchedulingService` into shared domain | P1 | High | 3d | Medium |
| REF-005 | Notifications | Isolate `notification.gateway.ts` dev-secret fallback | P2 | Low | 0.5d | Low |
| REF-006 | Files | Implement file download endpoint and storage | P1 | Medium | 2d | Low |
| REF-007 | Guardians | Move `GuardianStudentGuard` into shared `app/` module | P3 | Low | 1d | Low |
| REF-008 | Learning | Consolidate `LearningService` modules into single feature package | P2 | High | 3d | Medium |
| REF-009 | Trust | Group safety/disputes/reviews/replacements into `@ogroniedu/trust` package | P2 | High | 4d | Medium |
| REF-010 | Admin | Consolidate admin endpoints into `@ogroniedu/admin` package | P2 | High | 3d | Medium |
| REF-011 | Analytics | Extract `AnalyticsService` into shared package | P3 | Medium | 2d | Low |
| REF-012 | DB | Add foreign key constraints from `file_assets` to entity tables | P3 | Medium | 2d | Low |
| REF-013 | Config | Migrate legacy env vars to structured `ConfigModule` | P2 | Medium | 2d | Low |
| REF-014 | Health | Expand health checks to include dependency pings | P3 | Low | 1d | Low |
| REF-015 | Docs | OpenAPI specification generation (`@nestjs/swagger`) | P2 | Medium | 2d | Low |

---

## 2. Refactor Dependency Graph

```
REF-001 (auth) ──> REF-013 (config)
REF-002 (payments) ──> REF-003 (tutors), REF-004 (bookings)
REF-004 (bookings) ──> REF-001 (auth)
REF-003 (tutors) ──> REF-008 (learning)
REF-009 (trust) ──> REF-002 (payments), REF-004 (bookings)
REF-010 (admin) ──> all above
REF-011 (analytics) ──> REF-001 (auth)
REF-012 (db fk) ──> REF-006 (files)
REF-005, REF-006, REF-007, REF-014, REF-015 ──> independent (can proceed in parallel)
```

---

## 3. Module Boundary Principles

1. **Feature packages** live under `packages/<domain>/src/`.
2. **Shared utilities** live under `packages/shared/src/`.
3. **Contracts/interfaces** live under `packages/contracts/src/`.
4. **Database layer** is exclusively within `@ogroniedu/database`.
5. Each package has its own `package.json`, `tsconfig.json`, and barrel (`index.ts`).
6. Domain packages depend only on contracts and shared utilities — **never on each other directly** (use events for cross-domain communication).
7. **Tests accompany each package** under `__tests__/` with 100% coverage for core services.

---

## 4. Refactoring Guidelines (Phase 8-12)

| Guideline | Description |
|---|---|
| G-1 | Before splitting a module, ensure existing tests pass 100%. |
| G-2 | Extract interfaces in `@ogroniedu/contracts` before moving implementations. |
| G-3 | Avoid breaking changes in public API surface during module extraction. |
| G-4 | Use barrel exports consistently across all packages. |
| G-5 | Validate each refactor with `pnpm turbo run build` and `pnpm turbo run test:unit`. |
| G-6 | Maintain transaction boundaries across domain boundaries via outbox. |

---

## 5. Oversized / High-Complexity Files (Phase 8 Targets)

| File | Lines | Issue | Refactor Approach |
|---|---|---|---|
| `apps/api/src/modules/notifications/notification.gateway.ts` | 1,327 | Monolithic gateway, dev-secret fallback | Split handlers into services; extract guard |
| `apps/api/src/modules/payments/payments.service.ts` | 686 | Multiple providers, large methods | Extract provider adapters into dedicated services |
| `apps/api/src/modules/payments/payouts.service.ts` | 589 | Manual payout logic | Apply strategy pattern for providers |
| `apps/api/src/modules/tutors/tutors.service.ts` | 626 | Mixed verification/billing/profile | Split into verification sub-service |
| `apps/api/src/modules/trust/safety-reports.service.ts` | 881 | Action orchestration | Decompose into action handlers |
| `apps/api/src/modules/trust/disputes.service.ts` | 751 | Complex state machine | Apply state machine pattern |
| `apps/api/src/modules/trust/tutor-replacement.service.ts` | 584 | Candidate scoring | Extract scorer service |
| `apps/api/src/modules/bookings/bookings.service.ts` | 434 | Booking lifecycle | Delegate to scheduler + payment |
| `apps/api/src/modules/learning/learning.service.ts` | 605 | Mixed concerns | Split into assignment, goal, lesson sub-services |
| `apps/api/src/modules/admin/operations.service.ts` | 488 | Generic admin commands | Split into feature-specific admin services |
| `apps/web/src/lib/navigation.ts` | 776 | Monolithic nav builder | Decompose per role; lazy-load nav |

---

*End of `08-ARCHITECTURE-REFACTOR-REGISTER.md`.*