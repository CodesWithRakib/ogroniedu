# Payments Test Plan and Evidence (Phase 05)

**Date:** 2026-10-20
**Scope:** Unit, service, controller, RBAC, integration-style and project-wide
tests for payments, escrow, refunds, payouts, invoices and reconciliation.
**Prerequisite reading:** [Implementation plan](IMPLEMENTATION_PLAN.md),
[Security and reconciliation](SECURITY_AND_RECONCILIATION.md).

---

## 1. Strategy

The money domain is tested at four levels:

1. **Pure unit tests** for arithmetic and state invariants
   (`money.spec.ts`, `ledger.service.spec.ts`).
2. **Service tests** with mocked repositories and transactions
   (`payments.service.spec.ts`, `refunds.service.spec.ts`,
   `payouts.service.spec.ts`, `invoices.service.spec.ts`,
   `commission-policy.service.spec.ts`).
3. **Contract/controller and RBAC tests**
   (`payments.controller.spec.ts`, `finance-rbac.spec.ts`).
4. **Cross-domain lifecycle tests** that exercise payment → booking → session →
   refund/payout interactions with the new wiring
   (`e2e-tutoring-lifecycle.spec.ts`, `idempotency.spec.ts`).

The tests assert **behaviour that protects money**: no fabricated success, no
overdraw, no double posting, no unauthorized access, no client-trusted amount.
They do not assert provider behaviour that cannot be observed without
credentials.

## 2. Test inventory

### 2.1 Money and ledger

| File                                   | Coverage                                                                                                                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/test/money.spec.ts`          | Exact BDT parsing, two-decimal rendering, rejection of fractions/negatives, floor commission with remainder to tutor, bps application, account masking and hashing, grouped formatting |
| `apps/api/test/ledger.service.spec.ts` | Balanced journal posting, rejection of unbalanced/zero/unknown-account legs, idempotent replay, concurrent unique-race collapse, account and party balances, system integrity          |
| `apps/api/test/idempotency.spec.ts`    | Order idempotency and payload mismatch, journal idempotency, durable webhook event dedupe without money mutations                                                                      |

### 2.2 Orders, webhooks, settlement, reconciliation

| File                                        | Coverage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/test/payments.service.spec.ts`    | Commission snapshot at order creation; provider reference; booking ownership; already-confirmed/already-funded rejection; success webhook posts escrow, invoice, booking confirmation and outbox; duplicate event ignored; invalid signature rejected before persistence; replay window; amount mismatch; failed server-to-server verification; provider-amount mismatch; settlement splits commission from the hold snapshot and credits the tutor party; settlement refuses more than the hold remaining; receipt uses real names and invoice number; reconciliation flags missing transaction and paid payout without reference |
| `apps/api/test/payments.controller.spec.ts` | Wrapped 201 order response; raw body forwarded to webhook; refund request never claims success; record-scoped refund reads; settlement; receipt; JSON invoice; printable HTML locale; sandbox confirmation is 410                                                                                                                                                                                                                                                                                                                                                                                                                  |

### 2.3 Refunds

| File                                    | Coverage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/test/refunds.service.spec.ts` | Request creates eligibility snapshot and moves no money; cumulative refundable bound; customer blocked after tutor release; finance can open on unreleased remainder; unrelated user denied; non-succeeded payment rejected; approve/reject transitions; already-succeeded cannot be re-decided; provider `unsupported` does not mark succeeded; manual confirmation requires a real reference; confirmation posts `2100 → 1000`, updates the hold and outbox; confirmation refuses to consume released/reserved money; provider failure posts no journal; record scoping for requester/unrelated/admin |

### 2.4 Payouts

| File                                    | Coverage                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/test/payouts.service.spec.ts` | Reservation against ledger-derived payable; above-available rejection; minimum policy; idempotent replay; approve; reject releases reservation; external reference required before `mark-paid`; payable re-check prevents overdraw; `2000 → 1100` journal only on paid; failure releases reservation; cross-tutor read denied; tutor summary derived from settlements, ledger and payouts |

### 2.5 Invoices and commission policy

| File                                              | Coverage                                                                                                                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/test/invoices.service.spec.ts`          | Sequence-based number inside the transaction; repeated payment reuses invoice; payer/student/admin access; unrelated user denied; missing invoice; HTML escaping and BDT totals; Bangla variant |
| `apps/api/test/commission-policy.service.spec.ts` | Active policy resolution; version creation deactivates the previous version; cap enforcement; audit; historical orders keep snapshots                                                           |

### 2.6 Authorization

| File                                                   | Coverage                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/test/finance-rbac.spec.ts`                   | Admin finance controller metadata is `admin`/`super_admin`; tutor controller is `tutor`; admin/super allowed; student, tutor, guardian, support, compliance and organization roles denied; role-less denied; tutor-only route denies student; route delegation for refunds, payouts, reconciliation, ledger balance and commission policy |
| `apps/api/test/security-and-privacy-hardening.spec.ts` | Patched for the new finance guards and route placement; confirms no unauthenticated finance mutation                                                                                                                                                                                                                                      |

### 2.7 Cross-domain

| File                                           | Coverage                                                                                                                                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/test/e2e-tutoring-lifecycle.spec.ts` | Booking acceptance → payment order → verified webhook → confirmed booking; session completion → settlement; refund request/decision flow; payout request and finance actions with the new services |
| `apps/api/test/admin-operations.spec.ts`       | Administrative cancellation and refund queue behavior after the refund workflow rewrite                                                                                                            |
| `packages/database/test/bcdr-recovery.spec.ts` | Migration replay from scratch includes `022_payments_escrow_payouts.sql`; 22 migrations; ledger seeds intact                                                                                       |

### 2.8 Frontend

| File                                     | Coverage                                                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/test/payments.spec.ts`         | Payment checkout rendering in both locales; translation key parity; currency/Bengali digit formatting; 92/8 split arithmetic invariant |
| `apps/web/test/store.spec.ts`            | RTK Query endpoint definitions include the real finance endpoints, not mock-only handlers                                              |
| `apps/web/test/api-contract.spec.ts`     | Error envelope parsing and shared formatter regressions used by finance screens                                                        |
| `apps/web/test/admin-operations.spec.ts` | Admin dashboard and existing finance-adjacent admin views still render with real-shaped data                                           |

