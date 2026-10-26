# OgroniEdu — Master Deprecated Code and Dependency Register

**Status:** AUDITED & VERIFIED  
**Date:** 2026-10-24  
**Scope:** Verified audit of framework versions, third-party dependencies, deprecated API usages, and phantom route cleanups across `@ogroniedu/api`, `@ogroniedu/web`, `@ogroniedu/contracts`, and `@ogroniedu/database`.

---

## 1. Verified Dependency Stack Audit

| Package                       | Workspace                    | Installed Version | Maintenance Status         | Audit Notes & Guidance                                                              |
| ----------------------------- | ---------------------------- | ----------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| **`next`**                    | `@ogroniedu/web`             | `16.4.2`          | Current Stable (Turbopack) | React 19 native, App Router, full Server Components support. No deprecations found. |
| **`react` / `react-dom`**     | `@ogroniedu/web`             | `^19.3.0`         | Current Stable             | React 19.3. Modern hooks and Server Actions compatible.                             |
| **`next-intl`**               | `@ogroniedu/web`             | `^4.14.9`         | Current Stable             | Bilingual internationalization (`bn`, `en`).                                        |
| **`@reduxjs/toolkit`**        | `@ogroniedu/web`             | `^2.13.0`         | Current Stable             | Modern Redux slice and RTK Query data fetching.                                     |
| **`tailwindcss`**             | `@ogroniedu/web`             | `^4.3.3`          | Current Stable (v4)        | Tailwind v4 with `@tailwindcss/postcss`.                                            |
| **`date-fns`**                | `@ogroniedu/web`             | `^4.4.0`          | Current Stable             | Pure functional date manipulation.                                                  |
| **`@nestjs/core` / `common`** | `@ogroniedu/api`             | `^12.1.2`         | Current Stable             | NestJS 12 modular monolith.                                                         |
| **`typeorm`**                 | `@ogroniedu/api`, `database` | `^1.1.2`          | Active                     | Configured with PostgreSQL 18 driver (`pg` `^8.23.1`).                              |
| **`@nestjs/swagger`**         | `@ogroniedu/api`             | `^12.0.2`         | Current Stable             | OpenAPI specification generator. Installed and operational.                         |
| **`class-validator`**         | `@ogroniedu/api`             | `^0.15.1`         | Current Stable             | Validating DTOs with class-transformer.                                             |
| **`bcryptjs`**                | `@ogroniedu/api`             | `^3.0.3`          | Active                     | Password hashing with cost factor 12.                                               |
| **`socket.io`**               | `@ogroniedu/api`             | `^4.8.4`          | Current Stable             | WebSocket real-time notification engine.                                            |
| **`zod`**                     | `@ogroniedu/contracts`       | `^4.6.5`          | Current Stable             | Schema validation contracts.                                                        |
| **`vitest`**                  | Root / Workspaces            | `^5.0.3`          | Current Stable             | Unit and integration test runner.                                                   |
| **`@playwright/test`**        | `@ogroniedu/web`             | `^1.64.0`         | Current Stable             | End-to-end browser automation.                                                      |
| **`oxlint`**                  | Root Dev                     | `^1.88.0`         | Current Fast Linter        | Rust-based linter executing across 1,000+ files in ~200ms.                          |

---

## 2. Deprecated Code Patterns & Modernization Targets

| ID        | Issue / Code Pattern                                             | Location                                               | Verified Status                  | Modern Replacement                                                                                                                                |
| --------- | ---------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEP-001` | Hardcoded dev-secret fallback string (`'secure-jwt-secret-dev'`) | `notification.gateway.ts:25`, `files.service.ts:87`    | **Active Risk (P2)**             | Throw fatal startup exception in production if `JWT_SECRET` is unset.                                                                             |
| `DEP-002` | Notification test-dispatch endpoint in production code           | `notification.controller.ts:103`                       | **Mitigated (P1)**               | Runtime check already rejects unless `TEST_DISPATCH_ENABLED === 'true'` AND caller has `admin`/`super_admin` role. Needs automated negative test. |
| `DEP-003` | Missing file download endpoint for uploaded evidence             | `files.controller.ts`                                  | **Defect (P1)**                  | Implement `GET /api/v1/files/:fileId/download` with HMAC signed URL token validation.                                                             |
| `DEP-004` | Unused expression in notifications service                       | `booking-messages.service.ts:221`                      | **Linter Warning (P1)**          | `this.notificationGateway?.sendToUser ? undefined : null;` — remove dead expression.                                                              |
| `DEP-005` | Unused imports in test specs                                     | 7 API test files                                       | **Linter Warning (P1)**          | Remove 10 unused imports to bring Oxlint to 0 warnings / 0 errors.                                                                                |
| `DEP-006` | Inline interfaces polluting backend service files                | 27 `*.service.ts` files                                | **Architecture Mandate (P1/P2)** | Extract all interfaces into dedicated `interfaces/` module subfolders.                                                                            |
| `DEP-007` | Oversized route `page.tsx` files violating thin-route pattern    | 11 `page.tsx` files                                    | **Architecture Mandate (P1/P2)** | Extract large views into `src/features/<domain>/components/`.                                                                                     |
| `DEP-008` | Phantom routes referenced in historical documentation            | `docs/USER_JOURNEYS.md`, `ROUTE_AND_NAVIGATION_MAP.md` | **Documentation Defect (P2)**    | Purge references to `/dashboard/student/guardian-link`, `/dashboard/guardian/approvals`, etc.                                                     |

---

## 3. Policy on Major Dependency Upgrades During MVP

In strict accordance with Part I Rule 2 (_"Do not introduce unnecessary technology migrations during the MVP window"_):

1. **NO major framework migrations**: Next.js 16.4.2 and NestJS 12.1.2 are modern, stable, and fully supported. No framework migration will be undertaken.
2. **NO DTO validation rewrite**: `class-validator` 0.15.1 is stable and deeply integrated with NestJS ValidationPipe. Migrating hundreds of DTOs to Zod during the 7-day MVP window introduces immense regression risk without runtime benefit. Zod remains in `@ogroniedu/contracts` for shared contracts.
3. **Focused, Safe Upgrades Only**: Only patch and minor updates addressing verified security vulnerabilities will be applied during the 7-day window.
