# OgroniEdu — Architecture and Dependency Map

**Status:** VERIFIED  
**Date:** 2026-10-24

---

## 1. System Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Internet / Browser                    │
└──────────────┬───────────────────────────────────────────┘
               │ HTTPS (CORS-scoped to FRONTEND_URL)
               ▼
┌──────────────────────────────────────────────────────────┐
│  apps/web — Next.js 16.4.2 (App Router)  :5000 /bn,/en    │
│  - React 19 + Turbopack                                    │
│  - RTK Query + Redux Toolkit                               │
│  - next-intl (i18n: bn, en)                                │
│  - Tailwind v4                                             │
│  - Playwright e2e (test/)                                  │
└──────┬───────────────────────────┬───────────────────────┘
       │ @ogroniedu/contracts      │ @ogroniedu/contracts
       ▼   (shared DTOs)           ▼
┌──────────────────────────────────────────────────────────┐
│  apps/api — NestJS 12.1.2  :4000 /api/v1                 │
│  - 20 modules organized by domain                        │
│  - TypeORM (pg) + PostgreSQL 18                         │
│  - JWT (HS256, 15m) + refresh cookie + OTP              │
│  - Socket.IO gateway (/notifications namespace)           │
│  - class-validator / class-transformer                    │
│  - Swagger (non-prod) │ Health probes                    │
└──────┬───────────────────────────────────────────────────┘
       │
       ├── @ogroniedu/database (entities + migrations)
       └── PostgreSQL 18 (78 tables + 2 views, 30 migrations)
```

### Dependency direction

```
apps/web ──► @ogroniedu/contracts ──► @ogroniedu/database
apps/api ──► @ogroniedu/contracts ──► @ogroniedu/database
                        ↗
