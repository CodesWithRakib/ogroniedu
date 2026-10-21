# API & Contract Stability Specification — OgroniEdu (অগ্রণী এডু)

## 1. Contract Stability Principles

The API and Contract layer provides the stable interface between the Next.js frontend, mobile PWA clients, internal microservices, and external webhook providers. Contract stability ensures that internal refactoring within services or database tables never causes breaking changes for client applications.

---

## 2. API Contract Invariants

1. **Explicit DTO Boundaries**: Every controller endpoint must consume an explicit, class-validator-annotated DTO and produce a typed response conforming to an interface in `@ogroniedu/contracts`.
2. **Canonical Envelope Structure**:
   - `SuccessEnvelope<T>` wraps all successful responses (`200 OK`, `201 Created`).
   - `ErrorEnvelope` wraps all client and server error responses (`4xx`, `5xx`).
3. **No Direct ORM Leaks**: TypeORM entities must NEVER be returned directly from controllers. They must be mapped to clean DTOs, stripping sensitive columns (e.g. `password_hash`, `otp_secret`, `bKash_access_token`).
4. **Stable Date & Time Formats**: All dates and timestamps are serialized as ISO-8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
5. **Integer Minor Currency Units**: All financial sums are denominated in integer `poisha` (1 BDT = 100 poisha). Decimal representations (`total_bdt`) are only provided as computed convenience getters.
6. **Cursor-Based & Offset Pagination Standards**:
   - High-throughput chronological feeds (notifications, audit logs, messages) utilize base64-encoded cursor pagination (`limit`, `cursor`).
   - Tabular datasets (admin users, organizations, disputes) utilize standard offset pagination (`page`, `limit`).

---

## 3. Versioning & Deprecation Policy

- **Current API Version**: `/api/v1`
- **Deprecation Grace Period**: Any public endpoint scheduled for deprecation must remain functional for at least one minor release cycle, returning a `Deprecation: true` HTTP response header and logging a warning to the audit trail.
- **Breaking Changes Prohibition**: Modifying field names, changing enum serialization formats, or making previously optional request fields mandatory is prohibited without an explicit migration plan and dual-version compatibility.
