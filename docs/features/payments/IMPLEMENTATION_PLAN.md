# Payments, Escrow & Payouts — Implementation Plan (Phase 05)

**Date:** 2026-10-20
**Status:** approved scope, implementation in progress
**Prerequisite reading:** `AUDIT.md`, `docs/features/bookings/IMPLEMENTATION_REPORT.md`,
`docs/14-payments-and-ledger.md`, `docs/BUSINESS_RULES.md`.

The existing payments module is the base. This phase extends it; it does not
create a second payment architecture.

---

## 1. Invariants

1. **Server-authoritative money.** Amounts come from `bookings` and
   `payment_orders`; client-supplied amounts are never trusted. Every write
   path recomputes totals from persisted rows.
2. **Integer minor units.** All arithmetic uses `bigint` poisha. No `float` or
   `Number` arithmetic on money. BDT formatting happens only at the edge.
3. **Balanced, immutable journals.** `ledger_entries` are append-only; debits
   equal credits per journal; corrections are reversal journals, never edits.
4. **Derived balances.** Account and tutor balances are computed from
   `ledger_entries`. Cached values, if any, are advisory only.
5. **Provider truth.** A payment is successful only after a verified webhook
   plus server-to-server validation. A refund is successful only after a
   provider confirmation or an explicit audited manual confirmation with an
   external reference.
6. **Idempotency everywhere.** Payment order creation, webhook events, ledger
   journals, settlements, refunds and payouts all have durable unique keys.
7. **No overdraw.** Payouts and refunds lock the row that bounds them
   (`payment_orders` for refunds, `tutor_financial_accounts` for payouts) and
   recompute availability inside the transaction.
8. **Least privilege.** Customer and tutor routes are record-scoped; finance
   routes require `admin`/`super_admin`; every finance mutation is audited.

## 2. Data model changes (migration `022_payments_escrow_payouts.sql`)

| Table / column | Purpose |
| --- | --- |
| `commission_policies` | Versioned `platform_fee_bps`, `min_payout_minor`, effective window, active flag. Seeds the 8% policy. |
| `payment_orders.commission_rate_bps` | Snapshot of the policy at order creation. |
| `payment_orders.escrow_hold_id` | Link to the funded hold. |
| `escrow_holds` | One row per successful payment: amount, released, refunded, remaining, status. |
| `webhook_events` | Durable provider event log with `UNIQUE(provider, provider_event_id)`. |
| `payment_refunds` new columns | Refund number, booking, initiator role, decision, provider status/reference, eligibility snapshot, ledger journal, idempotency key. |
| `session_settlements` | Unique per session; gross, fee, net, policy snapshot, journal, actor, reversal. |
| `tutor_financial_accounts` | Per-tutor serialization row + reserved amount. |
| `tutor_earning_adjustments` | Audited manual corrections (reversals, dispute deductions). |
| `payouts` | Tutor payout lifecycle, amount, method, masked account, reviewer, external reference, idempotency. |
| `invoices` | Durable invoice number, payment order, snapshot, totals, status. |
| `reconciliation_runs` | Durable audit of each reconciliation execution. |
| `ledger_entries.tutor_user_id` | Party dimension so tutor payable is ledger-derived. |
| Account `2200` | “Payouts In Transit” clearing liability. |
| Indexes | Party ledger lookups, refund/payout queues, invoice lookup. |

## 3. Backend work

### 3.1 Money utilities — `common/money/money.ts`

- `parseMinor(value)`, `toBdt`, `formatBdt`.
- `commissionSplit(gross, bps)` using integer floor and assigning the
  remainder to the platform fee so `net + fee === gross` exactly.
- Unit tests for rounding, zero, negative and large values.

### 3.2 Ledger hardening — `ledger.service.ts`

- `postJournal(params, manager?)` uses the caller transaction when supplied.
- Catch unique-violation races: on duplicate idempotency key, re-read and
  return the existing journal.
- `getAccountBalance(code, tutorUserId?)` and
  `getPartyBalance(code, tutorUserId)`.
- `verifySystemLedgerIntegrity()` and reconciliation unchanged in meaning.

### 3.3 Payment orders

- Snapshot the active commission policy at order creation.
- Store a `provider_reference` when checkout is created (SSLCOMMERZ
  `sessionkey`, bKash payment id) for status sync.
- Reject new orders for a booking that already has a succeeded order.
- Receipt now reads the invoice when available and uses real relation names.

### 3.4 Webhooks

- `rawBody: true` in `main.ts`; controller accepts the raw body and provider
  payload, no rigid DTO whitelist.
- Adapter gains `normalizeWebhook(headers, body)` returning
  `{ eventId, providerTransactionId, orderReference, amountMinor, currency,
  status }`.
- Insert `webhook_events` first; `UNIQUE` violation means duplicate → return
  `processed: false`.
- Resolve the order strictly by `orderReference` (no fallback).
- On success: lock order, re-check status, validate amount/currency, re-query
  the provider, then in one transaction: order succeeded, transaction row,
  escrow hold, ledger 1000/2100, invoice, booking confirmation, outbox.
- On failure: record the event, mark the order failed only for a verified
  event that names the order.
- On processing error: mark the event `failed` with a redacted error.

### 3.5 Refunds

- `POST /payments/refunds/requests` — customer (payer/student/requester/linked
  guardian) or admin; amount ≤ remaining refundable (paid − succeeded −
  reserved − released to tutor).
