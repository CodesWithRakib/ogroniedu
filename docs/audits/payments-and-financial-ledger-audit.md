# Phase 11 — Payments and Financial Ledger Audit Report

**Date of Audit:** 2026-10-10 14:55:00 BST  
**Auditor:** Principal Financial Systems Architect & Lead Backend Engineer (AI Pair Programmer)  
**Project:** OgroniEdu — Enterprise Tutoring and Educational Management Platform (Bangladesh)  
**Repository Working Directory:** `c:\Sofof_tech_2026\ogroniedu`  
**Phase Objective:** Implement sandbox provider integration (bKash/Nagad/SSLCOMMERZ), digital checkout order lifecycle, cryptographically verified callbacks, immutable double-entry financial ledger with strict debit-credit mathematical invariants, milestone escrow accounting (92% tutor payable / 8% platform fee), operational refund bounds checking, printable receipts, and financial reconciliation audit.

---

## 1. Executive Summary

Phase 11 successfully implemented the financial core and payment processing infrastructure for OgroniEdu in strict alignment with `prompts/11-payments-and-financial-ledger.md`:

1. **Definition of Done Enforced — "No live money until provider/business/accounting approvals":**
   - The payment module is permanently locked to **Sandbox Simulation Mode** (`PROVIDER_SANDBOX_MODE=true`).
   - Live merchant API keys, production settlement credentials, and automated bank disbursement are strictly held behind formal accounting and business sign-offs.
2. **Strict Security Invariant — "No success based on redirect":**
   - Payment order completion and booking confirmation can **never** be triggered by client-side browser redirects or frontend URL query parameters.
   - The state transition to `succeeded` is exclusively performed when a server-to-server webhook callback passes cryptographic signature validation (HMAC-SHA256) and provider query verification matching the exact pending order amount.
3. **Double-Entry Financial Ledger Invariant (`SUM(debits) = SUM(credits)`):**
   - Implemented an immutable, zero-rounding double-entry ledger in `packages/database/src/migrations/004_payments_and_ledger.sql` storing all monetary figures in minor units (poisha = BDT * 100) using 64-bit integer arithmetic (`BigInt`).
   - Every ledger journal posting asserts that total debits strictly equal total credits. Any unbalanced posting throws an immediate `BadRequestException` and aborts the database transaction.
   - Enforced both at application service level (`LedgerService`) and database level via PL/pgSQL function `verify_ledger_journal_balance(p_journal_id)`.
4. **Milestone Escrow & Platform Commission Accounting (92% / 8%):**
   - Upon payment, funds are held in advance escrow:
     - `Debit: 1000 Escrow Holding Pool (+Asset)`
     - `Credit: 2100 Student Advance Escrow Deposit (+Liability)`
   - Upon session milestone completion, escrow is settled into tutor payable liability and platform revenue:
     - `Debit: 2100 Student Advance Escrow Deposit (-Liability)`
     - `Credit: 2000 Tutor Earnings Payable Liability (+Liability) -> 92%`
     - `Credit: 4000 Tutoring Platform Service Fee Revenue (+Revenue) -> 8%`
5. **Operational Refunds with Strict Balance Bounds Checking:**
   - Operational refunds are capped to the total paid order amount. Attempting to refund more than the paid balance throws `400 BadRequestException`.
   - Refunds post balanced reversal journals (`Debit 2100`, `Credit 1000`) and emit outbox event `refund.processed`.
6. **Financial Reconciliation Audit:**
   - Implemented `runReconciliation()` comparing all payment orders, provider transactions, and ledger balances.
   - Flags any order marked `succeeded` that lacks a verified transaction record, and flags any unbalance in system ledger accounts.
7. **Frontend UI & Localization:**
   - Built [`PaymentCheckoutView`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/src/components/payments/PaymentCheckoutView.tsx) with order summary, MFS gateway selectors (bKash, Nagad, SSLCOMMERZ), escrow accounting breakdown, sandbox disclaimer banner, and printable receipts.
   - Routed at `/[locale]/payments` in [`apps/web/src/app/[locale]/(dashboard)/payments/page.tsx`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/src/app/[locale]/(dashboard)/payments/page.tsx).
   - Added `"payments"` namespace with 25 keys to both `messages/en.json` and `messages/bn.json` with 100% key parity and Bengali digit support.
8. **Automated Verification:**
   - 34 new tests added across API, database, and web packages.
   - Full monorepo test suite stands at **274 passed tests, 0 failures, 0 skipped**.

---

## 2. Requirement Traceability Matrix (Phase 11 Scope)

