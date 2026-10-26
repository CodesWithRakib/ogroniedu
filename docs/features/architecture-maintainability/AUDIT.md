# Architecture, Complexity & Technical Debt Audit — OgroniEdu (অগ্রণী এডু)

## 1. Executive Summary

An exhaustive code-level audit was conducted across the entire OgroniEdu monorepo (`@ogroniedu/web`, `@ogroniedu/api`, `@ogroniedu/contracts`, `@ogroniedu/database`, and `@ogroniedu/tsconfig`). The audit evaluated:

1. File sizes, cyclomatic complexity, and responsibility boundaries.
2. Circular dependency chains across all workspace packages.
3. Code duplication across frontend pages, backend services, and API contracts.
4. Baseline test pass rates, linting rules, typecheck status, and documentation integrity.

---

## 2. Baseline Verification Quality Gates

All baseline quality gates were executed directly on the repository prior to code changes:

| Verification Gate            | Command                                      | Baseline Result                                             | Status          |
| :--------------------------- | :------------------------------------------- | :---------------------------------------------------------- | :-------------- |
| **Monorepo Test Suite**      | `pnpm test`                                  | **1,180 passed** (127 test files across 4 packages)         | ✅ 100% Passing |
| **Backend API Tests**        | `pnpm --filter @ogroniedu/api test`          | **920 passed** (87 test files, 0 failures)                  | ✅ 100% Passing |
| **Frontend Web Tests**       | `pnpm --filter @ogroniedu/web test`          | **237 passed** (38 test files, 0 failures)                  | ✅ 100% Passing |
| **Database Migrations Test** | `pnpm --filter @ogroniedu/database test`     | **23 passed** (18 migration + 5 BCDR cold recovery tests)   | ✅ 100% Passing |
| **TypeScript Typecheck**     | `pnpm typecheck`                             | **0 errors** across all 5 workspace packages                | ✅ Clean        |
| **Oxlint Monorepo Lint**     | `pnpm lint`                                  | **0 errors, 0 warnings** across 988 source files            | ✅ Clean        |
| **Documentation Integrity**  | `node scripts/validate-documentation.js`     | **368 files verified**, all 26 canonical documents valid    | ✅ Clean        |
| **Deployment Smoke Test**    | `node scripts/smoke-test.mjs --target local` | **8/8 checks passed** (Liveness, Readiness, SSR, SEO, Auth) | ✅ Healthy      |

---

## 3. High-Complexity File Hotspots Audit

### 3.1 Backend Service Hotspots (`apps/api`)

| Rank | File Path                                                            | Lines | Identified Architectural Problem                                                                                   | Proposed Decomposition                                                                                |
| :--: | :------------------------------------------------------------------- | :---: | :----------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
|  1   | `apps/api/src/modules/auth/auth.service.ts`                          | 1,087 | Combines credential hashing, brute-force lockouts, OTP generation, token refresh, and magic link validation.       | Extract pure lockout and token policy helpers into `auth-policy.util.ts`.                             |
|  2   | `apps/api/src/modules/trust/tutor-replacement.service.ts`            | 1,053 | Mixes dispute eligibility scoring, financial escrow recalculations, tutor candidate matching, and TypeORM queries. | Extract pure replacement eligibility, scoring, and financial logic into `replacement-policy.util.ts`. |
|  3   | `apps/api/src/modules/trust/safety-reports.service.ts`               | 1,039 | Mixes protective hold validation, evidence attachment validation, and investigation workflows.                     | Isolate safeguarding escalation rules into pure domain helper functions.                              |
|  4   | `apps/api/src/modules/tutors/services/tutor-verification.service.ts` |  992  | Combines multi-tier verification status derivation, document audit checks, and tier upgrade actions.               | Retain cohesive dossier service; ensure type contracts are strictly extracted.                        |
|  5   | `apps/api/src/modules/learning/services/assignments.service.ts`      |  922  | Assignment creation, student submission lifecycle, grading, and file asset checks in one file.                     | Cohesive domain; keep focused and ensure strict DTO separation.                                       |
|  6   | `apps/api/src/modules/notifications/notification.service.ts`         |  505  | Tightly coupled with `NotificationGateway` via bidirectional `forwardRef()`.                                       | Introduce `INotificationBroadcaster` interface to break circular dependency.                          |

