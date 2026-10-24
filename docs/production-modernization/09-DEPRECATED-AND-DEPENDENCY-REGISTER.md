# OgroniEdu — Deprecated Code and Dependency Register

**Status:** DRAFT (Phase 0)  
**Purpose:** Identify deprecated code paths, legacy dependencies, and migration targets.

---

## 1. Deprecated Code Patterns

| ID | Pattern | Location | Replacement | Priority |
|---|---|---|---|---|
| DEP-001 | Dev-secret fallback in notification gateway | `apps/api/src/modules/notifications/notification.gateway.ts:14` | `JWT_SECRET` env + fail-fast | P3 |
| DEP-002 | Dev-secret fallback in files service | `apps/api/src/modules/files/files.service.ts:15` | `JWT_SECRET` env + fail-fast | P3 |
| DEP-003 | Hardcoded `malwareScanStatus: 'clean'` | `apps/api/src/modules/files/files.service.ts:148` | Real virus scan integration | P2 |
| DEP-004 | Test dispatch endpoint in prod code | `apps/api/src/modules/notifications/notification.controller.ts:98` | Env-gated or removed | P1 |
| DEP-005 | Missing file download endpoint | `apps/api/src/modules/files/files.service.ts:148-171` | `GET /api/v1/files/:fileId/download` | P1 |
| DEP-006 | Legacy JWT algorithm fallback (none found but verify) | `apps/api/src/modules/auth/auth.service.ts` | Enforce HS256 only | P3 |
| DEP-007 | Raw SQL fragment in `BookingService.assertNoTutorOverlap` | `apps/api/src/modules/bookings/bookings.service.ts:207` | Use TypeORM QueryBuilder | P2 |
| DEP-008 | Inline date arithmetic in `BookingExpiryService` | `apps/api/src/modules/bookings/booking-expiry.service.ts` | Replace with Luxon/date-fns | P3 |
| DEP-009 | Magic-number advisory lock keys | `apps/api/src/modules/bookings/...` | Named constants | P3 |
| DEP-010 | Hardcoded Bengali strings in components | `apps/web/src/features/**` | Use `next-intl` keys exclusively | P2 |

---

## 2. Legacy / Deprecated Dependencies

| Package | Version | Status | Replacement/Migration |
|---|---|---|---|
| `jsonwebtoken` | v9.x | Active, but consider replacing with `jose` for modern JWT | P3 |
| `bcryptjs` | v2.x | Active, but native `argon2` preferred | P3 |
| `bcrypt` | (native binding) | Not in use | Avoid introducing |
| `class-validator` | 0.14.x | Active | Migrate to `zod` (Phase 11) |
| `class-transformer` | 0.5.x | Active | Bundled with class-validator |
| `moment` | (check usage) | Likely none | Verify removal |
| `dayjs` | (check) | Preferred date lib | Confirm no moment leftovers |
| `swagger-ui-express` | (check) | Legacy if present | Replace with `@nestjs/swagger` |

---

## 3. Legacy Migration Targets

| Target | Current | Proposed | Phase |
|---|---|---|---|
| DTO validation | `class-validator` | `zod` | Phase 11 |
| JWT library | `jsonwebtoken` | `jose` | Phase 3 (auth extraction) |
| Date handling | Mixed (JS Date, Luxon in scheduler) | `dayjs` or `date-fns` | Phase 4 |
| OpenAPI docs | None (manual) | `@nestjs/swagger` | Phase 15 |
| File storage | Local disk (metadata only) | S3-compatible via adapters | Phase 6 |

---

## 4. Code Smells Identified

| Smell | File | Lines | Description |
|---|---|---|---|
| Large method | `notification.gateway.ts` | 1,327 | Single file does too much |
| Long param list | `tutors.service.ts` | 626 | Methods with >7 parameters |
| Duplicate logic | `tutor-replacement.service.ts`, `bookings.service.ts` | — | Overlapping availability/overlap checks |
| Magic strings | `auth.service.ts` | — | Hardcoded role names |
| Inconsistent error handling | Multiple `catch` blocks | — | Some swallow errors |
| `any` usage | `analytics.service.ts` | — | Product analytics event typing |

---

## 5. Dependency Audit Results

| Check | Status |
|---|---|
| `pnpm audit --prod` (Phase 15) | **0 known vulnerabilities** ✅ |
| Deprecated APIs in app code | **None** ✅ |
| Lockfile integrity | ✅ `pnpm-lock.yaml` maintained |

---

*End of `09-DEPRECATED-AND-DEPENDENCY-REGISTER.md`.*