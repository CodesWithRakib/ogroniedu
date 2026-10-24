# Phase 2 — Auth Package Extraction

**Date:** Day 1 of 7-day sprint  
**Duration:** 1 day  
**Owner:** Backend Lead (auth domain)  

---

## Objective

Extract the auth domain into a dedicated `@ogroniedu/auth` package, preserving all existing functionality while improving modularity and testability.

---

## Scope

| Task | Description |
|---|---|
| S2.1 | Create `packages/auth/` structure: `src/`, `__tests__/`, `index.ts`, `package.json`, `tsconfig.json` |
| S2.2 | Move `AuthService`, `AccountAccessService`, JWT utility functions into `packages/auth/src/services/` |
| S2.3 | Extract interfaces: `IAuthService`, `IUser`, `IJwtService` into `@ogroniedu/contracts/src/auth.ts` |
| S2.4 | Update `apps/api/src/modules/auth/` to import from `@ogroniedu/auth` instead of co-locating services |
| S2.5 | Move existing unit tests from `apps/api/src/modules/auth/__tests__/` to `packages/auth/__tests__/` |
| S2.6 | Run `pnpm turbo run build` — verify zero breakage |
| S2.7 | Run all auth tests — confirm 100% pass |

---

## Acceptance Criteria

- [ ] `@ogroniedu/auth` builds successfully
- [ ] All auth unit tests pass (imported correctly by consumers)
- [ ] No `class-validator` dependency retained in auth package (move validation logic into contracts)
- [ ] Account access checks (blocked/suspended/deactivated) unchanged behavior
- [ ] JWT generation and verification unchanged behavior

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Circular dependency between auth and contracts | Contracts depend only on Prisma; auth depends only on contracts |
| Test import path changes | Barrel exports in `packages/auth/index.ts` simplify consumer imports |

---

*End of Phase 2.*
