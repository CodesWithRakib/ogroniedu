# Security and Reconciliation (Phase 05)

**Date:** 2026-10-20
**Scope:** Webhook trust, idempotency, authorization, sensitive data, audit and
reconciliation for the payments module.
**Prerequisite reading:** [../../production-modernization/07-SECURITY-AUDIT.md](../../production-modernization/07-SECURITY-AUDIT.md),
[LEDGER_DESIGN.md](LEDGER_DESIGN.md),
[ROLE_PERMISSION_MATRIX.md](ROLE_PERMISSION_MATRIX.md).

---

## 1. Threats considered

| Threat                         | Control                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Forged provider callback       | Mandatory signature over the raw body; provider-specific normalization; server-to-server verification before success |
| Replayed callback              | 5-minute timestamp window where a timestamp is supplied; durable unique `(provider, provider_event_id)`              |
| Duplicate concurrent callback  | Insert-first event row; order row lock; unique ledger idempotency key                                                |
| Amount tampering               | Amount comes from the order and booking; webhook amount, provider-verified amount and order amount must all match    |
| Currency substitution          | Currency must match the order and the provider-verified result                                                       |
| Client-forged success          | Sandbox confirmation route returns 410; browser redirect is ignored; only a verified webhook can succeed an order    |
| Refund abuse                   | Request/review separation; finance roles only can execute; refundable bound re-checked under lock                    |
| Payout overdraw                | Ledger-derived payable minus active payouts, checked under a locked tutor account row                                |
| Privilege escalation           | RolesGuard metadata; record-level checks; privileged roles are provision-only, not self-signup                       |
| Sensitive data leakage         | Redacted webhook payloads; masked/hashed payout destination; escaped invoice HTML; no secrets in audit metadata      |
| SQL/HTML injection in invoices | Snapshot values are escaped; invoice HTML is generated with an explicit escaper                                      |

## 2. Webhook verification

### 2.1 Raw body

`main.ts` enables `rawBody: true`. `PaymentsController.handleWebhook()` passes
`req.rawBody?.toString('utf8')` to the service. Signatures are computed over the
exact bytes received, not over a re-serialized object.

### 2.2 Signature

- **SSLCOMMERZ:** `verifyWebhookSignature()` accepts
  `x-sslcommerz-signature`/`X-SSLCOMMERZ-SIGNATURE`, or `verify_sign`/`signature`
  in the body. It computes HMAC-SHA256 with `SSLCOMMERZ_STORE_PASSWD` and compares
  with `crypto.timingSafeEqual`. An unsigned body is rejected.
- **bKash:** `x-bkash-signature`/`X-BKASH-SIGNATURE`, or `signature` in the body,
  HMAC-SHA256 with `BKASH_WEBHOOK_SECRET`. If the secret is unset, every bKash
  webhook is rejected (fail closed).
- A missing or invalid signature returns `401` before any event row is written.

### 2.3 Provider-specific normalization

SSLCOMMERZ:

- order reference: `tran_id` / `tranId` (our payment order UUID);
- provider transaction reference: `val_id` or `bank_tran_id`;
- status: `VALID|VALIDATED|SUCCESS|SUCCEEDED` → succeeded,
  `FAILED|FAIL|CANCELLED|CANCELED|EXPIRED` → failed, otherwise pending;
- amount: `amount` / `currency_amount` parsed with `bdtToMinor`.

bKash:

- order reference: `merchantInvoiceNumber` / `orderId` / `paymentID`;
- transaction reference: `trxID` / `transactionId` / `paymentID`;
- status: `COMPLETED|SUCCESS|SUCCEEDED|VALID` → succeeded, failure/cancel/expiry
  → failed, otherwise pending.

### 2.4 Anti-replay

If `x-webhook-timestamp`, `x-timestamp` or `body.timestamp` is present, the event
must be within ±300 seconds. A malformed timestamp is rejected. If no timestamp
is supplied, anti-replay relies on the durable event id and server-to-server
verification. Providers that do not send a timestamp therefore have a weaker
replay posture; this must be confirmed against the live provider contract.