### 3.2 Frontend Component Hotspots (`apps/web`)

| Rank | File Path                                                      | Lines | Identified Architectural Problem                                                                              | Proposed Decomposition                                                                                                                             |
| :--: | :------------------------------------------------------------- | :---: | :------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1   | `apps/web/src/features/admin/pages/admin-taxonomy-page.tsx`    | 1,460 | Giant monolith combining Category, Subject, Grade, and Track Level tables, forms, modals, and delete dialogs. | Decompose into 4 dedicated feature sections (`CategorySection`, `SubjectSection`, `GradeSection`, `TrackSection`) + unified `TaxonomyEntityModal`. |
|  2   | `apps/web/src/features/tutors/pages/tutor-details-page.tsx`    | 1,076 | Tutor profile details, booking modal, reviews list, and safety badges in one page file.                       | Cohesive page; modularize booking modal trigger.                                                                                                   |
|  3   | `apps/web/src/features/profile/pages/profile-page.tsx`         | 1,050 | Combines student/tutor/guardian profile editing, OTP verify, password change, and deletion dialogs.           | Modularize tabs into distinct feature sub-components.                                                                                              |
|  4   | `apps/web/src/components/guardian/GuardianChildrenManager.tsx` |  999  | Combines child cards, link student modal, emergency alert settings, and replacement guarantee claim form.     | Decompose into `GuardianChildrenTable`, `LinkChildModal`, `EmergencyAlertSettings`, and `ReplacementGuaranteeCard`.                                |

---

## 4. Circular Dependency Audit

The circular dependency analysis tool (`scripts/audit-circular-deps.mjs`) revealed the following dependency cycles:

1. **Frontend `GuardianChildrenManager` Cycle**:
   - `GuardianChildrenManager.tsx` ⇄ `use-guardian-children.ts`
   - **Root cause**: Custom hook `use-guardian-children.ts` imported interface definitions (`ChildItem`, `GuardianRelationship`) from the JSX component file `GuardianChildrenManager.tsx`.
   - **Impact**: Cross-import between hook and component causing bundle coupling.
2. **Frontend `base-api.ts` Cycle**:
   - `apps/web/src/store/store.ts` ⇄ `apps/web/src/store/base-api.ts`
   - **Root cause**: `base-api.ts` imported `type { RootState }` from `store.ts`, while `store.ts` imported `baseApi` from `base-api.ts`.
3. **Backend `NotificationService` ⇄ `NotificationGateway` Cycle**:
   - `notification.service.ts` ⇄ `notification.gateway.ts`
   - **Root cause**: Presentation/transport layer (`NotificationGateway`) and domain service (`NotificationService`) injected each other using `@Inject(forwardRef(...))`.
   - **Impact**: Violates Clean Architecture Dependency Inversion Principle; gateway should depend on service or service should emit events via an abstract broadcaster.
4. **TypeORM Bi-directional Entity Cycles**:
   - Direct value imports between parent and child entities in `@OneToMany` / `@ManyToOne` decorators (e.g. `TutorProfileEntity` ⇄ `TutorQualificationEntity`).

---

## 5. Technical Debt Assessment & Priority Ranking

- **Priority 0 (Safety & Integrity)**: Ensure zero regressions in double-entry ledger math, GiST scheduling exclusion constraints, and child safeguarding emergency holds during any refactoring.
- **Priority 1 (Structural Risk)**:
  - Eliminate the `NotificationService` ⇄ `NotificationGateway` circular coupling using interface-based broadcaster abstraction.
  - Eliminate the `GuardianChildrenManager.tsx` ⇄ `use-guardian-children.ts` type-level circular dependency by extracting `guardian-children.types.ts`.
  - Eliminate `store.ts` ⇄ `base-api.ts` state interface circular reference.
- **Priority 2 (Maintainability Hotspots)**:
  - Decompose `admin-taxonomy-page.tsx` (1,460 lines) into focused sub-components.
  - Decompose `GuardianChildrenManager.tsx` (999 lines) into modular sub-components.
  - Extract pure business logic from `tutor-replacement.service.ts` into `replacement-policy.util.ts`.
  - Extract pure auth logic from `auth.service.ts` into `auth-policy.util.ts`.
- **Priority 3 (Low-impact Cleanup)**:
  - Verify unified API error envelopes across all endpoints.
  - Clean up dead imports and redundant type assertions.
