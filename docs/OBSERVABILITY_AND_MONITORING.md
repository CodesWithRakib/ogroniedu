# OgroniEdu — Observability, Monitoring & Health Checks

**Date:** 2026-10-10  
**Stack:** Winston/Pino (Structured Logs), Prometheus Metrics, OpenTelemetry Tracing  
**Status:** Approved Standard

---

## 1. Health & Readiness Probes

The backend exposes standardized endpoints under `/health`:

1. **`GET /health/liveness`:**
   - Returns `200 OK` if the Node.js process is active and event loop is responsive.
2. **`GET /health/readiness`:**
   - Performs shallow dependency checks:
     - PostgreSQL database connectivity (`SELECT 1`).
     - Redis connection ping (`PING -> PONG`).
     - Disk storage availability.
   - Returns `200 OK` `{ status: "ok", info: { db: { status: "up" }, redis: { status: "up" } } }` or `503 Service Unavailable`.

---

## 2. Structured Logging Standards

- Format: Single-line JSON in production.
- Mandatory Fields:
  - `timestamp`: ISO-8601 UTC string.
  - `level`: `error`, `warn`, `info`, `debug`.
  - `message`: Clear, human-readable summary.
  - `context`: Module or service name (e.g. `NotificationService`).
  - `requestId`: Distributed tracing ID propagated from HTTP/WebSocket request.
  - `userId`: Hash or UUID of the authenticated actor (never raw phone/email).
- PII Sanitization: Automatic masking of passwords, credit cards, NID numbers, and token secrets.

---

## 3. Real-Time Telemetry & Metrics

Key Prometheus metrics tracked:

- `http_requests_total{method, route, status}`
- `http_request_duration_seconds{method, route}` (P50, P90, P99 latency percentiles)
- `socket_connected_clients_gauge`
- `notifications_dispatched_total{channel, type, status}`
- `outbox_events_backlog_gauge` (alerts triggered if backlog > 50 for > 5 minutes)
- `db_connection_pool_active_gauge`