There is **no automated component test** that mounts the new
`TutorEarningsPage` or `AdminFinancePage` and asserts their loading/error states.
Those pages are covered by typecheck, lint, build and the API contract they call.
This is a known gap; see section 6.

## 3. Commands

```bash
# Focused payments suites
pnpm --filter @ogroniedu/api test -- money.spec.ts ledger.service.spec.ts
pnpm --filter @ogroniedu/api test -- payments.service.spec.ts refunds.service.spec.ts
pnpm --filter @ogroniedu/api test -- payouts.service.spec.ts invoices.service.spec.ts
pnpm --filter @ogroniedu/api test -- finance-rbac.spec.ts idempotency.spec.ts

# Full packages
pnpm --filter @ogroniedu/api test
pnpm --filter @ogroniedu/web test
pnpm --filter @ogroniedu/database test

# Static and build
pnpm typecheck
pnpm lint
pnpm build
pnpm docs:validate
```

Database migrations:

```bash
pnpm --filter @ogroniedu/database build
pnpm db:migrate
```

## 4. Expected evidence per invariant

| Invariant                                    | Test evidence                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Amounts come from the server                 | `payments.service.spec.ts` order creation uses booking price; controller rejects no client price path                     |
| Debits equal credits                         | `ledger.service.spec.ts`, `money.spec.ts`, `payments.service.spec.ts` settlement                                          |
| No double posting                            | `idempotency.spec.ts`, `payments.service.spec.ts` duplicate webhook, refund/payout idempotency                            |
| No refund above escrow                       | `refunds.service.spec.ts` cumulative and hold-bound cases                                                                 |
| No payout overdraw                           | `payouts.service.spec.ts` available-balance and payable re-check                                                          |
| No fabricated provider success               | `refunds.service.spec.ts` unsupported case, `payments.service.spec.ts` failed S2S, adapters return `unsupported`/`failed` |
| Record-level authorization                   | `refunds.service.spec.ts`, `payouts.service.spec.ts`, `invoices.service.spec.ts`, `payments.service.spec.ts`              |
| Finance roles only                           | `finance-rbac.spec.ts`                                                                                                    |
| Booking confirms only after verified payment | `payments.service.spec.ts`, `e2e-tutoring-lifecycle.spec.ts`                                                              |
| Reconciliation detects gaps                  | `payments.service.spec.ts` reconciliation cases                                                                           |

## 5. Results

Results are recorded from the final validation run in
[IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md). The report is the
authoritative record; do not copy stale counts into this plan.

At the time of writing, the last full local runs were:

- API: 72 files / 735 tests passing.
- Web: 33 files / 208 tests passing.
- Database: 4 files / 33 tests passing.
- API and web typecheck and lint passing.

## 6. Limitations and unverified paths

These are **not** covered by automated tests and must not be presented as
verified:

1. **Live provider payment.** No SSLCOMMERZ/bKash credentials or registered
   callbacks. Signature compatibility with real SSLCOMMERZ IPN payloads is
   unverified; the adapter's HMAC contract is exercised only by test fixtures.
2. **Live provider refund.** Both adapters return `unsupported`; the automated
   refund path has never moved real money.
3. **Live payout.** No provider disbursement API exists. The manual workflow is
   tested at the service level, but no real transfer is executed.
4. **Database-level concurrency.** Repository mocks simulate locks; there is no
   `DB_INTEGRATION=1` test that opens two real PostgreSQL transactions and
   proves row-lock serialization for refund/payout. The unique constraints and
   lock calls are present, but true database contention is unverified.
5. **Frontend finance pages.** No component/E2E test mounts the new tutor
   earnings or admin finance pages; loading, empty and error states are not
   asserted in a browser.
6. **PDF invoices.** Not implemented; only printable HTML is tested.
7. **Provider settlement/fee reconciliation.** No provider settlement feed, so
   gateway fees and chargebacks are untested and unrecorded.
8. **Dispute window and cancellation percentages.** Policy-only; no scheduler or
   calculation tests because no implementation exists.

## 7. Manual verification checklist

Before approving Phase 05:

- [ ] Apply migration 022 to a clean database and confirm 22 migrations.
- [ ] Seed ledger accounts and confirm `2200` exists exactly once.
- [ ] Create an order and verify the amount equals the booking session price.
- [ ] Send a webhook with an invalid signature → `401`, no event row.
- [ ] Send a duplicate valid event → `processed: false`, one journal.
- [ ] Send an amount-mismatched event → rejected, no order success.
- [ ] Confirm the booking becomes `confirmed` only after the verified event.
- [ ] Settle a completed session → check hold released, tutor payable, revenue.
- [ ] Request a partial refund → approve → process (expect unsupported) →
      confirm manual with a test reference → check hold and journal.
- [ ] Request a payout → approve → mark paid with a test reference → check
      `2000 → 1100` and reservation release.
- [ ] Run reconciliation → `reconciled`, zero discrepancies.
- [ ] Sign in as each of the nine roles and confirm the finance routes deny or
      allow exactly as [ROLE_PERMISSION_MATRIX.md](ROLE_PERMISSION_MATRIX.md)
      states.
