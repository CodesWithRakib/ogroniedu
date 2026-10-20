# Payment, Escrow, Refund and Payout State Machines (Phase 05)

**Date:** 2026-10-20
**Scope:** `payment_orders`, `escrow_holds`, `payment_refunds`, `payouts`,
`session_settlements`, `invoices`, `webhook_events`.
**Prerequisite reading:** [AUDIT.md](AUDIT.md),
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md),
[../bookings/BOOKING_STATE_MACHINE.md](../bookings/BOOKING_STATE_MACHINE.md).

Every transition below is enforced by `apps/api/src/modules/payments`. The
client never chooses a status; it submits an intent and the server derives the
next state from persisted rows, a verified provider event, or an authorized
finance action.

---

## 1. Payment order

Stored in `payment_orders.status`. The TypeScript union also allows `created`,
but `PaymentOrdersService.createPaymentOrder()` inserts new orders directly as
`pending`.

| From        | Trigger                                 | To                      | Side effects                                                                                                                                                                                                                 |
| ----------- | --------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —           | `POST /api/v1/payments/orders`          | `pending`               | Booking must be `accepted` or `awaiting_payment`; amount = `bookings.price_per_session_minor`; active commission policy snapshotted; provider checkout session stored as `provider_reference`; audit `payment.order_created` |
| `pending`   | Verified success webhook for this order | `succeeded`             | One transaction: provider transaction row, `escrow_holds` row, journal Dr `1000` / Cr `2100`, invoice issue, booking `confirmed`, outbox `payment.succeeded`, webhook event `processed`                                      |
| `pending`   | Verified failure webhook                | `failed`                | Failed transaction row, webhook event `processed`, `payment.failed` notification                                                                                                                                             |
| `succeeded` | Duplicate success webhook               | `succeeded`             | No new journal, no new hold; event recorded `duplicate`; response `processed: false`                                                                                                                                         |
| `failed`    | Later verified success webhook          | `succeeded`             | Allowed recovery path; the provider is still authoritative and the payment is posted once under the ledger idempotency key                                                                                                   |
| `pending`   | Expiry / cancellation                   | `expired` / `cancelled` | **Not implemented.** No scheduler or route performs this. Stale orders remain `pending` until a provider event arrives                                                                                                       |

Hard rules:

- A new order is refused when the booking already has a `succeeded` order.
- An idempotency key is scoped to `(payer_user_id, idempotency_key)`. Replaying
  it with a different booking or amount is rejected.
- A browser redirect is never evidence of payment. Only a verified webhook plus
  a server-to-server `queryTransaction` moves an order to `succeeded`.
- Amount and currency must match the order **and** the provider-verified result.
  Any mismatch throws before the transaction opens.
- Booking confirmation only happens from `accepted` or `awaiting_payment`. A
  payment arriving in another booking state is logged for manual
  reconciliation; the payment is still recorded, and the booking is not forced.

The client-triggerable sandbox confirmation route
(`POST /payments/orders/:id/sandbox-confirm`) now always returns HTTP 410. It
must not be reinstated.

## 2. Webhook event

Stored in `webhook_events.status`.

```
received ──> processed
    │           duplicate
    ├────────> rejected   (unknown order reference)
    └────────> failed     (processing error; a later retry may reset to received)
```

- The unique key `(provider, provider_event_id)` is the dedupe boundary.
- The event row is inserted **before** any money logic. A duplicate insert
  returns `null` and the request ends with `processed: false`.
- A `failed` event may be retried by the provider; the row is reset to
  `received`, and order locking plus `ledger_journals.idempotency_key` keep the
  retry safe.
- `payload_redacted` stores only the order reference, provider transaction id,
  amount, currency and status. Signatures, account numbers and raw customer
  data are not stored.

## 3. Escrow hold

Stored in `escrow_holds.status`. One hold exists per successful payment order.

```
held ──settle──> partially_released ──settle──> released
  │                     │
  ├──refund──> partially_refunded ──refund──> refunded
  └──────────────mixed───────────────> closed
```

Invariant, checked under `pessimistic_write` locks:

```
released_minor + refunded_minor <= amount_minor
remaining = amount_minor - released_minor - refunded_minor
```

- Settlement consumes `remaining` and increments `released_minor`.
- Refund finalization consumes `remaining` and increments `refunded_minor`.
- When released and refunded together exhaust the hold, the row is `released`
  (no refunds), `refunded` (no releases) or `closed` (both).
- `held_at` is set when the verified payment creates the hold; `closed_at` is set
  when the hold is exhausted.

The commission rate is copied onto the hold at funding time. Later policy
changes never affect an existing hold or a historical settlement.

## 4. Refund

Stored in `payment_refunds.status`.

```
                    ┌── reject ──> rejected (terminal)
requested ──review──┤
                    └── approve ─> approved
                                     │
                     ┌───────────────┼────────────────┐
                     │               │                │
             provider auto      provider says    manual confirmation
                     │            unsupported           │
                     v               │                  v
                  succeeded <────────┘              succeeded
                     ^
                     │
              provider failure ──> failed (terminal for this request)
```

