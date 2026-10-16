# ADR-006: Monorepo Architecture with pnpm Workspaces & Turborepo

**Status:** Accepted  
**Deciders:** Principal Architect, DevOps Lead  
**Date:** 2026-10-10

## Context

The tutoring platform consists of a Next.js frontend, a NestJS backend, shared type definitions, Zod validation contracts, and centralized configuration. Maintaining separate repositories would cause contract drift and double deployments. Conversely, complex monorepo tools like Nx introduce substantial overhead.

## Decision

Adopt **pnpm workspaces** combined with **Turborepo**:

- `pnpm` provides fast, disk-efficient package management, strict non-flat `node_modules` (preventing phantom dependencies), and simple `workspace:*` linking.
- `Turborepo` orchestrates parallel task execution (`build`, `lint`, `test`, `typecheck`) with local and remote hash-based caching.
- Shared packages:
  - `@ogroniedu/contracts`: Isomorphic TypeScript interfaces, Zod schemas, notification catalog, and DTOs.
  - `@ogroniedu/tsconfig`: Base TypeScript configurations.
  - `@ogroniedu/config`: Centralized lint and format standards.

## Consequences

- **Positive:** Type-safe shared contracts between frontend and backend; cached incremental builds; rapid local developer onboarding; reproducible lockfile.
- **Negative:** Requires monorepo awareness when structuring imports (e.g. keeping contracts browser-safe).
