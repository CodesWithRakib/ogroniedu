# Phase 02 — Frontend Modularization & Thin Route Refactoring

**Phase ID:** `PHASE-02`  
**Phase Name:** Frontend Modularization & Thin Route Refactoring  
**Estimated Effort:** 1.5 Days (Day 3)  
**Status:** READY  
**Owner:** Frontend Lead & UI/UX Architect

---

## 1. Objective and Business Justification
Enforce the core architectural rule: *"Route Pages Must Remain Thin"* (Part V Rule 14) and *"frontend amon file bad jabe na sob file ei amra kaj korbo"*. Route `page.tsx` files must not contain monolithic UI, state machines, or direct data fetching logic; they must act as thin Server Component wrappers delegating to feature-based views.

---

## 2. Current-State Findings and Evidence
- 11 Next.js `page.tsx` files contain monolithic implementations (300 to 829 lines):
  - `bookings/[id]/page.tsx` (829 lines)
  - `guardian/children/[studentId]/page.tsx` (728 lines)
  - `sessions/[id]/page.tsx` (634 lines)
  - `assignments/[id]/page.tsx` (577 lines)
  - `bookings/[id]/pay/page.tsx` (575 lines)
  - `admin/replacements/[id]/page.tsx` (435 lines)
  - `organization/page.tsx` (383 lines)
  - `assignments/[id]/submissions/page.tsx` (382 lines)
  - `admin/organizations/page.tsx` (341 lines)
  - `organization/members/page.tsx` (307 lines)
  - `tutor-replacements/page.tsx` (303 lines)
- Monolithic navigation module: `apps/web/src/lib/navigation.ts` (853 lines).
- Oversized feature views: `tutor-details-page.tsx` (1,076 lines), `profile-page.tsx` (1,050 lines), `admin-finance-page.tsx` (964 lines), `GuardianChildrenManager.tsx` (953 lines).

---

## 3. Exact Scope
1. Refactor the 11 oversized `page.tsx` files into thin route entry points (<40 lines) delegating to modular feature components in `src/features/<domain>/components/`.
2. Decompose `src/lib/navigation.ts` into role-specific navigation configurations (`student.nav.ts`, `tutor.nav.ts`, `guardian.nav.ts`, `admin.nav.ts`, `org.nav.ts`).
3. Modularize the top oversized feature views (`tutor-details-page.tsx`, `profile-page.tsx`, `admin-finance-page.tsx`, `GuardianChildrenManager.tsx`).
4. Audit and enforce Server Component vs Client Component leaf boundaries.
5. Verify that all 88 routes build cleanly and pass visual QA.

---

## 4. Explicit Exclusions
- No alteration of visual branding, colors, or CSS framework (keep Tailwind CSS v4 and shadcn/ui primitives).
- No changes to API endpoints or backend contracts.

---

## 5. Prerequisite Phases
- `PHASE-01-ARCHITECTURE-AND-TDD-FOUNDATION.md` (Green test suite baseline).

---

## 6. Tasks and Unique Task IDs
- `FE-001`: Decompose `bookings/[id]/page.tsx` (829 lines) into `src/features/bookings/components/detail/*`.
- `FE-002`: Decompose `guardian/children/[studentId]/page.tsx` (728 lines) into `src/features/guardian/components/child-detail/*`.
- `FE-003`: Decompose `sessions/[id]/page.tsx` (634 lines) into `src/features/bookings/components/session-detail/*`.
- `FE-004`: Decompose `assignments/[id]/page.tsx` (577 lines) into `src/features/learning/components/assignment-detail/*`.
- `FE-005`: Decompose `bookings/[id]/pay/page.tsx` (575 lines) into `src/features/payments/components/checkout/*`.
- `FE-006`: Modularize `src/lib/navigation.ts` (853 lines) into `src/lib/navigation/*`.
- `FE-007`: Modularize `tutor-details-page.tsx` (1,076 lines) into subcomponents.
- `FE-008`: Decompose `admin/replacements/[id]/page.tsx` (435 lines).
- `FE-009`: Decompose `organization/page.tsx` (383 lines).
- `FE-010`: Decompose `assignments/[id]/submissions/page.tsx` (382 lines).
- `FE-011`: Decompose `admin/organizations/page.tsx` (341 lines).
- `FE-012`: Decompose `organization/members/page.tsx` (307 lines).
- `FE-013`: Decompose `tutor-replacements/page.tsx` (303 lines).
- `FE-014`: Modularize `profile-page.tsx` (1,050 lines).
- `FE-015`: Modularize `admin-finance-page.tsx` (964 lines).
- `FE-016`: Modularize `GuardianChildrenManager.tsx` (953 lines).

---

## 7. Actual Affected Files and Modules
- `apps/web/src/app/[locale]/**/*.tsx`
- `apps/web/src/features/**/*.tsx`
- `apps/web/src/lib/navigation.ts`
- `apps/web/src/components/guardian/GuardianChildrenManager.tsx`

---

## 8. Files Created, Split, Moved, or Removed
- Created: Feature component subdirectories under `src/features/bookings/components/detail/`, `src/features/guardian/components/child-detail/`, `src/features/learning/components/assignment-detail/`, `src/features/payments/components/checkout/`.
- Decomposed: 11 oversized `page.tsx` files.

---

## 9. Frontend Work
- Extract UI elements into focused, reusable presentation components.
- Keep route `page.tsx` files strictly responsible for parameter parsing, SEO metadata generation, and initial access checks.
- Keep Client Component directives (`"use client"`) at interactive leaf components.

---

## 10. Backend Work
- None (frontend architectural refactoring).

---

## 11. Database and Migration Work
- None.

---

## 12. Event-Driven Architecture Work
- None.

---

## 13. Security Requirements
- Ensure zero server credentials or private tokens are leaked to client components.
- Ensure role layout authorization checks are preserved on all routes.

---

## 14. Unit Test Requirements
- `pnpm --filter @ogroniedu/web test` passes 308/308 tests.

---

## 15. Integration Test Requirements
- RTK Query slice integration tests pass.

---

## 16. Browser Automation and E2E Scenarios
- Playwright tests (`journey.booking.spec.ts`, `tutor.discovery.spec.ts`) pass without DOM selector breaks.
- Automated visual inspection using Chrome DevTools MCP on port 5000.

---

## 17. Required Commands
```pwsh
pnpm --filter @ogroniedu/web build
pnpm --filter @ogroniedu/web test
pnpm --filter @ogroniedu/web lint
```

---

## 18. Acceptance Criteria
1. Zero `page.tsx` files exceed 50 lines.
2. All 88 routes compile and render cleanly with zero TypeScript errors.
3. All 308 web unit tests pass.
4. Navigation configurations are cleanly modularized by role.

---

## 19. Failure and Rollback Considerations
- Work is executed page-by-page. Each page decomposition is committed atomically with regression tests.

---

## 20. Definition of Done
- All 11 oversized pages decomposed, builds clean, tests pass, visual QA verified.

---

## 21. Expected Evidence
- Git diff showing thin `page.tsx` files and organized feature component trees.

---

## 22. Known Risks and Blockers
- Component selector changes could affect Playwright E2E tests if test IDs or classes change. Preserve existing `data-testid` attributes.

---

## 23. Estimated Effort
- 1.5 Days.

---

## 24. Next-Phase Dependencies
- Unblocks `PHASE-07-CORE-MARKETPLACE-AND-BOOKINGS-WORKFLOW.md`.
