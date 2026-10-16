# ADR-003 — Transactional Outbox

Status: Proposed. Persist important event intent in the same transaction as business state, then publish asynchronously. This avoids a DB commit succeeding while event publishing fails. Workers need retry, idempotency, monitoring and retention.
