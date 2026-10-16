# OgroniEdu — Verified Technology Stack

**Verification Date:** 2026-10-10  
**Authority:** Official npm Registry, Node.js Foundation, NestJS Releases, Next.js Releases, PostgreSQL Core  
**Standard:** Production Stable, Zero Unverified Betas/Canaries in Core

---

## 1. Stack Overview

| Domain / Layer                 | Technology Chosen              | Verified Version                    | Official Source / Registry Tag | Architectural Justification                                                                                                                      |
| ------------------------------ | ------------------------------ | ----------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Runtime Environment**        | Node.js                        | v26.8.1 (System) / v22+ LTS Target  | `nodejs.org`                   | High-performance V8 engine, native fetch, web streams, strict ESM & CJS support.                                                                 |
| **Package Manager**            | pnpm                           | 12.4.2                              | `pnpm.io`                      | Content-addressable storage, strict non-flat `node_modules` preventing phantom dependencies, fast workspace symlinking.                          |
| **Build & Orchestration**      | Turborepo                      | 2.11.7                              | `turbo.build`                  | Remote/local computation caching, topological dependency graph execution, fast incremental builds.                                               |
| **Frontend Framework**         | Next.js (App Router)           | 16.4.0 (or 15.x LTS)                | `npm:next@latest`              | Server Components (RSC), Streaming SSR, route handlers, enhanced SEO, mobile-optimized asset bundling.                                           |
| **UI Library & Primitives**    | React / React DOM              | 19.3.0                              | `npm:react@latest`             | Concurrent rendering, Actions, Server Functions, high responsiveness.                                                                            |
| **Styling & Design System**    | Tailwind CSS + shadcn/ui       | Tailwind 4.3.3 / compatible setup   | `tailwindcss.com`              | Utility-first CSS, Radix UI accessible headless primitives, zero runtime style overhead, dark/light theme support.                               |
| **State Management**           | Redux Toolkit & RTK Query      | 2.13.0                              | `redux-toolkit.js.org`         | Predictable centralized client state, automated cache invalidation, typed hooks for complex student/tutor workflows.                             |
| **Forms & Validation**         | React Hook Form + Zod          | RHF 7.89.0 + Zod 3.24.2 / 4.x       | `react-hook-form.com`          | High-performance uncontrolled forms, minimal re-renders, isomorphic schema validation shared with backend contracts.                             |
| **Localization (i18n)**        | next-intl                      | 4.14.9                              | `next-intl-docs.vercel.app`    | First-class Next.js App Router support, type-safe translation keys, server & client component translations for Bangla (`bn`) and English (`en`). |
| **Icons & Visuals**            | Lucide React                   | 1.54.0                              | `lucide.dev`                   | Clean, accessible SVG iconography with tree-shaking and zero bloat.                                                                              |
| **Date & Time**                | date-fns                       | 4.4.0                               | `date-fns.org`                 | Immutable, tree-shakeable date mathematics, `Asia/Dhaka` timezone calculations, locale formatting.                                               |
| **Data Visualization**         | Recharts                       | 3.10.1                              | `recharts.org`                 | Responsive SVG charts for guardian progress reports, attendance trends, and tutor earnings analytics.                                            |
| **Backend Framework**          | NestJS                         | 12.1.2                              | `nestjs.com`                   | Enterprise TypeScript framework, modular architecture, dependency injection, first-class WebSocket and Swagger support.                          |
| **WebSocket / Real-Time**      | Socket.IO (Server & Client)    | 4.8.4                               | `socket.io`                    | Resilient bidirectional communication, automatic reconnection, room-based multicasting, heartbeat/ack protocols.                                 |
| **Database Engine**            | PostgreSQL                     | 18 (Local Service) / 16+ Production | `postgresql.org`               | ACID guarantees, GiST exclusion constraints for schedule conflict prevention, JSONB flexibility, pgcrypto.                                       |
| **Object-Relational Mapping**  | TypeORM + pg driver            | TypeORM 1.1.2 / 0.3.x + pg 8.23.1   | `typeorm.io`                   | Decorator-driven domain entities, typed query builder, migration CLI, first-class NestJS integration.                                            |
| **Cache & Distributed Store**  | Redis + ioredis                | Redis 7.x / ioredis 6.0.0           | `redis.io`                     | In-memory key-value store, pub/sub, rate limiting, distributed session store.                                                                    |
| **Background Job Processing**  | BullMQ                         | 6.3.12                              | `docs.bullmq.io`               | Redis-backed robust job queue, delayed jobs, retries with exponential backoff, dead-letter queues.                                               |
| **API Documentation**          | @nestjs/swagger                | 12.0.2                              | `docs.nestjs.com/openapi`      | OpenAPI 3.0 specification auto-generated from TypeScript DTOs and decorators.                                                                    |
| **Logging & Telemetry**        | Winston / Pino                 | Winston 3.19.0 / Pino 9.x           | `github.com/winstonjs/winston` | Structured JSON logging, PII sanitization masks, request correlation ID tracing.                                                                 |
| **End-to-End Testing**         | Playwright                     | 1.64.0                              | `playwright.dev`               | Cross-browser automated user journeys (Chromium, Firefox, WebKit), mobile viewport emulation, visual regression.                                 |
| **Unit & Integration Testing** | Vitest / Jest                  | Vitest 5.0.3 / Jest 29.x            | `vitest.dev`                   | Instant HMR test runner, ESM-native execution, compatible with `@testing-library/react`.                                                         |
| **Code Quality & Linting**     | ESLint + Prettier + TypeScript | TS 5.8+ / ESLint 9+ / Prettier 3+   | `typescriptlang.org`           | Strict compiler settings (`noImplicitAny: true`, `strictNullChecks: true`), automated formatting.                                                |

---

## 2. Monorepo Organization

```text
ogroniedu/
├── apps/
│   ├── api/                  # NestJS 12 Modular Monolith Backend
│   └── web/                  # Next.js 16/15 App Router Frontend
├── packages/
│   ├── contracts/            # Shared DTOs, Zod Schemas, Notification Catalog, Event Types
│   ├── config/               # Shared ESLint, Prettier, Environment validation
│   └── tsconfig/             # Base TypeScript Configurations
├── docs/                     # Canonical Product & Engineering Blueprint
├── prompts/                  # 24 Self-Contained AI Coding Prompts
├── pnpm-workspace.yaml       # pnpm Monorepo Workspace Definition
├── turbo.json                # Turborepo Build & Task Graph Pipeline
└── package.json              # Monorepo Root Manifest
```

---

## 3. Dependency Installation Rule

All dependencies must be installed exclusively using terminal CLI commands:

- Root dev tools: `pnpm add -D -w <package>`
- App-specific dependencies: `pnpm add --filter <app-name> <package>`
- Component additions: `pnpm dlx shadcn@latest add <component>`
  Direct manual editing of dependencies into `package.json` without running CLI installation is strictly forbidden to preserve lockfile integrity.