apps/api ──► @ogroniedu/database
```

No circular dependencies exist between application-owned packages (verified by `audit-circular-deps.mjs`, Phase 15).

---

## 2. Package Manifest

| Package                | Kind           | Version | Purpose                                      |
| ---------------------- | -------------- | ------- | -------------------------------------------- |
| `ogroniedu` (root)     | workspace root | —       | Turborepo config, shared tooling             |
| `@ogroniedu/web`       | app            | private | Next.js 16 frontend                          |
| `@ogroniedu/api`       | app            | private | NestJS 12 backend API                        |
| `@ogroniedu/database`  | package        | 1.0.0   | TypeORM entities, migrations, DB scripts     |
| `@ogroniedu/contracts` | package        | 1.0.0   | Shared DTOs, types, enums (api ←→ web)       |
| `@ogroniedu/tsconfig`  | package        | 1.0.0   | Base TypeScript configs (base, nest, nextjs) |

---

## 3. Backend Module Dependency Graph

Derived from `apps/api/src/app.module.ts`. Each module is self-contained with its own controllers, services, DTOs, and repositories.

```
AppModule
├── ConfigModule (global, env validation)
├── TypeOrmModule (config only, autoLoadEntities)
├── HealthModule
├── AuditModule
├── AuthSecurityModule
├── AuthModule ──► ConfigModule
├── OnboardingModule
├── UsersModule
├── GuardiansModule
├── FilesModule
├── TaxonomyModule
├── TutorsModule ──► TaxonomyModule (subjects/levels), FilesModule (evidence), LearningModule, PaymentsModule
├── BookingsModule ──► Users, Tutors, Taxonomy, Payments, Learning, Notifications
├── LearningModule ──► BookingsModule, FilesModule
├── PaymentsModule ──► Users, Tutors, Bookings, Analytics
├── NotificationsModule ──► Users, Bookings, Payments
├── TrustModule ──► Users, Bookings, Payments, Tutors
├── SupportModule
├── PublicModule
├── AdminModule ──► Users, Tutors, Bookings, Trust, Analytics
├── AnalyticsModule ──► Users, Bookings, Payments
├── OrganizationsModule
└── FeedbackModule
```

Cross-module references are primarily via:

- **DTOs** in `@ogroniedu/contracts` (the shared contract layer)
- **Service method parameters** (primitives/identifiers, not entity imports)
- **Event emission** (outbox pattern via `OutboxWorkerService`)

---

## 4. Frontend Dependency Graph

```
app/
├── [locale]/            (# routing, i18n)
├── layout.tsx           (# root layout + i18n provider + Redux Provider)
├── page.tsx             (# redirects /bn → /bn/...)
├── global-error.tsx
└── not-found.tsx

features/               (# domain-organized feature slices)
├── auth/               (# login, register, OTP, magic link)
├── onboarding/
├── dashboard/
├── bookings/
├── classroom/
├── learning/
├── messaging/
├── notifications/
├── payments/
├── trust/
├── tutors/
├── tutor-discovery/
├── guardian/
├── student/
├── profile/
├── admin/
├── analytics/
├── feedback/
└── public/

lib/                    (# application-level shared utilities)
├── api/                (# base-api.ts, api-error.ts)
├── auth.ts
├── navigation.ts       (# role-aware navigation generator, 26KB — oversized)
├── route-policy.ts
├── i18n.ts
├── format.ts
├── fonts.ts
├── utils.ts
└── evidence-file.ts

store/
├── index.ts
├── store.ts
├── store.types.ts
├── slices/
└── services/           (# RTK Query API slices, 19 service files)

components/
├── shared/            (# reusable UI primitives)
├── ui/               (# shadcn-derived components)
├── shell/            (# header/nav/footer shell)
└── [role]/           (# role-specific widget components)
```

---

## 5. Data Flow: Typical Booking Journey

```
Student (web)                    API (NestJS)              Database (PostgreSQL)
                                    │
 1. Search tutors                │
    → GET /api/v1/taxonomy/*
 2. Select tutor                 │
    → GET /api/v1/tutors/public/:id
 3. Book                          │
    → POST /api/v1/requests
                                 bookings service
                                 → creates booking_request
                                 → dispatches notification event
 4. Tutor responds               │
    → POST /api/v1/requests/:id/respond
                                 bookings service
                                 → updates booking status
                                 → if accepted → payments service
                                 → creates payment_order (escrow)
 5. Pay                            │
    → POST /api/v1/payments/orders
                                 → SSLCommerz/bKash adapter
                                 → redirect URL returned
 6. Webhook callback               │
    → POST /api/v1/payments/webhook/:provider
                                 → verifies signature
                                 → releases escrow to 2010_STUDENT_ESCROW
                                 → writes ledger entries (balanced)
 7. Session                        │
    → POST /api/v1/sessions
                                 → scheduling service
                                 → GiST overlap exclusion (no double-book)
 8. Complete session              │
    → POST /api/v1/sessions/:id/complete
                                 → scheduling service
                                 → payments settleMilestone()
                                 → releases 92% to tutor 2000_TUTOR_PAYABLE
                                 → 8% to 4000_PLATFORM_REVENUE
                                 → outbox: session.settled (real-time notification)
```

---

## 6. External Integrations

| Integration  | Adapter                               | Status     | Notes                          |
| ------------ | ------------------------------------- | ---------- | ------------------------------ |
| SSLCommerz   | `sslcommerz.adapter.ts`               | Sandbox    | Signature verification tested  |
| bKash        | `bkash.adapter.ts`                    | Sandbox    | Fails closed if no creds       |
| Nagad        | (pending in payments module)          | Stubbed    | See RLD-006                    |
| Google Meet  | `meetingUrl` field on sessions        | Live link  | No in-browser WebRTC           |
| Socket.IO    | `notification.gateway.ts`             | Production | JWT-authenticated, room-scoped |
| SMTP/SMS     | Outbox events (`notifications` table) | Mocked     | Per KNOWN_LIMITATIONS.md       |
| File storage | `files.service.ts`                    | Local disk | Private-dir pattern            |

---

## 7. Critical Architectural Patterns

| Pattern              | Location                                            | Notes                                         |
| -------------------- | --------------------------------------------------- | --------------------------------------------- |
| Transactional Outbox | `OutboxWorkerService`, outbox table                 | Events persisted in DB tx, polled, dispatched |
| Double-Entry Ledger  | `LedgerService` + chart of accounts                 | Invariant: Σ debits == Σ credits enforced     |
| Advisory Locks       | `BookingExpiryService`                              | Prevents duplicate sweep execution            |
| ABAC Resource Guards | `guardian-student.guard.ts`, `GuardianStudentGuard` | Per-resource ownership checks                 |
| RBAC                 | `roles.guard.ts`                                    | Class/method-level `@Roles()` decorator       |

---

## 8. Dependency Versions (Critical)

Key versions as declared in package manifests (2026-10-24). All packages have clean typecheck.

| Package                       | Version  |
| ----------------------------- | -------- |
| Next.js                       | 16.4.2   |
| React                         | 19.3.0   |
| NestJS (common/core/platform) | 12.1.2   |
| TypeORM                       | 1.1.2    |
| Socket.IO                     | 4.8.4    |
| TypeScript                    | 7.0.2    |
| Vitest                        | 5.0.3    |
| Playwright                    | 1.64.0   |
| Oxlint                        | 1.88.0   |
| Turborepo                     | 2.11.7   |
| Redis (docker target)         | 7-alpine |
| PostgreSQL (target)           | 18       |

---

## 9. Known Architectural Weaknesses / Gaps

| Weakness                                                                              | Location                                                             | Impact                                 |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------- |
| `navigation.ts` (26KB) — oversized, mixes nav definitions with role logic             | `apps/web/src/lib/navigation.ts`                                     | Maintenance burden, hard to extend nav |
| `booking-messages.service.ts` — `no-unused-expressions` warning                       | `apps/api/src/modules/notifications/booking-messages.service.ts:221` | Code smell, not a functional defect    |
| No `/download` route on `FilesController` — signed URLs point to nonexistent endpoint | `files.controller.ts`, `files.service.ts`                            | RLD-001, blocks tutor verification     |
| `test-dispatch` endpoint ungated                                                      | `notification.controller.ts:98-103`                                  | RLD-002, security control gap          |
| Whiteboard no socket sync                                                             | `InteractiveWhiteboard.tsx`                                          | RLD-003, doc overclaim                 |

---

## 10. Next-Phase Architectural Decisions

- Confirm whether `navigation.ts` should be split by role or feature (FE-REF-001).
- Decide on evidence-file persistence approach: disk + `/download` endpoint, or re-label as metadata-only (REM-01/RLD-001).
- Decide on whiteboard scope (REM-03/RLD-003).

---

_End of `02-ARCHITECTURE-AND-DEPENDENCIES.md`._
