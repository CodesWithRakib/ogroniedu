# Phase 3 — Payments Package Extraction

**Date:** Day 2 of 7-day sprint  
**Duration:** 1 day  
**Owner:** Backend Lead (payments domain)  

---

## Objective

Extract the payments domain into a dedicated `@ogroniedu/payments` package, isolating provider adapters, ledger logic, and payout services.

---

## Scope

| Task | Description |
|---|---|
| S3.1 | Create `packages/payments/` structure with `src/services/`, `__tests__/`, `index.ts` |
| S3.2 | Move payment adapters into dedicated services: `sslcommerz.adapter.ts`, `bkash.adapter.ts`, `nagad.adapter.ts` |
| S3.3 | Extract `LedgerService` into `packages/payments/src/services/ledger.service.ts` |
| S3.4 | Create contract interfaces: `IPaymentOrder`, `IPayout`, `IRefund`, `IInvoice` in `@ogroniedu/contracts` |
| S3.5 | Update `apps/api/src/modules/payments/` to import from `@ogroniedu/payments` package |
| S3.6 | Move existing payment unit tests into `packages/payments/__tests__/` |
| S3.7 | Run `pnpm turbo run build` — verify zero breakage across all modules |
| S3.8 | Execute payment adapter sandbox tests — confirm provider flow correctness |

---

## Acceptance Criteria

- [ ] `@ogroniedu/payments` package builds successfully
- [ ] All payment provider adapters functional in sandbox mode
- [ ] `LedgerService` exports intact; `settleMilestone` behavior unchanged
- [ ] All payment unit tests pass after package extraction
- [ ] No duplicate code between `apps/api/src/modules/payments/` and `packages/payments/`

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Provider adapter breakage during extraction | Keep adapter logic pure; use contract interfaces; run sandbox tests after each change |
| Ledger invariants violation | Ensure `@ogroniedu/contracts` LedgerService interface unchanged; no DB changes in Phase 3 |

---

*End of Phase 3.*