| Requirement ID | Requirement Name | Implementation Files | Test Suite | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **FR-010** | **Gateway Checkout & Double-Entry Ledger** | `apps/api/src/modules/payments/payments.service.ts`<br>`apps/api/src/modules/payments/ledger.service.ts`<br>`apps/api/src/modules/payments/payments.controller.ts`<br>`apps/web/src/components/payments/PaymentCheckoutView.tsx`<br>`apps/web/src/app/[locale]/(dashboard)/payments/page.tsx` | `ledger.service.spec.ts`<br>`payments.service.spec.ts`<br>`payments.controller.spec.ts`<br>`payments.spec.ts`<br>`migration.spec.ts` | **COMPLETED & VERIFIED** |
| **NFR-001** | **No Cross-User Data Access (Ownership Checks)** | `payments.service.ts` (`payerUserId`, `guardianUserId` validation) | `payments.service.spec.ts`<br>`payments.controller.spec.ts` | **COMPLETED & VERIFIED** |
| **NFR-002** | **Concurrency & Idempotency** | `PaymentOrderEntity.idempotencyKey`<br>`LedgerJournalEntity.idempotencyKey`<br>`PaymentTransactionEntity.providerEventId` | `ledger.service.spec.ts`<br>`payments.service.spec.ts` | **COMPLETED & VERIFIED** |
| **NFR-004** | **Bilingual Bengali & English** | `apps/web/messages/en.json`<br>`apps/web/messages/bn.json` | `i18n.spec.ts`<br>`payments.spec.ts` | **COMPLETED & VERIFIED (100% Key Parity)** |

---

## 3. Database Schema & Migration Changes

### Migration File: `packages/database/src/migrations/004_payments_and_ledger.sql`

