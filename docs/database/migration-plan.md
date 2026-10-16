# Database Migration Plan

1. Establish migration tooling and isolated test DB.
2. Create identity and reference tables.
3. Add student/guardian and tutor profiles.
4. Add tutor capabilities and verification.
5. Add request/booking/session tables and overlap strategy.
6. Add learning records.
7. Add payment/ledger tables only after accounting decision.
8. Add notifications, support, disputes, audit, outbox and idempotency.
9. Add indexes based on query patterns.
10. Validate from empty DB and previous release.

Never use production schema synchronization. Review migrations manually. Use backward-compatible expand/contract for large changes. Seeds are idempotent; financial history must not be silently rewritten.
