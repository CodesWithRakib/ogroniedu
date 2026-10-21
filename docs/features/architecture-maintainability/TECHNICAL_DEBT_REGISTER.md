# Technical Debt Register — OgroniEdu (অগ্রণী এডু)

## 1. Overview & Prioritization Model

This technical debt register tracks structural, maintainability, and code quality issues identified in the repository audit. Items are ranked using the standard priority framework:
- **P0 — Safety or integrity**: Zero tolerance; financial, safeguarding, or security boundary risks.
- **P1 — Structural risk**: Circular dependencies, architectural boundary violations, tightly coupled services.
- **P2 — Maintainability**: Monolithic components (>1,000 lines), mixed responsibilities, duplicated business rules.
- **P3 — Low-impact cleanup**: Code formatting, dead imports, minor naming inconsistencies.

---

## 2. Technical Debt Register

| ID | Location | Evidence | Priority | Risk | Proposed Change | Effort | Dependencies | Verification | Status |
| :---: | :--- | :--- | :---: | :--- | :--- | :---: | :--- | :--- | :---: |
| **DEBT-001** | `apps/web/src/components/guardian/GuardianChildrenManager.tsx` & `use-guardian-children.ts` | Circular import detected in `scripts/audit-circular-deps.mjs`. | **P1** | Hook and component circularly dependent; breaks modular tree shaking. | Extract `guardian-children.types.ts` to separate type contracts from JSX component. | Small | None | Run circular audit tool; verify 0 cycles between hook and component. | **In Progress** |
| **DEBT-002** | `apps/web/src/store/store.ts` & `apps/web/src/store/base-api.ts` | Circular import between store config and RTK base query. | **P1** | Type circularity between store definition and API query runner. | Extract `store.types.ts` defining `RootState` and `AppDispatch`. | Small | None | Run circular audit tool; verify clean store types. | **In Progress** |
| **DEBT-003** | `apps/api/src/modules/notifications/notification.service.ts` & `notification.gateway.ts` | Bidirectional `@Inject(forwardRef(...))` in NestJS service and gateway. | **P1** | Hard coupling between application service and presentation WebSocket layer. | Introduce `INotificationBroadcaster` interface; decouple service from gateway. | Medium | None | Run API tests; verify notifications dispatch properly with zero `forwardRef`. | **In Progress** |
| **DEBT-004** | `apps/web/src/features/admin/pages/admin-taxonomy-page.tsx` | Monolithic component containing 1,460 lines with 4 entity tables and 4 modals inline. | **P2** | Extreme cognitive load; difficult to maintain or test individual taxonomy domains. | Decompose into `CategorySection`, `SubjectSection`, `GradeSection`, `TrackSection`, and `TaxonomyEntityModal`. | Medium | None | Verify Admin taxonomy page renders and functions with 0 regressions. | **In Progress** |
| **DEBT-005** | `apps/web/src/components/guardian/GuardianChildrenManager.tsx` | Monolithic component containing 999 lines with 4 sub-features inline. | **P2** | Mixed concerns (table rendering, student linking, safety alerts, guarantee claim). | Decompose into `GuardianChildrenTable`, `LinkChildModal`, `EmergencyAlertSettings`, and `ReplacementGuaranteeCard`. | Medium | DEBT-001 | Verify Guardian dashboard renders and tests pass (100%). | **In Progress** |
| **DEBT-006** | `apps/api/src/modules/trust/tutor-replacement.service.ts` | 1,053 lines mixing pure eligibility math, candidate scoring, and database queries. | **P2** | Pure business rules cannot be tested without mocking large TypeORM repositories. | Extract pure business logic into `replacement-policy.util.ts`. | Medium | None | Create unit tests for replacement policy; verify 100% test pass. | **In Progress** |
| **DEBT-007** | `apps/api/src/modules/auth/auth.service.ts` | 1,087 lines mixing brute-force lockout timers, password hashing, and token logic. | **P2** | High cognitive overhead; changes to lockout timers risk regressions in login flow. | Extract pure lockout and token helpers into `auth-policy.util.ts`. | Medium | None | Create unit tests for auth policy; verify auth test suite passes. | **In Progress** |
| **DEBT-008** | Monorepo API Response Envelopes | Legacy endpoints in test mocks occasionally returned unwrapped payloads. | **P2** | Inconsistent envelope parsing on frontend clients. | Standardize all endpoints on canonical `SuccessEnvelope<T>` and `ErrorEnvelope`. | Small | None | Verify `api-contract.spec.ts` passes. | **Resolved** |
| **DEBT-009** | TypeORM Bi-directional Entity Imports | Value imports between parent and child entities in TypeORM decorators. | **P2** | Potential undefined references during asynchronous module loading. | Apply TypeORM lazy relation function standards and type-only imports where appropriate. | Medium | None | Verify database migration and entity tests pass. | **Planned** |
| **DEBT-010** | Unused Import Cleanup | Sporadic unused imports in test files and feature components. | **P3** | Clutters source files; increases diff noise. | Clean up unused imports via oxlint rule enforcement. | Small | None | Run `pnpm lint`; verify 0 warnings and 0 errors. | **Resolved** |