```sql
-- Phase 11: Payments and Double-Entry Financial Ledger Migration

-- 1. Create payment_refunds table
CREATE TABLE IF NOT EXISTS payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_order_id UUID NOT NULL REFERENCES payment_orders(id) ON DELETE RESTRICT,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'approved', 'rejected')),
  provider_refund_id VARCHAR(100),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  processed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_order ON payment_refunds(payment_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_status ON payment_refunds(status);

-- 2. Verify Double-Entry Ledger Journal Balance Function
CREATE OR REPLACE FUNCTION verify_ledger_journal_balance(p_journal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_debits BIGINT;
  v_credits BIGINT;
BEGIN
  SELECT
    COALESCE(SUM(amount_minor) FILTER (WHERE direction = 'debit'), 0),
    COALESCE(SUM(amount_minor) FILTER (WHERE direction = 'credit'), 0)
  INTO v_debits, v_credits
  FROM ledger_entries
  WHERE journal_id = p_journal_id;

  IF v_debits != v_credits THEN
    RAISE EXCEPTION 'Ledger journal % is unbalanced: debits (%) != credits (%)',
      p_journal_id, v_debits, v_credits;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Double-Entry Accounting Treatment & Ledger Chart of Accounts

The chart of accounts in `ledger_accounts` follows standard double-entry bookkeeping:

| Account Code | Account Name | Type | Normal Balance | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **1000** | Escrow Holding Pool | Asset | Debit | Digital wallet funds held in trust with payment provider / bank |
| **2000** | Tutor Earnings Payable | Liability | Credit | Accrued balance owed to tutors upon milestone completion |
| **2100** | Student Advance Escrow Deposit | Liability | Credit | Advance tuition funds collected from students awaiting lesson delivery |
| **4000** | Tutoring Platform Service Fee | Revenue | Credit | 8% non-refundable platform commission on completed tutoring sessions |

### Journal Posting 1: Initial Payment Succeeded (Advance Escrow Deposit)
- `Debit 1000 (Escrow Holding Pool)`: +100,000 poisha (৳1,000.00)
- `Credit 2100 (Student Advance Escrow Deposit)`: +100,000 poisha (৳1,000.00)
- **Net Invariant Check:** 100,000 Debits = 100,000 Credits. Difference: 0.

### Journal Posting 2: Session Milestone Settlement (Lesson Delivered)
- `Debit 2100 (Student Advance Escrow Deposit)`: -100,000 poisha (Escrow liability cleared)
- `Credit 2000 (Tutor Earnings Payable)`: +92,000 poisha (৳920.00 - 92% tutor payout liability)
- `Credit 4000 (Tutoring Platform Service Fee)`: +8,000 poisha (৳80.00 - 8% platform revenue)
- **Net Invariant Check:** 100,000 Debits = 92,000 + 8,000 Credits. Difference: 0.

### Journal Posting 3: Operational Refund
- `Debit 2100 (Student Advance Escrow Deposit)`: -100,000 poisha (Liability reduced)
- `Credit 1000 (Escrow Holding Pool)`: -100,000 poisha (Asset reduced)
- **Net Invariant Check:** 100,000 Debits = 100,000 Credits. Difference: 0.

---

## 5. Automated Verification Results

### Test Suite Execution Summary
- **Database Package:** 10 passed, 0 failed (`pnpm --filter @ogroniedu/database test`)
- **API Package:** 223 passed, 0 failed across 25 test files (`pnpm --filter @ogroniedu/api test`)
- **Web Package:** 41 passed, 0 failed across 10 test files (`pnpm --filter @ogroniedu/web test`)
- **Total Monorepo Tests:** **274 passed, 0 failed, 0 skipped**.

### Specific Negative & Security Test Cases Verified

1. **Negative Test: Invalid Signature Webhook Rejection (`payments.service.spec.ts`)**
   - Submitting a webhook callback with an invalid HMAC-SHA256 signature immediately throws `401 UnauthorizedException` and does not mutate the order or post to the ledger.
2. **Negative Test: Amount Mismatch Webhook Rejection (`payments.service.spec.ts`)**
   - Submitting a webhook with an amount different from the pending order (e.g. 50,000 vs 100,000 poisha) throws `400 BadRequestException` and aborts.
3. **Idempotency Replay Test: Duplicate Webhook Events (`payments.service.spec.ts`)**
   - Re-sending the same `providerEventId` returns `{ received: true, duplicate: true }` without double-posting to the financial ledger.
4. **Negative Test: Unrelated Learner Checkout Rejection (`payments.service.spec.ts`)**
   - Attempting to initiate payment on a booking belonging to another student/requester throws `403 ForbiddenException`.
5. **Negative Test: Already Paid Booking Rejection (`payments.service.spec.ts`)**
   - Initiating payment on an already confirmed booking throws `400 BadRequestException`.
6. **Financial Invariant: Unbalanced Ledger Entry Rejection (`ledger.service.spec.ts`)**
   - Posting a journal where Debits != Credits (e.g. 10,000 debits vs 9,000 credits) throws `BadRequestException: Ledger journal is unbalanced: total debits (10000) != total credits (9000)`.
7. **Negative Test: Zero or Negative Minor Units Rejection (`ledger.service.spec.ts`)**
   - Attempting to post an entry with 0 or negative poisha throws `BadRequestException`.
8. **Negative Test: Unknown Account Code Rejection (`ledger.service.spec.ts`)**
   - Attempting to post to an unlisted account code (e.g. `9999`) throws `NotFoundException`.
9. **Negative Test: Refund Exceeding Paid Balance (`payments.service.spec.ts`)**
   - Requesting a refund greater than the available balance throws `BadRequestException: Refund amount exceeds available balance`.
10. **Financial Reconciliation Audit Test (`payments.service.spec.ts`)**
    - Verifies that `runReconciliation()` detects and flags any succeeded order lacking a verified transaction record and confirms balanced ledger status.

---

## 6. Execution Commands & Outcomes

```bash
# 1. Database Migrations & Integrity Tests
pnpm --filter @ogroniedu/database test
# Outcome: 10 passed (10) in 2.54s

# 2. API Ledger, Payment Services & Controllers Tests
pnpm --filter @ogroniedu/api test
# Outcome: 223 passed (223) across 25 test files in 14.58s

# 3. Web UI Component & Dictionary Parity Tests
pnpm --filter @ogroniedu/web test
# Outcome: 41 passed (41) across 10 test files in 2.33s

# 4. Monorepo TypeScript Compilation
pnpm typecheck
# Outcome: 6 successful, 6 total in 2.962s

# 5. Web Production Build (Turbopack)
pnpm --filter @ogroniedu/web build
# Outcome: Compiled successfully in 8.3s, static & dynamic routes generated (/[locale]/payments)

# 6. Documentation Integrity Verification
node scripts/validate-documentation.js
# Outcome: PASSED - Successfully verified 125 Markdown, Mermaid, and SQL files
```

---

## 7. Blockers, Risks & Next Phase Transition

- **Zero Critical Blockers:** All requirements, database constraints, business invariants, security policies, and UI elements for Phase 11 are verified and passing.
- **Controlled Operational Risk (Live Money Protection):** In accordance with the Definition of Done, no real financial transactions can occur until live merchant agreements with bKash/Nagad and commercial bank escrow approval are signed off.
- **Phase 12 Preparedness:** Ready to advance to Phase 12 (Disputes, Trust & Safety, and Tutor Replacement Guarantee).
