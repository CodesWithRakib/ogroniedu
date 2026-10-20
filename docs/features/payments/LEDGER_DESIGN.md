# Ledger Design (Phase 05)

**Date:** 2026-10-20
**Scope:** `ledger_accounts`, `ledger_journals`, `ledger_entries`, and the
services that post to them.
**Prerequisite reading:** [../../14-payments-and-ledger.md](../../14-payments-and-ledger.md),
[PAYMENT_STATE_MACHINE.md](PAYMENT_STATE_MACHINE.md).

The ledger is the accounting source of truth for escrow, tutor payable, platform
revenue and disbursement. No screen or cached column may override it.

---

## 1. Chart of accounts

Seeded in `packages/database/src/seeds/initial_seed.ts`; account `2200` is added
by migration `022`. All accounts are BDT.

| Code   | Name                                                 | Type      | Normal balance | Used by                                               |
| ------ | ---------------------------------------------------- | --------- | -------------- | ----------------------------------------------------- |
| `1000` | Escrow Holding Pool (bKash/Nagad/Bank)               | asset     | debit          | Verified payment debit; refund credit                 |
| `1100` | Platform Operating Bank Account                      | asset     | debit          | Payout credit                                         |
| `2000` | Tutor Earnings Payable Liability                     | liability | credit         | Tutor net credit (party-scoped); payout debit         |
| `2100` | Student Advance Escrow Deposit Liability             | liability | credit         | Payment credit; settlement/refund debit               |
| `2200` | Tutor Payouts In Transit                             | liability | credit         | Seeded for asynchronous payouts; **not posted today** |
| `3000` | Platform Capital / Retained Earnings                 | equity    | credit         | Seeded; not used by Phase 05 flows                    |
| `4000` | Tutoring Platform Service Fee Revenue                | revenue   | credit         | Commission credit at settlement                       |
| `5000` | Mobile Financial Services (MFS) Gateway Fees Expense | expense   | debit          | Seeded; provider fees are not yet recorded            |

`ledger_entries.tutor_user_id` is the party dimension. It is nullable because
platform-level legs (cash, escrow liability, revenue) have no tutor party.
Tutor payable is therefore derived from entries on `2000` filtered by party.
It is never stored in a mutable wallet column.

## 2. Posting rules

`LedgerService.postJournal(params, manager?)`:

1. Requires at least two legs, each with a strictly positive integer amount.
2. Computes `totalDebits` and `totalCredits` in `bigint` and rejects the journal
   unless they are equal.
3. Resolves every account code from the active catalog; an unknown or inactive
   account aborts the journal.
4. Returns an existing journal when `idempotency_key` already exists.
5. Participates in a caller-supplied `EntityManager` transaction, so the
   business row and the journal commit or roll back together.
6. On a unique-key race, re-reads and returns the winning journal instead of
   posting a second one.

`ledger_journals` and `ledger_entries` are append-only. No update or delete path
exists in application code. Corrections must be posted as new, balanced
journals that reverse the original effect.

## 3. Journal catalogue

| Flow                | Source type         | Idempotency key                         | Debit                        | Credit                                       |
| ------------------- | ------------------- | --------------------------------------- | ---------------------------- | -------------------------------------------- |
| Verified payment    | `payment_order`     | `ledger:payment:{orderId}`              | `1000` full amount           | `2100` full amount                           |
| Session settlement  | `session_milestone` | `ledger:settlement:session:{sessionId}` | `2100` gross                 | `2000` tutor net (party) + `4000` commission |
| Refund              | `payment_refund`    | `ledger:refund:{refundId}`              | `2100` refund amount         | `1000` refund amount                         |
| Payout disbursement | `payout`            | `ledger:payout:{payoutId}`              | `2000` payout amount (party) | `1100` payout amount                         |

Each journal is balanced by construction:

- Payment: one debit leg equals one credit leg.
- Settlement: `2100` debit = gross; credits sum to `net + fee`, and
  `net + fee = gross`.
- Refund: one debit leg equals one credit leg.
- Payout: one debit leg equals one credit leg.

### 3.1 Why settlement is not revenue at payment time

At payment, the platform holds customer money and owes either a service
(`2100` liability) or a refund. No revenue is recognised. Revenue is recognised
only when a completed session is settled, and only for the commission portion.

### 3.2 Why refunds are not "reverse the payment journal"

A refund is a new economic event. It debits the remaining escrow liability and
credits the escrow asset. Historical payment journals remain intact, which keeps
the audit trail and reconciliation reproducible.

### 3.3 Payouts in transit

