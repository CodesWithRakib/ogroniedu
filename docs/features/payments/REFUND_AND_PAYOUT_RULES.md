# Refund and Payout Rules (Phase 05)

**Date:** 2026-10-20
**Scope:** Refund eligibility and approval, cancellation mapping, settlement
timing, tutor payout eligibility and manual disbursement.
**Prerequisite reading:** [../../BUSINESS_RULES.md](../../BUSINESS_RULES.md),
[PAYMENT_STATE_MACHINE.md](PAYMENT_STATE_MACHINE.md),
[LEDGER_DESIGN.md](LEDGER_DESIGN.md).

This document separates **policy** from **implemented behaviour**. Where the
product policy is not yet automated, that is stated explicitly rather than
implied.

---

## 1. Refund rules

### 1.1 Who may request

A refund request is accepted from:

- the payment order payer;
- the booking student;
- the booking requester;
- an active linked guardian of the student;
- an `admin` or `super_admin`.

Everyone else receives `403`. The check uses the same guardian-access service as
booking reads, so a guardian cannot request a refund for an unrelated student.

### 1.2 When a refund can be requested

| Condition                        | Requirement                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Order status                     | `succeeded`                                                                                              |
| Order has a verified transaction | Required before automated processing; manual confirmation also requires the refund to have been approved |
| Amount                           | Integer poisha, ≥ 100 (BDT 1.00)                                                                         |
| Refundable balance               | `order.amount - succeeded refunds - reserved refunds - released_to_tutor`                                |
| Booking access                   | Caller must be payer/student/requester/linked guardian/admin                                             |
| Released earnings                | A non-admin request is rejected if **any** amount has been released to the tutor                         |

The eligibility figures are snapshotted onto the refund row at request time
(`eligibility_snapshot`), including order amount, released amount, previously
refunded amount, reserved amount, refundable amount, booking status and
assessment time. The snapshot explains the decision; the live bound is re-checked
again at finalization.

### 1.3 Approval and execution

- Only `admin` and `super_admin` may approve, reject, process or manually
  confirm a refund.
- A rejection requires a note and is terminal for that request.
- Approval does not move money. The amount stays reserved.
- Automated provider refund is attempted only through
  `POST /admin/finance/refunds/:id/process`. The configured adapters report
  `unsupported`; the refund remains `approved` and the API returns
  `manualConfirmationRequired: true`.
- Manual confirmation requires a real external transfer reference
  (`externalReference`). The operator must have actually moved the money; the
  system does not invent or derive a reference.
- A provider exception or explicit provider failure marks the refund `failed`
  and releases the reservation.

### 1.4 Partial refunds and multiple requests

Partial refunds are supported. The sum of all `succeeded` refunds plus all
refunds in `requested`, `approved` or `processing` plus amounts already released
to the tutor may never exceed the order amount. Concurrent requests serialize on
the payment order and hold row locks.

### 1.5 Refunds after settlement

Once a session is settled, the released portion is no longer refundable through
the normal flow. This protects a tutor from having already-earned money removed
without review. A customer request is blocked as soon as `released_minor > 0`.

If a dispute requires recovery of settled earnings, the correct mechanism is an
audited tutor earning adjustment (debit payable, credit the appropriate
clearing/refund account) plus an external transfer. **No adjustment-creation
route is implemented in Phase 05**; `tutor_earning_adjustments` exists as a
schema and is read by the tutor summary, but no write path is exposed.

### 1.6 Refund timing and dispute window

[../../BUSINESS_RULES.md](../../BUSINESS_RULES.md) defines a 24-hour post-session
dispute observation window before earnings become payable. **This window is not
enforced in code.** `SettlementService` requires a completed session and a
funded hold; it does not check elapsed time. Until a scheduler or explicit
release date is added, operations must not settle a session inside the intended
dispute window.

There is also no fixed refund request deadline. A succeeded payment can be
requested for refund at any later date, subject to the released-earnings rule.

## 2. Cancellation policy mapping

The product cancellation matrix is:

| Initiator        | Timing               | Customer refund             | Tutor compensation    | Platform fee                |
| ---------------- | -------------------- | --------------------------- | --------------------- | --------------------------- |
| Guardian/Student | > 24h before session | 100%                        | 0%                    | Retained as platform credit |
| Guardian/Student | 4–24h before session | 80%                         | 20% base compensation | Waived                      |
| Guardian/Student | < 4h before session  | 0%                          | 80% minus commission  | 20% retained                |
| Guardian/Student | No-show (> 15 min)   | 0%                          | 80%                   | 20% retained                |
| Tutor            | > 24h before session | 100% + free reschedule      | 0%                    | Full refund                 |
| Tutor            | < 24h before session | 100% + priority replacement | 0%                    | Full refund                 |
| Tutor            | No-show (> 15 min)   | 100% + instant replacement  | 0%                    | Full refund                 |

**Implementation status:** the matrix is policy guidance, not an automated
calculator. A refund request carries an operator/customer-entered amount within
the refundable bound. No code derives 80%/20%, checks the 4-hour or 24-hour
boundary, awards tutor compensation, or applies reliability penalties as part of
the refund flow.

Administrative booking cancellation:

- `AdminBookingsService.cancelBooking()` cancels the booking, stores the
  intervention in the agreement snapshot and audits
  `admin.booking.emergency_cancelled`.
- If `refundStudent` is true and a succeeded payment exists, it creates and
  auto-approves a full-amount refund request.
- It does **not** mark the refund succeeded. `refundIssued` is true only if the
  refund was already `succeeded`; normally the response carries
  `refundStatus: approved` and the finance queue must complete it.
