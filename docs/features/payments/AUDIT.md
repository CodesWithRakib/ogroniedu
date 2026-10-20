# Payments, Escrow & Payouts — Audit (Phase 05)

**Date:** 2026-10-20
**Scope audited:** `apps/api/src/modules/payments`, ledger tables, booking payment
boundary, notification registry, tutor/admin finance screens, database
migrations `001`–`021`.
**Baseline:** 21 applied migrations in local `ogroniedu_dev`; PostgreSQL
reachable; no provider credentials or provider callbacks available in this
environment.

This audit is evidence-based. Each finding names the file and the concrete
behaviour observed. Items that could not be exercised without a provider or
production data are labelled **unverified**.

---

## 1. What already existed

| Area              | Existing implementation                                                                                                                                     | Assessment                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payment orders    | `payment_orders` table, `PaymentOrdersService`, idempotency on `(payer_user_id, idempotency_key)`                                                           | Reusable base; amount correctly taken from the booking, not the client                                                                                     |
| Provider adapters | `SslcommerzSandboxAdapter`, `BkashSandboxAdapter`, factory                                                                                                  | Signature verification is HMAC-based and mandatory; refund methods fabricated success                                                                      |
| Webhooks          | Verified HMAC, 5-minute timestamp window, amount/currency checks, server-to-server `queryTransaction`, atomic order + ledger + outbox + booking transaction | The most mature part of the module, but idempotency was not durable at the event level and the order lookup could fall back to “most recent pending order” |
| Ledger            | Balancing invariant, immutable journals, idempotency key, seeded accounts 1000/1100/2000/2100/3000/4000/5000                                                | Sound double-entry core; no party dimension, no transaction-manager participation                                                                          |
| Refunds           | `payment_refunds` table and immediate `processRefund`                                                                                                       | Status column existed but no request/approval workflow; any authenticated payer could execute a refund; provider result was fabricated                     |
| Settlement        | `settleMilestone` posts 92/8 split                                                                                                                          | No escrow-hold record, no per-session reservation, could credit the tutor more than the customer paid across multiple sessions                             |
| Reconciliation    | `GET /payments/reconciliation`, admin overview                                                                                                              | Read-only recomputation; no durable reconciliation run, no refund/payout coverage, endpoints open to any authenticated user                                |
| Notifications     | Registry + outbox, `payment.succeeded`, `payment.failed`, `refund.processed`                                                                                | No refund requested/approved/rejected, payout, or invoice events                                                                                           |
| Frontend          | Checkout, receipt dialog, payment history                                                                                                                   | Tutor earnings page used hardcoded balances, fake payout history and `setTimeout` success; admin finance settings were not persisted                       |

## 2. Findings and risk

### P-01 — Refund authorization bypass (critical)

`PaymentsController.processRefund()` was guarded only by `AuthGuard`, and
`RefundsService.processRefund()` accepted any authenticated user. The caller
supplied `paymentOrderId`, `amountMinor` and `reason`. A student, guardian or
unrelated authenticated account could attempt to move money out of escrow.

**Resolution:** refunds become a request → review → approval → processing →
provider-confirmed state machine. Customer callers may only _request_ refunds
for orders they can already read. Only finance operators may approve, reject,
process, or manually confirm.

### P-02 — Fabricated provider refund success (critical)

Both sandbox adapters returned `{ status: 'succeeded', providerRefundId:
'...-REF-' + Date.now() }` without calling any provider API. The refund service
trusted that value and posted the reversal journal immediately.

**Resolution:** adapters now report `unsupported` unless a real provider refund
integration is configured. A refund cannot reach `succeeded` without either a
provider-confirmed result or an explicit, audited manual-confirmation step that
requires an external transfer reference. No code path invents a reference.

### P-03 — Missing escrow-hold accounting (high)

A succeeded payment credited the student escrow liability and stopped there. No
record tied a specific payment to the funds available for settlement and
refund. Settlement used `booking.price_per_session_minor` for every completed
session, so a single ৳1,000 payment could credit ৳920 per session indefinitely.

**Resolution:** one `escrow_holds` row per successful payment order, with
`amount_minor`, `released_minor`, `refunded_minor` and a remaining balance.
Settlement and refund both consume the hold under a row lock. A second session
cannot be settled until the booking is funded again; this product decision is
documented in `REFUND_AND_PAYOUT_RULES.md` and flagged for approval.

### P-04 — No refund workflow or provider confirmation (high)

Refunds jumped straight to `succeeded`. There was no eligibility snapshot, no
reviewer, no partial-refund reservation, no failure state, and no way to
distinguish “provider accepted the request” from “money actually returned”.

**Resolution:** `requested → approved/rejected → processing → succeeded/failed`,
with separate `provider_status`, `provider_reference`, `provider_confirmed_at`,
`failure_reason`, decision audit fields and a unique refund number. Reserved
(refund in flight) and succeeded amounts both count against the refundable
balance.

### P-05 — Payouts did not exist (high)

Tutor earnings were the global ledger account `2000`; there was no per-tutor
balance, payout entity, reservation, or disbursement record. The tutor UI
invented both the balance and the payout history.

**Resolution:** per-tutor `tutor_financial_accounts`, `payouts` and
`tutor_earning_adjustments`; ledger entries gain a nullable `tutor_user_id`
party dimension so balances are derived from the ledger rather than a mutable
wallet column. Payout requests reserve funds under a row lock; approval,
rejection, paid and failure transitions post or release the reservation.

