# 07 — System Architecture

## Recommended shape

Next.js web app plus NestJS modular monolith. Domain modules: Identity/Access; Users/Guardian Links; Tutor Profile/Verification; Reference Catalog; Discovery/Matching; Requests/Booking; Scheduling/Sessions; Learning; Payments/Ledger; Notifications/Messaging; Reviews/Trust; Support/Disputes; Admin; Analytics; Files; Audit/Compliance.

## Boundaries

Modules own their persistence and business rules. Cross-module work uses exported application services or typed domain events, not arbitrary repository access. Avoid circular dependencies. Critical multi-table state changes use transactions. Do not make slow network calls inside a DB transaction.

## Events

Booking confirmed -> reminders; tutor verification changed -> discovery eligibility; payment verified -> ledger/receipt; session completed -> learning follow-up; dispute opened -> support queue. For important committed events, use transactional outbox + idempotent worker. Add a dedicated broker only when measured needs justify it.

## Source of truth

PostgreSQL stores identity, relationships, bookings, learning and financial state. Redis is disposable cache/queue infrastructure. Object storage contains files; DB stores metadata/access policy.

## Reliability

Idempotency for retried operations, DB-backed schedule conflict protection, retries/backoff, failed-job monitoring, correlation IDs, health/readiness, graceful shutdown, connection-pool limits and restore drills.