- If the order was already partly settled, the request fails the refundable
  bound; the failure is logged and the cancellation still completes. Finance
  must handle the residual manually.

## 3. Escrow release rules

A session can be settled only when:

1. The session exists and is `completed`.
2. The caller is the student, requester or an administrator.
3. A funded escrow hold for the booking is `held` or `partially_released`.
4. `hold.amount - hold.released - hold.refunded >= session gross`.
5. No settlement already exists for the session.

On success:

- Gross = `bookings.price_per_session_minor`.
- Commission = hold's snapshotted `commission_rate_bps` (default 800 = 8%).
- Tutor net and platform fee are split with integer floor; the remainder goes to
  the tutor.
- The journal and settlement row commit together.
- The tutor is notified after commit (`tutor.earnings_released`).

The session is not marked paid/completed by settlement; completion is a booking
concern and settlement consumes that fact.

## 4. Funding decision: one payment, one session

**Current implemented rule:** one payment order funds exactly one session price.

- The order amount is `bookings.price_per_session_minor`.
- A booking with a succeeded order cannot create a second order.
- A settlement is bounded by the hold remaining, so a second session cannot be
  settled from the first payment.

Consequence: for a multi-session booking, only the first session can be funded
and settled in this build. Later sessions have no funding path.

**Recommended product decision (pending approval):** either

- **A. Per-session funding:** allow a new payment order per completed/upcoming
  session, each with its own hold; or
- **B. Whole-booking funding:** charge `price_per_session * session_count` once,
  create one hold, and settle each session against that hold.

Option B requires the payment order amount and invoice to represent the booking
total, and the refundable calculation to exclude released sessions. Option A
requires relaxing the "one succeeded order per booking" rule and a clear
per-session reference on orders. Neither change is implemented because it changes
pricing and checkout semantics and needs approval.

## 5. Tutor payout rules

### 5.1 Eligibility

A payout can be requested when:

| Condition         | Requirement                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| Role              | `tutor`                                                                      |
| Amount            | Integer poisha, ≥ active policy `min_payout_minor` (default 50000 = BDT 500) |
| Available balance | `ledger payable (2000, party) - active payouts`                              |
| Account reference | 4–64 characters; masked and hashed before persistence                        |
| Idempotency       | 8–120 character key, unique per tutor                                        |

Active payouts are `requested`, `approved` and `processing`. `paid`, `rejected`,
`failed` and `cancelled` do not reserve funds.

### 5.2 Lifecycle

1. Tutor submits a request. Funds are reserved under a row lock.
2. Finance approves or rejects. Approval keeps the reservation.
3. Finance executes the transfer **outside the platform** (bKash/Nagad/Rocket/
   bank/other) and records the external reference with `mark-paid`.
4. `mark-paid` re-checks payable under lock, posts `Dr 2000 / Cr 1100`, releases
   the reservation and notifies the tutor.
5. `mark-failed` releases the reservation and records the failure reason.

No provider disbursement API is configured. The platform cannot initiate a
bKash/Nagad/bank transfer and does not claim to. A payout is `paid` only after a
human operator supplies a real transfer reference.

### 5.3 Payout schedule

[../../BUSINESS_RULES.md](../../BUSINESS_RULES.md) describes automatic bi-weekly
payouts on the 1st and 15th for balances above BDT 500. **No scheduler is
implemented.** Payouts are requested by tutors and processed manually by finance.
The minimum amount is enforced per request through the active policy.

### 5.4 Failure and retry

- Rejection requires a reason and releases the reserved amount.
- Failure requires a reason and releases the reserved amount.
- The tutor may submit a new request after a rejection or failure.
- A `paid` payout is terminal; `mark-paid` on an already-paid payout returns the
  existing row without posting a second journal.

### 5.5 Data protection

The payout destination is stored as:

- `account_reference_masked`: only the last four characters are visible.
- `account_reference_hash`: SHA-256 of the normalized value, used to detect
  duplicates without storing the full number in clear text.

The full destination is not persisted. Operators must rely on the external
transfer system for the actual account details.

## 6. Commission policy changes

- The active policy is versioned; a change creates a new version and deactivates
  the previous one. History is never edited.
- The rate is snapshotted on the payment order at creation and on the escrow hold
  at funding.
- Settlement uses the hold snapshot, never the current policy.
- Existing invoices keep their issued commission amount.
- The platform fee is capped at 3000 bps (30%) by DTO and service validation.
- Both `admin` and `super_admin` can create a version in the current
  implementation. If policy changes must be super-admin only, that is a code
  change, not a documented guarantee.

## 7. Operator checklist

Before approving a refund:

1. Confirm the order is `succeeded` and the request amount is within the
   refundable balance.
2. Check whether any session has been settled; released money cannot be
   refunded through this flow.
3. Approve or reject with a note.
4. Run `process`; expect `unsupported` with the current adapters.
5. Move the money externally, then `confirm-manual` with the real reference.
6. Verify the refund is `succeeded`, the hold reflects `refunded_minor`, and the
   journal is balanced.

Before marking a payout paid:

1. Confirm the tutor identity and destination out-of-band.
2. Approve the payout.
3. Execute the transfer in the banking/MFS channel.
4. Record the real external reference with `mark-paid`.
5. Verify the payout is `paid`, `reserved_minor` decreased, and the journal posted
   `2000 → 1100`.

If any step cannot be completed truthfully, leave the item in its current state
and escalate. Never mark money as moved because a button was clicked.