### P-06 — Reconciliation endpoints exposed to every authenticated user

(high)

`GET /api/v1/payments/reconciliation` and `GET
/api/v1/payments/ledger/balance/:accountCode` had no role guard. Any student
could read platform-wide ledger balances and reconciliation output.

**Resolution:** both routes and all new finance routes use explicit role
metadata (`admin`, `super_admin`); reconciliation runs are recorded in
`reconciliation_runs` with actor and timestamp.

### P-07 — Webhook replay/idempotency was not durable (medium)

Deduplication relied on `payment_transactions(provider, provider_event_id)`.
Failure events wrote no row under some paths, rejected events left no trace,
and two concurrent deliveries could both pass the pre-check before either
inserted. Provider payloads were also forced through a rigid,
provider-agnostic DTO that real SSLCOMMERZ IPN bodies do not satisfy.

**Resolution:** `webhook_events` with `UNIQUE(provider, provider_event_id)` and
insert-first processing; raw-body HMAC verification (`rawBody: true`);
provider-specific normalization (`tran_id`, `val_id`, `status`,
`currency`, `amount` for SSLCOMMERZ; the canonical shape for bKash); no
“most recent pending order” fallback — the provider reference must resolve to
the order.

### P-08 — Settlement not atomic with ledger (medium)

`postJournal` opened its own transaction while callers wrote order/settlement
state outside it. A crash between the two could leave a settlement row without
a journal or vice versa.

**Resolution:** `LedgerService.postJournal(params, manager?)` participates in
the caller’s `EntityManager` transaction. Settlement, refund, payment success
and payout disbursement all write business state and journals in one
transaction.

### P-09 — Invoice/receipt data was fabricated (medium)

`getPaymentReceipt()` hardcoded `tutorName: 'Verified OgroniEdu Tutor'` and
`subjectName: 'Tutoring Course'` when relations were missing, and no invoice
entity existed. `receiptId` was a truncated UUID, not a durable document number.

**Resolution:** `invoices` with a database sequence (`INV-YYYY-NNNNNN`) and a
snapshot of payer/student/tutor/subject/amount/commission at issue time.
Receipts read the invoice; missing relations surface as explicit nulls rather
than invented names. A printable HTML document is available for both locales;
PDF generation is documented as a limitation.

### P-10 — Tutor/admin finance UI displayed fabricated money (high)

`TutorEarningsPage` used `withdrawableBalanceBdt = 1200`, a hardcoded ৳1,200
session fee, two invented payout rows and a `setTimeout` that claimed “funds
will arrive within 2 hours”. Admin finance settings used local React state and
a fake save. `AdminReconciliationTab` was not wired to durable runs.

**Resolution:** the tutor page reads `/payments/tutor/summary` and
`/payments/payouts/mine`; the payout dialog submits a real request and shows
the returned state. Admin finance screens read refund/payout/reconciliation
APIs. No production screen contains invented balances or success messages.

### P-11 — Commission policy was a code constant (medium)

8% was hardcoded in `settlement.service.ts` while the admin UI offered a 10%
slider that saved nothing. Changing commission would require a deploy and
would retroactively reinterpret old settlements.

**Resolution:** `commission_policies` with versioned `platform_fee_bps`,
`min_payout_minor`, effective dates and an active flag. The rate is snapshotted
onto the payment order and escrow hold at funding time; settlement uses the
snapshot, never the current policy. The active policy is exposed to admin
finance settings and enforced server-side.

### P-12 — No per-session price or commission breakdown in receipts

(medium)

Booking sessions carry no amount; receipts could not show gross, commission and
tutor net per session. `session_settlements` now stores gross, fee, net and the
policy id, and is unique per session.

## 3. External blockers confirmed

| Blocker                                                                       | Impact                                                                   | Handling                                                                                                                                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No live SSLCOMMERZ/bKash credentials or registered IPN URLs                   | Real payment, refund and status-sync calls cannot be verified end-to-end | Adapters fail closed; webhook success requires server-to-server validation; refund automation reports `unsupported`; manual confirmation requires an external reference |
| Providers do not expose a payout/disbursement API in the configured contracts | Automated tutor payout is impossible                                     | Manual, audited payout workflow; the system records the external reference supplied by the operator and never invents one                                               |
| Business decision: one payment funds one session or the whole booking?        | Settlement of later sessions                                             | Implemented fail-safe: one payment hold funds the sessions it can cover; later sessions require additional funding. Needs product approval                              |
| No PDF dependency (`pdfkit`/`pdf-lib`)                                        | Downloadable PDF invoice                                                 | Printable HTML with print CSS; Bangla relies on system fonts. Documented in the report                                                                                  |
| No organization tenancy tables                                                | `organization_owner` / `organization_staff` finance scope                | Both roles are denied finance access by default in the matrix; revisit when tenancy lands                                                                               |

## 4. Baseline commands

Before changes:

- `pnpm --filter @ogroniedu/api test` — passing at baseline.
- `pnpm --filter @ogroniedu/web test` — passing at baseline.
- `pnpm typecheck` — clean.
- `pnpm docs:validate` — clean.
- `psql -d ogroniedu_dev -c "select count(*) from schema_migrations"` — 21.

Final command results are recorded in `IMPLEMENTATION_REPORT.md`.
