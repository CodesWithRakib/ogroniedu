# Phase 10: Search, SEO, Performance, Accessibility & Production Readiness
## Monitoring & Error Handling Policy

This document outlines platform observability, health probe contracts, logging standards, and resilient error recovery mechanisms.

---

## 1. Container & Cluster Health Probes

Implemented via `@nestjs/terminus` in `HealthController` (`/health`):

### 1. Liveness Probe (`GET /health/live`)
- **Purpose:** Verifies that the Node.js event loop is unblocked and responsive.
- **Contract:** Returns HTTP 200 with `{ status: 'ok', uptime: number, timestamp: string }`.
- **Failure Action:** Container orchestrator (Kubernetes / ECS / Docker) restarts the unhealthy container.

### 2. Readiness Probe (`GET /health/ready`)
- **Purpose:** Verifies that database connection pools and memory heaps are healthy before directing inbound client traffic.
- **Contract:** Executes `SELECT 1` on PostgreSQL and inspects heap allocation.
- **Failure Action:** Load balancer removes the instance from the active target group until recovery.

---

## 2. Structured Logging & PII Protection

1. **Correlation Tracking:** Every inbound request is assigned a unique `x-request-id` header (or UUID generated on the fly) injected into log messages and response headers.
2. **Strict Redaction Invariant:**
   - Passwords, JWT tokens, OTP verification codes, bKash/Nagad PINs, credit card numbers, and NID documents are NEVER written to server logs.
   - Database connection strings containing passwords are obfuscated before emission.

---

## 3. Frontend Error Boundaries & Graceful Degradation

1. **Root Global Error (`global-error.tsx`):**
   - Catches fatal layout or root hydration crashes, rendering a high-accessibility fallback with reload trigger.
2. **Route-Level Error (`error.tsx`):**
   - Catches route-specific exceptions while maintaining the global navigation shell.
   - Provides localized error messages and a safe "Try Again" retry button.
3. **Not-Found Boundary (`not-found.tsx`):**
   - Branded 404 screen assisting lost users with quick links back to Home, Tutor Catalog, or Student Dashboard.
