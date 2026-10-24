# Phase 05 — Event-Driven Architecture & Transactional Outbox

**Phase ID:** `PHASE-05`  
**Phase Name:** Event-Driven Architecture & Transactional Outbox  
**Estimated Effort:** 0.5 Day (Day 5)  
**Status:** READY  
**Owner:** Backend Lead & Distributed Systems Architect

---

## 1. Objective and Business Justification
Guarantee data consistency and event delivery reliability across all domain workflows (bookings, payments, notifications, safety holds, tutor replacements). Ensure zero split-brain between database transactions and asynchronous side effects by enforcing the transactional outbox pattern.

---

## 2. Current-State Findings and Evidence
- `outbox` table exists in PostgreSQL (`packages/database/src/migrations/001_initial_schema.sql`).
- `OutboxWorkerService` runs on a 10s polling loop, querying pending events and dispatching them to domain handlers.
- Idempotency is supported via `idempotency_key` columns on `payment_orders` and `payment_webhooks`.
- Gaps: Dead-letter alerting on max retries ($\ge 5$) needs structured logging; event payload schemas in `packages/contracts/src/notification-registry.ts` are monolithic (1,148 lines).

---

## 3. Exact Scope
1. Enforce strict transactional outbox insertion within the same PostgreSQL transaction for all mutating service operations (`bookings.service.ts`, `payments.service.ts`, `tutor-replacement.service.ts`).
2. Add structured dead-letter alert logging in `OutboxWorkerService` when an event reaches 5 consecutive failed attempts.
3. Verify idempotency of duplicate payment webhook events and booking transition events.
4. Ensure event payloads contain only identifiers and non-sensitive data (zero passwords, tokens, or PII).

---

## 4. Explicit Exclusions
- Do not introduce Kafka, RabbitMQ, or AWS SQS during the 7-day MVP window (PostgreSQL `outbox` table provides ACID transactional consistency and is verified).

---

## 5. Prerequisite Phases
- `PHASE-03-BACKEND-SERVICE-INTERFACE-MODULARIZATION.md`
- `PHASE-04-SECURITY-HARDENING-AND-STORAGE-ACCESS.md`

---

## 6. Tasks and Unique Task IDs
- `EVT-001`: Harden transactional outbox event publishing & retry dead-letter alerts in `OutboxWorkerService`.
- `EVT-002`: Verify idempotency of payment webhook outbox events.
- `EVT-003`: Verify booking expiry event emission and notification delivery.

---

## 7. Actual Affected Files and Modules
- `apps/api/src/modules/notifications/outbox-worker.service.ts`
- `apps/api/src/modules/payments/services/payment-webhooks.service.ts`
- `apps/api/src/modules/bookings/services/booking-expiry.service.ts`
- `apps/api/test/idempotency.spec.ts`

---

## 8. Files Created, Split, Moved, or Removed
- Modified: `outbox-worker.service.ts`, test specs.

---

## 9. Frontend Work
- None.

---

## 10. Backend Work
- Refine polling query with `FOR UPDATE SKIP LOCKED`.
- Ensure handler errors capture stack traces into `outbox.last_error`.

---

## 11. Database and Migration Work
- Verify index on `outbox(status, created_at)`.

---

## 12. Event-Driven Architecture Work
- Enforce domain event decoupling between bookings and payment escrow release.

---

## 13. Security Requirements
- Ensure event payloads do not leak sensitive credentials or payment secrets.

---

## 14. Unit Test Requirements
- `apps/api/test/idempotency.spec.ts` passes 7/7 tests.

---

## 15. Integration Test Requirements
- Verify that a failed event handler increments `retry_count` and transitions to `failed` after 5 attempts.

---

## 16. Browser Automation and E2E Scenarios
- N/A; verified through backend integration tests.

---

## 17. Required Commands
```pwsh
pnpm --filter @ogroniedu/api test test/idempotency.spec.ts
```

---

## 18. Acceptance Criteria
1. Mutating domain operations reliably write events to `outbox`.
2. Outbox worker processes events with zero duplicate deliveries.
3. Handlers failing 5 times are marked `failed` with structured dead-letter alert.

---

## 19. Failure and Rollback Considerations
- If outbox worker crashes, pending events remain in the database and are picked up upon process restart.

---

## 20. Definition of Done
- Outbox worker verified, idempotency confirmed, dead-letter alerts active.

---

## 21. Expected Evidence
- Test execution output of `idempotency.spec.ts`.

---

## 22. Known Risks and Blockers
- None.

---

## 23. Estimated Effort
- 0.5 Day.

---

## 24. Next-Phase Dependencies
- Unblocks `PHASE-06-DATABASE-INTEGRITY-AND-MIGRATIONS.md` and `PHASE-07-CORE-MARKETPLACE-AND-BOOKINGS-WORKFLOW.md`.
