# ADR-002 — PostgreSQL Source of Truth

Status: Proposed. Store identity relationships, bookings, learning records and financial state in PostgreSQL for referential integrity and transactions. Use cache/search/analytics stores only when measured needs justify them; PostgreSQL remains authoritative for transactional state.
