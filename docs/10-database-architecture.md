# 10 — Database Architecture

PostgreSQL is authoritative. Use UUIDs where useful, `timestamptz` for instants, IANA timezone for recurring local schedules, integer minor units plus ISO currency for money, foreign keys/check/unique constraints, explicit state transitions, and append-only posted ledger entries. Use soft delete only where justified by privacy and audit rules.

A preflight schedule query is not concurrency protection. Use a DB exclusion constraint or transaction/locking strategy and test concurrent inserts. Store private file metadata/access rules; do not expose permanent public URLs for identity evidence.

Migrations are versioned. Never use ORM schema synchronization in production. Test from empty DB and prior release; use expand/migrate/contract for risky changes. Seed reference data idempotently; production seed must not create demo users.

Index foreign keys and frequent filter/order combinations based on real query patterns. Use deterministic pagination and `EXPLAIN (ANALYZE, BUFFERS)` on representative data. If organizations are added, define ownership/isolation before adding tenant columns.
