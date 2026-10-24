# OgroniEdu — Master Decision and Blocker Log

**Status:** AUDITED & OPERATIONAL  
**Date:** 2026-10-24  
**Scope:** Architecture Decision Records (ADRs), scope trade-offs, external blockers, and resolution tracking.

---

## 1. Architecture Decision Records (ADRs)

| ID | Date | Decision | Architectural Context & Rationale | Status |
|---|---|---|---|---|
| **ADR-001** | 2026-10-24 | **Retain NestJS Modular Monolith Architecture (No External Package Churn)** | Extracting NestJS modules into 10 new pnpm workspace packages (`@ogroniedu/auth`, `@ogroniedu/payments`, etc.) during a 7-day MVP window introduces immense regression risk, breaks DI tokens, and churns build tooling without runtime benefit. **Decision**: Maintain `apps/api/src/modules/<domain>/` and enforce modularity by decomposing god services and strictly separating enums and interfaces into dedicated subfolders. | ✅ APPROVED |
| **ADR-002** | 2026-10-24 | **Enforce Strict Interface and Enum Extraction Out of Backend Services** | The user mandated: *"backend er o enum , interface kokhonoi service er vitore thakbe na alada folder kore module e thakbe"*. **Decision**: All 27 services with internal interfaces will be refactored so that interfaces reside in `src/modules/<domain>/interfaces/` and genuine enums in `src/modules/<domain>/enums/`. | ✅ APPROVED |
| **ADR-003** | 2026-10-24 | **Decompose 11 Oversized Next.js Route Pages into Thin Routes (<40 Lines)** | In accordance with App Router best practices, 11 route `page.tsx` files (300 to 829 lines) violate thin route boundaries. **Decision**: Decompose all 11 pages into feature components under `apps/web/src/features/<domain>/components/`. | ✅ APPROVED |
| **ADR-004** | 2026-10-24 | **Retain class-validator for Backend DTOs (Defer Zod API Rewrite)** | `class-validator` 0.15.1 and `class-transformer` are deeply integrated with NestJS `ValidationPipe`. Rewriting hundreds of backend DTOs to Zod during the 7-day MVP launch introduces severe instability. Zod remains authoritative for shared contracts in `@ogroniedu/contracts`. | ✅ APPROVED |
| **ADR-005** | 2026-10-24 | **Re-Scope Collaborative Whiteboard to Local Canvas + Google Meet Video** | Codebase inspection reveals `InteractiveWhiteboard.tsx` is a local HTML5 canvas drawing engine without WebSocket sync (`RLD-003`). Building multi-user CRDT canvas synchronization is out of scope for the 7-day MVP. **Decision**: Update documentation and copy to accurately reflect local canvas notes + Google Meet video conference. | ✅ APPROVED |
| **ADR-006** | 2026-10-24 | **Retain Sandbox Payment Adapters with Server-Authoritative State Machine** | Live production payment credentials for SSLCommerz, bKash, and Nagad require corporate legal provisioning. **Decision**: Sandbox adapters with HMAC signature verification, anti-replay, and idempotent ledger transactions serve as verified launch MVP proxies. | ✅ APPROVED |
| **ADR-007** | 2026-10-24 | **Vitest Test Environment Standardization** | Tests in `@ogroniedu/api` require `JWT_SECRET` and `NODE_ENV=test`. **Decision**: Create `apps/api/vitest.config.ts` providing deterministic test environment variables so `pnpm test` runs 100% green without manual shell export. | ✅ APPROVED |

---

## 2. Active Blocker Log

| Blocker ID | Description | Impact | Owner | Mitigation & Target Resolution | Status |
|---|---|---|---|---|---|
| `BLK-001` | Missing `GET /api/v1/files/:fileId/download` (`RLD-001`) | Admin cannot view or download uploaded tutor verification dossiers | Backend Lead | Implement download endpoint in `files.controller.ts` with HMAC signed URL verification in Phase 04. | ⏳ PENDING |
| `BLK-002` | API Oxlint 11 Warnings failing CI (`--deny-warnings`) | `pnpm lint` fails with exit code 1 | QA Lead | Clean unused expression in `booking-messages.service.ts:221` and unused imports in 7 test specs in Phase 01. | ⏳ PENDING |
| `BLK-003` | 1 Failed Web Test in `test/messaging.spec.ts` | `pnpm --filter @ogroniedu/web test` exits code 1 | Frontend Lead | Align display name assertion with `chat-mappers.ts` in Phase 01. | ⏳ PENDING |
| `BLK-004` | External Live Payment Gateway Provisioning | Production gateway credentials not yet provisioned by banks | Release Manager | Mitigated: Sandbox adapters with fail-closed webhook validation verified for MVP launch. | ✅ MITIGATED |
| `BLK-005` | External SMS Provider Credentials | Live OTP delivery via SMS gateway not provisioned | DevOps Lead | Mitigated: Transactional outbox event logs capture OTP payloads for audit verification. | ✅ MITIGATED |

---

## 3. Scope Trade-Off Summary

To guarantee a reliable, production-ready MVP release within the 7-day window, the following explicit scope trade-offs have been approved:

1. **In-Scope (Mandatory MVP)**:
   - 100% clean baseline build, typecheck, lint, and test suites (1,367 tests green).
   - Decomposing the 11 oversized `page.tsx` route files into thin routes and feature components.
   - Extracting all interfaces and enums from the 27 backend services into dedicated folders.
   - Implementing `GET /api/v1/files/:fileId/download` with HMAC token verification.
   - Gating `test-dispatch` with automated negative regression tests.
   - Removing all hardcoded dev-secret fallback strings.
   - Foreign key constraint and geo-search index migrations.
   - Playwright E2E and Chrome DevTools MCP automated browser verification across all 9 roles.
2. **Deferred Post-MVP (Explicitly Excluded)**:
   - Monorepo package splitting into `@ogroniedu/auth`, `@ogroniedu/payments`, etc. (unnecessary churn).
   - Multi-user real-time whiteboard canvas synchronization (Google Meet link in place).
   - Rewriting all backend DTOs to Zod.
   - Live commercial antivirus daemon integration (file extension and binary magic-byte checks in place).
   - Institutional white-label portal customization.