### 2.5 Server-to-server verification

A webhook that claims success is not sufficient. The service calls
`queryTransaction(providerTransactionId)` and requires:

- `status === 'succeeded'`;
- provider amount equals the order amount;
- provider currency equals the order currency.

Any failure aborts before the money transaction. The SSLCOMMERZ adapter calls
the validation server with `val_id`; network failure or a non-`VALID` response
returns `failed`, never a fabricated success. The bKash adapter fails closed
because no live credentials are configured.

### 2.6 Durable dedupe

`webhook_events` has `UNIQUE(provider, provider_event_id)`. The row is inserted
first:

- insert succeeds → process;
- unique violation and existing status is not `failed` → return
  `processed: false`;
- unique violation and existing status is `failed` → reset to `received` and
  retry.

Order locking (`pessimistic_write`) and the ledger's unique idempotency key make
a retry safe even if the previous attempt partially progressed.

## 3. Idempotency summary

| Operation          | Durable key                                                       |
| ------------------ | ----------------------------------------------------------------- |
| Payment order      | `UNIQUE(payer_user_id, idempotency_key)`                          |
| Webhook event      | `UNIQUE(provider, provider_event_id)`                             |
| Ledger journal     | `ledger_journals.idempotency_key` unique                          |
| Refund request     | `UNIQUE(requested_by, idempotency_key)` where key is not null     |
| Refund execution   | `ledger:refund:{refundId}` plus refund status short-circuit       |
| Session settlement | `UNIQUE(session_id)` plus `ledger:settlement:session:{sessionId}` |
| Payout request     | `UNIQUE(tutor_user_id, idempotency_key)`                          |
| Payout payment     | `ledger:payout:{payoutId}` plus `paid` short-circuit              |
| Invoice            | `UNIQUE(payment_order_id)` and `UNIQUE(invoice_number)`           |

Known nuance: a concurrent duplicate refund request can hit the unique index and
surface as a database conflict instead of returning the winning row, because the
pre-check is outside a lock. The money outcome is still correct (only one row),
but the API may return a 500-class error rather than an idempotent replay. This
should be hardened by catching the unique violation and re-reading, as the ledger
service already does.

## 4. Authorization and audit

- Finance routes are guarded by `AuthGuard` + `RolesGuard` with
  `@Roles('admin', 'super_admin')`.
- Tutor routes are guarded by `AuthGuard` + `RolesGuard` with `@Roles('tutor')`.
- Customer routes use `AuthGuard` plus record-level checks.
- Every finance mutation writes an audit record through `AuditService` with
  actor, action, resource, request id when available and safe metadata.
- Audit records do not contain full account numbers, signature values or raw
  provider payloads.
- No endpoint trusts a client-supplied status, price, commission or tutor id.
  Tutor identity is resolved from the booking/session, not from the request body.

## 5. Sensitive data handling

| Data                   | Storage                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Provider event payload | `payload_redacted` with order reference, transaction id, amount, currency, status only; a SHA-256 `payload_hash` is kept for integrity |
| Payout destination     | `account_reference_masked` (last four) + SHA-256 `account_reference_hash`; full value not persisted                                    |
| Invoice customer names | Snapshot on the invoice; access restricted to payer/student/admin                                                                      |
| Receipt names          | Read from real relations; missing values render as `—`, never invented                                                                 |
| Logs                   | Provider errors are logged without full payloads or secrets                                                                            |
| HTML invoice           | All dynamic values escaped with `&`, `<`, `>`, `"`, `'` replacements                                                                   |

## 6. Reconciliation

### 6.1 What runs

`POST /api/v1/admin/finance/reconciliation/run` (admin/super_admin) calls
`SettlementService.runReconciliation()`:

1. Create a `reconciliation_runs` row with status `running`, actor and start
   time.
