# 14 — Payments, Refunds, Ledger and Settlement

Verify provider availability, merchant onboarding, fees, sandbox, signatures, settlement timing, refunds and supported methods using official documentation and direct provider confirmation. Do not invent capability or enable live credentials before approval.

Payment lifecycle: `created -> pending -> succeeded|failed|expired`; refund: `requested -> approved -> processing -> succeeded|failed|rejected`; payout: `queued -> processing -> paid|failed|reversed`. Browser redirect is not payment proof. Verify server-side.

If the platform creates financial obligations, use accounting-reviewed journal design. Posted journals are append-only; correct errors with reversals. Debits equal credits per journal/currency. Potential accounts: provider clearing, platform cash/clearing, tutor payable, commission revenue, refund liability, fee expense. Final treatment requires accounting review.

Webhook flow: authenticate signature; enforce replay policy; store provider event ID uniquely; process idempotently; verify transaction with provider if required; transactionally update payment/ledger/outbox; notify asynchronously; log redacted audit. Reconcile provider transactions/settlements with internal orders and flag mismatch/duplicates/delays.

Tests: invalid signature rejected; duplicate event creates no duplicate posting; amount/currency mismatch rejected; failed payment never shown as paid; refund cannot exceed balance; payout retry idempotent; journals balance; reconciliation detects missing settlement.
