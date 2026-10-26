# Dependency Direction & Coupling Audit — OgroniEdu (অগ্রণী এডু)

## 1. Audit Methodology

The dependency analysis was performed across all packages in the monorepo using an import graph traversal tool (`scripts/audit-circular-deps.mjs`). The tool parsed ES Module and CommonJS import declarations across 874 TypeScript source files in:

- `apps/api/src`
- `apps/web/src`
- `packages/contracts/src`
- `packages/database/src`

---

## 2. Quantitative Findings

| Package                    | Total Files Analyzed | Circular Cycles Identified | Architectural Severity                                          |
| :------------------------- | :------------------: | :------------------------: | :-------------------------------------------------------------- |
| **`@ogroniedu/contracts`** |          18          |           **0**            | Clean (Zero cycles)                                             |
| **`@ogroniedu/database`**  |          5           |           **0**            | Clean (Zero cycles)                                             |
| **`@ogroniedu/web`**       |         432          |           **2**            | Moderate (1 type cycle, 1 hook-component cycle)                 |
| **`@ogroniedu/api`**       |         419          |           **15**           | High (1 service-gateway cycle, 14 entity bi-directional cycles) |

---

## 3. High-Priority Cycles & Remediation Details

### Cycle 1: `NotificationService` ⇄ `NotificationGateway` (Backend P1)

- **Files**:
  - `apps/api/src/modules/notifications/notification.service.ts`
  - `apps/api/src/modules/notifications/notification.gateway.ts`
- **Mechanism**:
  - `NotificationService` injects `NotificationGateway` with `forwardRef` to broadcast real-time events to connected user sockets (`this.gateway.sendToUser(...)`).
  - `NotificationGateway` injects `NotificationService` with `forwardRef` to handle incoming socket messages (`getUnreadCount`, `markAsRead`).
- **Architectural Risk**:
  - Causes NestJS DI dependency cycle requiring `forwardRef` in both providers.
  - Couples business notification engine directly to Socket.IO gateway.
  - Prevents testing `NotificationService` without mocking or providing the gateway.
- **Remediation**:
  - Define `INotificationBroadcaster` interface with token `'NOTIFICATION_BROADCASTER'`.
  - Have `NotificationGateway` implement `INotificationBroadcaster`.
  - In `NotificationService`, inject the broadcaster interface via the token.
  - Break the forwardRef dependency.

### Cycle 2: `GuardianChildrenManager.tsx` ⇄ `use-guardian-children.ts` (Frontend P1)

- **Files**:
  - `apps/web/src/components/guardian/GuardianChildrenManager.tsx`
  - `apps/web/src/components/guardian/use-guardian-children.ts`
- **Mechanism**:
  - The custom hook `use-guardian-children.ts` imports TypeScript types (`ChildItem`, `GuardianChildrenCallbacks`, `GuardianRelationship`) from the component `GuardianChildrenManager.tsx`.
  - The component `GuardianChildrenManager.tsx` imports the hook `useGuardianChildren` from `use-guardian-children.ts`.
- **Architectural Risk**:
  - Hook and component are circularly bound at compile time.
  - Decomposing the component into sub-components would create further entangled import paths.
- **Remediation**:
  - Extract all shared types into `apps/web/src/components/guardian/guardian-children.types.ts`.
  - Both hook and component import from the types file.

### Cycle 3: `store.ts` ⇄ `base-api.ts` (Frontend P2)

- **Files**:
  - `apps/web/src/store/store.ts`
  - `apps/web/src/store/base-api.ts`
- **Mechanism**:
  - `base-api.ts` imports `type { RootState } from './store'`.
  - `store.ts` imports `baseApi` from `./base-api`.
- **Architectural Risk**:
  - Type-level circular import between Redux store configuration and RTK Query base query.
- **Remediation**:
  - Extract `apps/web/src/store/store.types.ts` defining `RootState` and `AppDispatch`.
  - Both files reference `store.types.ts`.

### Entity Bi-Directional Relations (Backend TypeORM)

- **Files**:
  - `tutor-profile.entity.ts` ⇄ `tutor-qualification.entity.ts`, `tutor-subject.entity.ts`, `tutor-service-area.entity.ts`, `tutor-availability.entity.ts`
  - `assignment.entity.ts` ⇄ `assignment-submission.entity.ts`
  - `lesson-plan.entity.ts` ⇄ `learning-material.entity.ts`
  - `ledger-journal.entity.ts` ⇄ `ledger-entry.entity.ts`
  - `payment-order.entity.ts` ⇄ `payment-transaction.entity.ts`, `payment-refund.entity.ts`
- **Mechanism**:
  - TypeORM `@OneToMany` and `@ManyToOne` decorators pass class functions (`() => TutorQualificationEntity`). At the top of each file, the partner entity class is imported as a value.
- **Remediation Strategy**:
  - In TypeORM, entity relations are evaluated at bootstrap. Where circular value imports threaten runtime evaluation, utilize TypeORM string-based entity references or relation type wrappers (`import type { Relation } from 'typeorm'`).
