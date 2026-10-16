# ADR-008: Architecture, Monorepo Foundation & Centralized State Management

## Status

**Accepted** (2026-10-10)

## Context

OgroniEdu is designed as an enterprise educational platform serving Bangladesh. The platform requires high developer velocity, strict type safety, zero phantom dependencies, reproducible build pipelines, resilient client-side state management, structured backend telemetry, and automated health checks for container orchestrators.

Key decisions were required for:

1. Workspace tooling and build cache orchestration.
2. Client-side state management and API data fetching layer.
3. Server telemetry, request correlation, and standardized exception handling.
4. Continuous integration validation.

## Decision

### 1. Monorepo Package Management & Build Pipeline

- Adopted **pnpm 12.10.1 workspaces** with strict non-flat `node_modules` structure to prevent phantom dependencies and enforce supply-chain integrity.
- Adopted **Turborepo 2.11.7** for topological build graphs, pipeline execution caching, and incremental compilation across `apps/` and `packages/`.

### 2. Centralized Client State Management & API Fetching (RTK Query)

- Adopted **Redux Toolkit (RTK) 2.x** and **RTK Query** in `apps/web`:
  - **Predictable Global Client State:** Modular slices for authentication (`authSlice`) and interface interactions (`uiSlice`).
  - **Normalized Server Cache:** RTK Query `baseApi` handles automated request caching, deduplication, optimistic updates, and cache invalidation via declarative tag types (`['Notification', 'UnreadCount', 'User', 'Session']`).
  - **Hermetic SSR Integration:** App Router `StoreProvider` initializes store instances per client tree using `useRef`, preventing cross-request state pollution during Server-Side Rendering (SSR).
  - **Automatic Header Injection:** `prepareHeaders` automatically injects `x-request-id` correlation tokens, `Authorization: Bearer <token>`, and `x-locale` language headers on every HTTP call.

### 3. Server Telemetry & Observability

- Adopted **Structured JSON Logging** (`StructuredLoggerService`) emitting standardized log payloads with timestamp, log level, context, correlation request ID, and automatic PII masking (passwords, tokens, NID, OTPs).
- Implemented **RequestIdMiddleware** parsing incoming `x-request-id` headers or generating UUID v4 correlation IDs, reflecting them onto HTTP response headers.
- Implemented **AllExceptionsFilter** catching all HTTP and unhandled exceptions to return canonical error payloads (`statusCode`, `error`, `message`, `timestamp`, `path`, `requestId`).

### 4. Container Health & Readiness Probes

- Adopted **@nestjs/terminus** in `HealthModule`:
  - `GET /health/live`: Liveness probe verifying event loop responsiveness and process uptime.
  - `GET /health/ready`: Readiness probe verifying PostgreSQL connection ping and memory heap thresholds (<300MB).

### 5. Automated Continuous Integration

- Configured GitHub Actions (`.github/workflows/ci.yml`) enforcing frozen lockfile installation, Prettier formatting verification, documentation integrity validation, strict type checking, unit test execution, and production bundle builds on all pull requests and pushes.

## Consequences

### Positive

- Strict isolation and zero accidental dependencies across packages.
- Frontend components achieve instant, cached API queries with automatic cache invalidation upon mutation.
- Production errors can be immediately correlated across frontend and backend using `x-request-id`.
- Container orchestrators (Kubernetes / ECS) can accurately govern traffic routing using `/health/live` and `/health/ready`.

### Negative / Trade-offs

- Slight initial setup overhead for RTK Query endpoint definitions and Redux provider boilerplate.
- Developers must adhere to declarative cache tag invalidation patterns.
