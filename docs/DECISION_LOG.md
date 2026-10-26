# OgroniEdu — Architecture & Product Decision Log (ADR Register)

**Document Reference:** `docs/DECISION_LOG.md`  
**Current Date:** 2026-10-22  
**Status:** Approved Architectural Baseline  
**Scope:** Formal records of architectural, engineering, and product decisions.

---

## 1. Decision Summary Index

| ADR ID     | Title                                                        |    Date    |  Status  | Impact Areas                             |
| ---------- | ------------------------------------------------------------ | :--------: | :------: | ---------------------------------------- |
| **ADR-01** | Turborepo Monorepo Architecture                              | 2026-10-10 | Accepted | Monorepo structure, tooling, CI/CD       |
| **ADR-02** | Next.js 16 App Router & Redux Toolkit RTK Query              | 2026-10-10 | Accepted | Frontend architecture, state management  |
| **ADR-03** | NestJS Modular Architecture with PostgreSQL 18               | 2026-10-10 | Accepted | Backend architecture, micro-modules, DI  |
| **ADR-04** | Double-Entry Immutable Accounting Ledger for Escrow          | 2026-10-12 | Accepted | Financial integrity, payments, escrow    |
| **ADR-05** | Socket.IO for Real-Time Whiteboard & Notifications           | 2026-10-14 | Accepted | Real-time synchronization, WebSockets    |
| **ADR-06** | In-App Primary Notifications with Decoupled Gateway Adapters | 2026-10-15 | Accepted | Notification architecture, telco SMS     |
| **ADR-07** | Minor Protection via Mandatory Guardian Pairing & Holds      | 2026-10-16 | Accepted | Safeguarding, legal compliance, minors   |
| **ADR-08** | Fluid Full-Width Dashboard Canvas & Unified Design Tokens    | 2026-10-18 | Accepted | UI/UX design system, dashboard styling   |
| **ADR-09** | Strictly Audited 15-Minute Staff Impersonation Protocol      | 2026-10-19 | Accepted | Support operations, security audit trail |
| **ADR-10** | Sequential Approval-Driven Quality Engineering Lifecycle     | 2026-10-22 | Accepted | Quality gates, verification standards    |

---

## 2. Architectural Decision Records (ADRs)

### ADR-01: Turborepo Monorepo Architecture

- **Context:** OgroniEdu requires a frontend web application, a backend API service, shared contracts/validation schemas, and tooling configurations.
- **Decision:** Adopt a Turborepo monorepo orchestrated with pnpm workspaces.
- **Consequences:** Eliminates code duplication across frontend and backend; enables atomic commits and shared TypeScript types; cached incremental builds.

---

### ADR-02: Next.js 16 App Router & Redux Toolkit (RTK Query)

- **Context:** The frontend needs server-side rendering for public marketing/tutor discovery, combined with high-performance client-side interactivity in the dashboard.
- **Decision:** Utilize Next.js 16 App Router with Redux Toolkit and RTK Query for data fetching, caching, and optimistic UI updates.
- **Consequences:** Automatic request deduplication, normalized caching, zero waterfall data requests, and smooth offline recovery.

---

### ADR-03: NestJS Modular Architecture with PostgreSQL 18

- **Context:** The backend must handle high concurrency, transactional integrity, role-based security, and clear separation of business domains.
- **Decision:** Build on NestJS with strict domain modules (`users`, `tutors`, `bookings`, `sessions`, `payments`, `safeguarding`, `notifications`). Run PostgreSQL 18 with native schema migrations.
- **Consequences:** Strict dependency injection, easily testable controllers/services, and rock-solid relational integrity with foreign keys and GiST exclusion locks.

---

### ADR-04: Double-Entry Immutable Accounting Ledger for Escrow

- **Context:** Tutoring platforms in Bangladesh suffer from payment disputes, fraudulent claims, and delayed tutor payouts.
- **Decision:** All financial transactions (deposits, escrow holds, milestone releases, commission fees, refunds, and withdrawals) are recorded as immutable double-entry ledger rows where `SUM(debit) == SUM(credit)`.
- **Consequences:** Eliminates balance drift; allows mathematically provable audits; prevents payout of unearned escrow funds.

---

### ADR-05: Socket.IO for Real-Time Whiteboard & Notifications

- **Context:** Live classrooms need low-latency collaborative drawing, and users require immediate notification alerts for bookings and messages.
- **Decision:** Use Socket.IO with WebSocket transport and authenticated rooms based on user ID and session ID.
- **Consequences:** Sub-80ms bidirectional communication, automatic reconnect logic, and reliable room-based broadcasting.

---

### ADR-06: In-App Primary Notifications with Decoupled Gateway Adapters

- **Context:** In Bangladesh, commercial telco SMS gateways (SSL Wireless, Greenweb) incur ongoing per-message costs and rate limits.
- **Decision:** In-app real-time WebSocket notifications backed by PostgreSQL persistence are the canonical source of truth. SMS and Email gateways operate as decoupled asynchronous worker adapters.
- **Consequences:** The platform operates fully without external telecommunications dependencies in local and development environments; zero credit drainage during testing.

---

### ADR-07: Minor Protection via Mandatory Guardian Pairing & Holds

- **Context:** Minors (<18 years) participate in 1-on-1 tutoring sessions with adult educators.
- **Decision:**
  1. Students under 18 must be paired with an authorized guardian before booking paid sessions.
  2. Any high-severity safety report immediately triggers an automated protective hold on the tutor.
- **Consequences:** Eliminates legal liability; protects children from potential abuse; gives guardians full financial and academic oversight.

---

### ADR-08: Fluid Full-Width Dashboard Canvas & Unified Design Tokens

- **Context:** Users on 1440p, 4K, and ultra-wide displays reported restricted dashboard widths and dark-mode color clashes.
- **Decision:** Transition dashboard layout to a fluid full-width container (`w-full px-4 lg:px-8`) and enforce system-wide gradient button tokens and semantic Tailwind colors (`bg-background`, `bg-card`, `text-foreground`).
- **Consequences:** High visual density on wide monitors; eliminates awkward letterboxing; consistent brand feel across hero, tutor directory, and dashboard screens.

---

### ADR-09: Strictly Audited 15-Minute Staff Impersonation Protocol

- **Context:** Customer support and QA staff require the ability to diagnose complex, user-reported UI states without asking for passwords.
- **Decision:** Allow Super Admins to generate 15-minute cryptographically signed impersonation JWTs. Financial payouts and credential changes are blocked in impersonated mode, and all operations write to `audit_logs`.
- **Consequences:** Fast dispute diagnosis without compromising user security or ledger integrity.

---

### ADR-10: Sequential Approval-Driven Quality Engineering Lifecycle

- **Context:** Large monolithic refactorings often introduce subtle regressions, broken tests, or incomplete features.
- **Decision:** Adopt strict sequential phases (Phases 0–15) where each phase must achieve 100% test pass rates and verification before awaiting explicit user approval (`next`) to continue.
- **Consequences:** Zero unverified code in production; total predictability and transparency for stakeholders.
