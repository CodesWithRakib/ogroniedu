# ADR-008: Architecture, Monorepo Foundation & Centralized State Management

## Status
**Accepted** (2026-10-10)

## Context
OgroniEdu is designed as an enterprise educational platform serving Bangladesh. The platform requires high developer velocity, strict type safety, zero phantom dependencies, reproducible build pipelines, resilient client-side state management, structured backend telemetry, and automated health checks for container orchestrators.

## Decision
1. Monorepo Package Management & Build Pipeline: Adopted pnpm 12 workspaces and Turborepo 2.11.
2. Centralized Client State Management & API Fetching: Adopted Redux Toolkit 2.x and RTK Query in `apps/web`.
3. Server Telemetry & Observability: Adopted Structured JSON Logging with `x-request-id` correlation and canonical HTTP exception filtering.
4. Health Probes: Adopted `@nestjs/terminus` for liveness (`/health/live`) and readiness (`/health/ready`).
5. Automated CI: Configured GitHub Actions CI pipeline.