- `GET /payments/refunds/mine`, `GET /payments/refunds/:id` — record-scoped.
- `GET /admin/finance/refunds` — finance queue.
- `POST /admin/finance/refunds/:id/decide` — approve or reject, with note.
- `POST /admin/finance/refunds/:id/process` — attempt the provider. If the
  adapter reports `unsupported`, leave `approved` and return
  `manual_confirmation_required`.
- `POST /admin/finance/refunds/:id/confirm-manual` — require an external
  reference; post the reversal journal and mark succeeded.
- Reversal journal: debit `2100` (student escrow deposit), credit `1000`
  (escrow pool). Update `escrow_holds.refunded_minor`/status.
- Provider failure marks `failed` with a reason and releases the reservation.

### 3.6 Settlements and tutor earnings

- `POST /payments/milestones/settle` keeps its path but becomes
  transaction-safe: lock session and hold; require completed session; require
  the caller is the student/requester/admin; require remaining hold ≥ gross;
  post 2100 → 2000 (tutor party) + 4000 fee; write `session_settlements`;
  update hold; create tutor financial account row.
- `GET /payments/tutor/summary` — totals derived from the ledger and
  settlements: lifetime net, available (net − reserved − paid out), reserved,
  paid out, escrow pending.
- `GET /payments/tutor/settlements` — per-session rows.
- `GET /payments/tutor/adjustments` — audited adjustments.

### 3.7 Payouts

- `POST /payments/payouts` — tutor request; amount ≥ policy minimum; lock
  `tutor_financial_accounts`, compute available from party ledger balance minus
  active payouts; create requested payout and increment `reserved_minor`.
- `GET /payments/payouts/mine` — tutor history.
- `GET /admin/finance/payouts` — finance queue.
- `POST /admin/finance/payouts/:id/approve` — requested → approved (reservation
  stays).
- `POST /admin/finance/payouts/:id/reject` — release reservation.
- `POST /admin/finance/payouts/:id/mark-paid` — require external reference;
  post debit `2000` (tutor party) / credit `1100` (platform bank), mark paid,
  decrement reserved, record reference.
- `POST /admin/finance/payouts/:id/mark-failed` — release reservation.
- No automated provider transfer exists; documented.

### 3.8 Invoices

- `invoices` created in the payment-success transaction with a database
  sequence number.
- `GET /payments/invoices/:invoiceId` — JSON, record-scoped.
- `GET /payments/invoices/:invoiceId/print?locale=bn|en` — printable HTML with
  escaped values, print CSS, `Content-Type: text/html; charset=utf-8`.
- Receipts include `invoiceId` and `invoiceNumber`.

### 3.9 Admin finance

- `GET /admin/finance/summary` — escrow held, tutor payable, payouts in
  transit, refunds pending, reconciliation status.
- `GET/PUT /admin/finance/commission-policy` — read active policy; super_admin
  creates a new version (never edits history).
- `POST /admin/finance/reconciliation/run` — persists a run.
- Refund/payout queues listed above.
- All routes guarded by `AuthGuard` + `RolesGuard`; mutations audited.

### 3.10 Notifications and outbox

Add registry events: `refund.requested`, `refund.approved`, `refund.rejected`,
`refund.failed`, `payout.requested`, `payout.approved`, `payout.paid`,
`payout.rejected`, `invoice.issued`. Extend `NotificationEventTypes` and the
allowed-role lists. Dispatch after the transaction commits; failures are
logged, never rolled back into the money transaction.

## 4. Frontend work

| Screen | Change |
| --- | --- |
| `features/payments/pages/payments-page.tsx` | Refund button becomes “request refund”; show request status; link invoice print |
| `features/tutors/pages/tutor-earnings-page.tsx` | Remove hardcoded balances/history/`setTimeout`; read summary, settlements and payouts; submit real payout request |
| `features/admin/pages/settings/admin-settings-finance-page.tsx` | Load/save commission policy through the API; no fake local save |
| New `features/admin/pages/admin-finance-page.tsx` | Refund queue, payout queue, escrow summary, reconciliation run |
| New route `dashboard/admin/finance` | Admin finance operations |
| `store/services/payments-api.ts` | Typed endpoints for refunds, payouts, tutor summary, invoices, admin finance |
| Admin nav | Add Finance entry for finance roles |

All new copy is bilingual. No production screen shows invented amounts.

## 5. Testing

- Unit: money rounding, commission split, refund eligibility/reservation,
  payout no-overdraw, state transitions, invoice numbering format.
- Service: webhook duplicate/amount/currency/signature, settlement hold bound,
  refund manual confirmation, payout mark-paid ledger.
- Controller: role metadata on every finance route.
- Web: API contract/type tests for new endpoints; tutor page renders real data
  and shows an error instead of fake success.
- Optional DB-backed concurrency test guarded by `DB_INTEGRATION=1`; skipped
  when PostgreSQL is unavailable, and reported as unverified if skipped.

## 6. Validation and exit criteria

Run and record:

```
pnpm --filter @ogroniedu/database build
pnpm db:migrate
pnpm --filter @ogroniedu/api test
pnpm --filter @ogroniedu/web test
pnpm --filter @ogroniedu/database test
pnpm typecheck
pnpm lint
pnpm build
pnpm docs:validate
```

Exit criteria: migration applies to `ogroniedu_dev` from 21 → 22; all tests,
typecheck, lint, build and docs validation pass; no unverified money path is
presented as verified; `IMPLEMENTATION_REPORT.md` lists every unverified
external dependency and the multi-session decision. Stop for approval before
Phase 06.