| From                      | Trigger                                          | To                                 | Notes                                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| —                         | `POST /api/v1/payments/refunds`                  | `requested`                        | Payer, student, requester, active linked guardian or admin; order must be `succeeded`; amount ≥ 100 poisha and ≤ refundable; reserves the amount; eligibility snapshot persisted; audit + notification |
| `requested`               | `POST /admin/finance/refunds/:id/decide`         | `approved` / `rejected`            | Finance only; decision note stored; rejection releases the reservation by status                                                                                                                       |
| `approved`                | `POST /admin/finance/refunds/:id/process`        | `succeeded` / `failed` / unchanged | Adapter success finalizes; adapter `unsupported` leaves `approved` with `provider_status = unsupported` and returns `manualConfirmationRequired: true`; adapter exception marks `failed`               |
| `approved`                | `POST /admin/finance/refunds/:id/confirm-manual` | `succeeded`                        | Requires a non-empty external transfer reference; locks refund, order and hold; re-checks the hold bound; posts journal; writes outbox `refund.processed`                                              |
| `approved` / `processing` | Finalization                                     | `succeeded`                        | Idempotent: an already-succeeded refund is returned unchanged                                                                                                                                          |

`processing` is an accepted state for a future asynchronous provider flow. The
current synchronous adapters move `approved` directly to `succeeded`, `failed`
or back to `approved` (unsupported); they do not write `processing`.

Refundable balance:

```
refundable = order.amount_minor
           - succeeded refunds
           - refunds in requested/approved/processing
           - escrow_holds.released_minor
```

Consequences:

- Settled tutor earnings cannot be pulled back by a customer refund request.
  A customer request is rejected as soon as any amount has been released; an
  administrator may still open a request, but finalization applies the same
  bound and will fail if the amount is not genuinely refundable. Disputes that
  require clawing back settled earnings need a separate audited adjustment
  workflow, which is **not implemented**.
- A failed refund frees its reservation. A new request is required to retry.
- No code path sets `succeeded` without a provider reference or a manually
  supplied external reference.

## 5. Payout

Stored in `payouts.status`.

```
requested ──approve──> approved ──mark-paid──> paid (terminal)
    │                     │
    ├──reject──> rejected │
    │                     └──mark-failed──> failed
    └──reject──> rejected
```

`processing` and `cancelled` exist in the union but no route currently writes
them. They are reserved for an asynchronous disbursement integration.

| From                     | Trigger                                       | To          | Notes                                                                                                                                                                                                   |
| ------------------------ | --------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —                        | `POST /api/v1/tutor/finance/payouts`          | `requested` | Tutor only; amount ≥ active policy `min_payout_minor` (500 BDT by default); amount ≤ ledger payable minus active payouts; serialization row locked; destination masked and hashed; reservation recorded |
| `requested`              | `POST /admin/finance/payouts/:id/approve`     | `approved`  | Reservation stays; reviewer and timestamp recorded                                                                                                                                                      |
| `requested` / `approved` | `POST /admin/finance/payouts/:id/reject`      | `rejected`  | Reservation recomputed from active payouts and released                                                                                                                                                 |
| `approved`               | `POST /admin/finance/payouts/:id/mark-paid`   | `paid`      | External reference mandatory before the transaction; tutor payable re-checked under lock; journal Dr `2000` / Cr `1100`; reservation released; notification                                             |
| `approved`               | `POST /admin/finance/payouts/:id/mark-failed` | `failed`    | Reservation released; reason stored                                                                                                                                                                     |

Invariants:

- `available = ledger party balance (2000) - sum(active payouts)`.
- The ledger is the source of truth for payable; `tutor_financial_accounts`
  exists only to serialize concurrent requests and cache the reserved figure.
- Marking paid never creates money: it debits the tutor's payable and credits
  the platform bank account.
- No automated provider transfer is implemented. `paid` means an operator has
  recorded a real external transfer reference; the platform did not execute it.

## 6. Session settlement

`session_settlements` has `UNIQUE(session_id)`; a session settles once.

```
booking session completed
        │
        ├─ existing settlement? ──> return existing journal (idempotent)
        │
        ├─ caller is student/requester/admin? ── no ──> 403
        ├─ active escrow hold for booking? ────── no ──> 409
        ├─ hold remaining >= gross? ─────────────  no ──> 409
        │
        └─ one transaction: journal Dr 2100 gross
                             Cr 2000 tutor net (party)
                             Cr 4000 platform fee
           update hold, insert settlement, lock tutor account,
           audit + notification after commit
```

The gross amount is `bookings.price_per_session_minor`; the commission rate is
`escrow_holds.commission_rate_bps`, not the currently active policy.

Tutors cannot settle their own sessions. Guardians are not accepted by
`SettlementService.settleMilestone()`; only the student, requester or an
administrator can approve settlement.

## 7. Invoice

```
issued ──(no implementation)──> void
```

Invoices are created inside the payment-success transaction with a database
sequence number (`INV-YYYY-NNNNNN`). `void` exists in the entity and schema but
no route voids an invoice today. Correction of an issued invoice therefore
requires a documented manual/DB operation, which is a known gap.

## 8. Reconciliation run

`reconciliation_runs.status`: `running → reconciled | discrepancy_detected |
failed`.

A run is persisted before checks, then records counts, ledger totals,
discrepancy list and completion time. It never mutates money. A discrepancy is a
report for human follow-up, not an automatic correction.

## 9. Unsupported transitions and known gaps

- Payment order expiry/cancellation is not automated.
- Refund `processing` is not written by the current provider adapters.
- Payout `processing`/`cancelled` are not written by any route.
- Invoice `void` has no API.
- Automatic percentage-based cancellation refunds are not implemented; the
  cancellation matrix is policy guidance, and the actual amount is entered by
  the requester within the refundable bound.
- The 24-hour post-session dispute window is policy only. Settlement checks
  completion and funding, not elapsed dispute time; a scheduler or explicit
  hold period is still required.
- Multi-session bookings: one payment order funds one session price, and a
  booking with a succeeded order cannot be funded again. Later sessions cannot
  be settled until the product decision and an additional-funding flow are
  approved. See [REFUND_AND_PAYOUT_RULES.md](REFUND_AND_PAYOUT_RULES.md).