The current payout path is synchronous from the ledger's perspective: an
operator has already moved money externally and records the reference, so the
system posts `2000 → 1100` immediately. If a future integration initiates a
transfer before confirmation, the correct design is `2000 → 2200` on approval
and `2200 → 1100` on confirmed settlement. Account `2200` exists for that
migration but must not be posted until the integration exists.

## 4. Rounding and minor units

- Every persisted amount is an integer number of poisha (`BIGINT`).
- `common/money/money.ts` is the only money arithmetic module:
  - `parseMinor` rejects negative, fractional and non-numeric values.
  - `bdtToMinor` accepts at most two decimal places and converts by string, not
    float.
  - `minorToBdtString` renders two decimals at the presentation edge.
- Commission uses basis points and integer division:

```
fee = floor(gross * rate_bps / 10000)
net = gross - fee
```

The floor remainder is assigned to the tutor, so `fee + net === gross` exactly
for every gross amount, including amounts that do not divide cleanly.

Worked example:

```
gross = 120000 poisha (BDT 1,200.00)
rate  = 800 bps (8%)
fee   = 120000 * 800 / 10000 = 9600 poisha (BDT 96.00)
net   = 120000 - 9600        = 110400 poisha (BDT 1,104.00)

journal: Dr 2100 120000
         Cr 2000 110400 (tutor party)
         Cr 4000   9600
```

Odd amounts:

```
gross = 1001 poisha
fee   = floor(1001 * 800 / 10000) = 80 poisha
net   = 921 poisha
```

No IEEE-754 value participates in a persisted total, a refundable calculation,
a payout availability check or a commission split. `Number()` appears only in
HTTP response/notification formatting; the authoritative values remain strings
or `bigint`.

Provider payload decimals are converted with `bdtToMinor` at the adapter
boundary. A malformed provider decimal is treated as zero and then fails the
amount-match check rather than being trusted.

## 5. Derived balances

`LedgerService.getAccountBalance(code, tutorUserId?)` sums entries and applies
the normal-balance convention:

- Asset and expense: `debits - credits`.
- Liability, equity and revenue: `credits - debits`.

`getPartyBalance('2000', tutorUserId)` is the tutor payable. Tutor summary and
payout eligibility both use it. `tutor_financial_accounts.reserved_minor` is a
serialization aid, not a source of truth:

```
available = party payable - sum(payouts in requested/approved/processing)
```

Reconciliation recomputes `credits - debits` from entries, so a corrupted
reserved column cannot create spendable money.

## 6. Transaction and concurrency model

| Operation           | Rows locked                                                    | Additional protection                                              |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Payment success     | `payment_orders`                                               | Unique `webhook_events(provider, event_id)`; unique ledger key     |
| Settlement          | `booking_sessions`, `escrow_holds`, `tutor_financial_accounts` | `UNIQUE(session_id)` on settlements; unique ledger key             |
| Refund request      | `payment_orders`, `escrow_holds`                               | Sum of succeeded + reserved refunds checked inside the transaction |
| Refund finalization | refund, order, hold                                            | Unique ledger key; bound re-check while locked                     |
| Payout request      | `tutor_financial_accounts`                                     | Payable recomputed from ledger; active payout sum                  |
| Payout paid         | payout, `tutor_financial_accounts`                             | Payable re-check; unique ledger key                                |

Lock ordering is consistent (order/payout → hold → tutor account) because each
service acquires its locks in one direction and never calls back into a service
that acquires the reverse order inside the same transaction.

## 7. Reconciliation checks

`SettlementService.runReconciliation()` persists a `reconciliation_runs` row and
checks:

1. Every `succeeded` payment order has a `succeeded` transaction row.
2. Every `succeeded` refund has a `ledger_journal_id`.
3. Every `paid` payout has an `external_reference`.
4. System-wide debits equal credits.

`LedgerService.verifySystemLedgerIntegrity()` and `runReconciliation()` provide
account-level balances for the finance console. A discrepancy is recorded and
surfaced; it is never auto-corrected.

## 8. Known ledger limitations

- Account `2200` and MFS fee account `5000` are not posted by Phase 05 flows.
  Provider/gateway fees are therefore not yet represented as an expense.
- No automatic reversal journal generator exists. Corrections require a
  reviewed manual journal (service method or SQL under change control).
- `escrow_holds` has no direct ledger account dimension; reconciliation ties it
  to `2100` through the payment order and settlement/refund rows, not through a
  dedicated per-hold sub-account.
- The system ledger is single-currency (BDT). Multi-currency journals would
  need a currency dimension in the idempotency and balance logic.
