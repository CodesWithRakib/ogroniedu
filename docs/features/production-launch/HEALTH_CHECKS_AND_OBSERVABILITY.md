# OgroniEdu — Health Checks & Observability Guide

## 1. Health Probe Specifications

OgroniEdu provides standardized liveness and readiness probes compatible with Kubernetes, AWS ECS, Google Cloud Run, and Docker Swarm.

Probes are registered under `@Controller(['health', 'api/health'])` in `apps/api/src/modules/health/health.controller.ts`, allowing direct container access as well as reverse-proxy routed access.

### 1.1 Liveness Probe (`GET /health/liveness`, `GET /health/live`, `GET /health`)
- **Purpose:** Verifies that the Node.js event loop is unblocked and the HTTP server is actively accepting TCP connections.
- **Probe Interval:** Every 10 seconds.
- **Failure Threshold:** 3 consecutive failures trigger a container restart.
- **Sample 200 OK Response:**
  ```json
  {
    "status": "ok",
    "uptime": 245.89,
    "timestamp": "2026-10-21T14:02:15.120Z"
  }
  ```

### 1.2 Readiness Probe (`GET /health/readiness`, `GET /health/ready`)
- **Purpose:** Verifies that critical external dependencies (PostgreSQL database connection, memory heap limits) are healthy and ready to accept traffic.
- **Probe Interval:** Every 5 seconds during rolling updates; every 15 seconds during normal operation.
- **Failure Action:** Removes the container from the load balancer rotation without restarting the process.
- **Production Invariant:** When `NODE_ENV === 'production'`, database connectivity failure throws a `ServiceUnavailableException` (HTTP 503) to ensure traffic is never routed to an unready container.
- **Sample 200 OK Response:**
  ```json
  {
    "status": "ok",
    "info": {
      "database": {
        "status": "up"
      },
      "memory_heap": {
        "status": "up"
      }
    },
    "error": {},
    "details": {
      "database": {
        "status": "up"
      },
      "memory_heap": {
        "status": "up"
      }
    }
  }
  ```

---

## 2. Structured Logging & Distributed Tracing

### 2.1 Correlation Request ID
Every HTTP request is assigned a unique UUID `requestId` via `RequestIdMiddleware`:
1. If the inbound request carries `x-request-id`, it is preserved.
2. Otherwise, a cryptographically secure UUIDv4 is generated.
3. The `requestId` is attached to `request.requestId` and returned in the HTTP response header `x-request-id`.
4. The `ResponseMetaInterceptor` injects `meta.requestId` into all JSON success payloads.
5. The `AllExceptionsFilter` injects `meta.requestId` into all JSON error payloads.

### 2.2 Structured JSON Logging Format
In production, log outputs are formatted as structured JSON for ingestion by centralized log collectors (e.g. Datadog, Grafana Loki, AWS CloudWatch):

```json
{
  "timestamp": "2026-10-21T14:03:10.452Z",
  "level": "INFO",
  "context": "PaymentsService",
  "requestId": "c965f0b5-c3d2-4269-842c-f4734d9f7cab",
  "message": "Payment intent created successfully for booking_id: 871a9... amount: 1500 BDT",
  "userId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```

### 2.3 Strict Sensitive Data Masking Standard
The following attributes are strictly filtered and masked prior to logging:
- Passwords and password confirmation hashes
- One-Time Passwords (OTPs) and magic link tokens
- JWT refresh tokens and bearer authorization tokens
- Payment card numbers, CVVs, and bKash PINs
- Personally Identifiable Information (PII) of minors

---

## 3. Metrics & Monitoring Integration

| Metric Name | Type | Target Threshold | Action on Breach |
| :--- | :--- | :--- | :--- |
| `http_requests_total` | Counter | N/A | Traffic volume monitoring |
| `http_request_duration_seconds` | Histogram | p95 < 500ms, p99 < 1500ms | Performance optimization alert |
| `http_response_5xx_total` | Counter | < 0.5% of total requests | P1 Incident escalation |
| `db_pool_active_connections` | Gauge | < 80% of max pool size | Increase pool or scale read replicas |
| `process_heap_used_bytes` | Gauge | < 300 MB | Container memory threshold alarm |