2. Load all orders, transactions, refunds and payouts.
3. Verify the system ledger balances (debits = credits).
4. Flag:
   - a succeeded order with no succeeded transaction;
   - a succeeded refund with no ledger journal;
   - a paid payout with no external reference;
   - an unbalanced system ledger.
5. Persist counts, totals, discrepancy list, finish time and status
   (`reconciled` / `discrepancy_detected`).
6. On an exception, persist status `failed` with the error message and rethrow.

`GET /api/v1/admin/finance/ledger/reconciliation` returns account-level balances
and the integrity result. `GET /api/v1/admin/finance/ledger/balance/:code`
returns one account balance in poisha.

### 6.2 What it does not do

- It does not compare against a provider settlement file. No provider settlement
  API/feed is configured, so gateway fee, settlement timing and chargeback
  differences are **unverified**.
- It does not auto-correct. A discrepancy is surfaced for human action.
- It does not verify that `escrow_holds` sum to the `2100` liability; that is a
  recommended additional invariant (see below).
- It does not check invoice totals against orders or settlements against holds,
  beyond the ledger balance.

### 6.3 Recommended additional invariants

These are not implemented and should be added before scale:

```
sum(active escrow_holds remaining) == account 2100 balance
sum(session_settlements.gross)      == sum(escrow_holds.released)
sum(refunds.succeeded)              == sum(escrow_holds.refunded)
sum(payouts.paid)                   == account 2000 debits for payouts
sum(invoices.total)                 == sum(succeeded orders.amount)
```

### 6.4 Operational cadence

- Run reconciliation after every provider incident and at least daily.
- Investigate any `discrepancy_detected` run before the next payout batch.
- Keep `reconciliation_runs` immutable; export them for accounting review.
- A failed reconciliation row is an alert, not a silent log entry.

## 7. Incident playbook

**Suspected forged webhook**

1. Check `webhook_events` for the event id and `signature_valid`.
2. Confirm the order was not marked succeeded without a transaction.
3. If a journal was posted, do not edit it; prepare a reversal journal and a
   refund/manual correction under finance review.
4. Rotate the provider secret and replay legitimate events only.

**Duplicate payment**

1. Locate all succeeded orders for the booking/payer.
2. Refund the duplicate through the refund workflow with a real external
   reference.
3. Record the incident and the provider transaction ids.

**Payout marked paid in error**

1. Do not delete the payout or the journal.
2. Record the real state with finance; if funds did not move, `mark-failed` is
   not available after `paid`, so a reviewed compensating entry and a new payout
   request are required.
3. Escalate to accounting; the current model has no payout reversal route.

**Ledger imbalance**

1. Stop payouts and refunds.
2. Export journals and entries; identify the unbalanced journal.
3. Post a reviewed correction journal; never update posted entries.
4. Re-run reconciliation and record the incident.

## 8. Known security limitations

1. **Real SSLCOMMERZ signature compatibility is unverified.** The adapter
   verifies HMAC-SHA256 over the raw body using the store password. Production
   SSLCOMMERZ IPN payloads use their own `verify_sign` construction. The
   mandatory server-to-server validation is the stronger control, but the
   signature contract must be reconciled with official provider documentation
   before live traffic. Until then, real callbacks may be rejected.
2. **Sandbox credential fallbacks exist in code.** The SSLCOMMERZ adapter has
   default sandbox store id/password values. They are not live secrets, but the
   fallbacks must be removed and env-only configuration enforced before
   production.
3. **No webhook rate limiting specific to the endpoint.** Dedupe and signature
   checks prevent money impact, but an attacker can still consume processing
   capacity. Add an edge rate limit.
4. **No maker-checker.** A single admin can approve and pay a refund/payout.
5. **No provider settlement reconciliation.** Gateway fees and chargebacks are
   not represented in the ledger.
6. **No automated expiry.** Pending orders remain pending indefinitely.
7. **No dispute-window enforcement.** Settlement timing is operator-controlled.
8. **No full audit immutability proof.** Audit rows are append-only by
   convention; database-level triggers preventing update/delete are not present
   in this phase.
