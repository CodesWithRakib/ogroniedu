# OgroniEdu (অগ্রণী এডু)

> **Enterprise Tutoring Marketplace, Learning Management & Tutor Workspace Platform for Bangladesh**  
> Serving Class 1–12, Bangla & English Medium/Version, Madrasah, and University Admission Preparation.

---

## 1. Overview & Vision

**OgroniEdu** transforms academic tutoring in Bangladesh from informal, unverified arrangements into a trusted, structured educational ecosystem. Built specifically for the Bangladesh educational landscape, it combines:

- **Verified Tutor Discovery & Matching:** Strict NID and university credential verification, localized search across 64 districts and upazilas, and guaranteed tutor replacements.
- **Parental Peace of Mind:** Multi-child management for guardians, server-enforced data privacy, real-time attendance alerts, and bi-weekly progress reports.
- **Tutor Workspace:** Availability scheduling with conflict-free calendar booking, lesson notes, homework assignments, and automated escrow payouts in BDT.
- **Centralized Real-Time Communication:** In-app real-time notifications via Socket.IO for every booking change, lesson reminder, and attendance event.

---

## 2. Technology Stack & Verified Architecture

| Layer                    | Technology                            | Verified Version                         | Role                                                               |
| ------------------------ | ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------ |
| **Runtime & Monorepo**   | Node.js + pnpm Workspaces + Turborepo | Node v22+/v26, pnpm 12.4.2, Turbo 2.11.7 | High-performance monorepo orchestration & cached builds            |
| **Backend API**          | NestJS (Modular Monolith)             | 12.1.2                                   | Enterprise TypeScript REST API & WebSocket Server                  |
| **Real-Time WebSockets** | Socket.IO                             | 4.8.4                                    | Authenticated real-time in-app notification gateway                |
| **Database Engine**      | PostgreSQL                            | 18 (Local) / 16+ (Prod)                  | ACID transactions, GiST exclusion constraints, Outbox pattern      |
| **ORM & Migrations**     | TypeORM + pg driver                   | TypeORM 1.1.2 / 0.3.x, pg 8.23.1         | Typed data access with immutable SQL migrations as source of truth |
| **Frontend Web**         | Next.js (App Router) + React          | Next.js 16.x/15.x, React 19.3.0          | Server Components (RSC), fast SEO, interactive client dashboards   |
| **Styling & Components** | Tailwind CSS + shadcn/ui              | Tailwind 4.x / 3.4.x                     | Accessible headless UI primitives, mobile-first responsiveness     |
| **State & Forms**        | Redux Toolkit + React Hook Form + Zod | RTK 2.13.0, RHF 7.89.0, Zod 3.24.x       | Shared contracts, isomorphic schema validation                     |
| **Localization (i18n)**  | next-intl                             | 4.14.9                                   | Complete bilingual Bengali (`bn`) & English (`en`) support         |
| **Testing**              | Vitest, Supertest, Playwright         | Vitest 5.0.3, Playwright 1.64.0          | Unit, Integration, Socket, and Cross-browser E2E testing           |

---

## 3. Monorepo Structure

```text
ogroniedu/
├── apps/
│   ├── api/                   # NestJS 12 Modular Monolith Backend & Socket.IO Gateway
│   └── web/                   # Next.js 16/15 App Router Frontend (Bengali & English)
├── packages/
│   ├── contracts/             # Shared TypeScript DTOs, Zod Schemas & Notification Registry
│   ├── config/                # Centralized ESLint & Prettier Rules
│   └── tsconfig/              # Shared TypeScript Configurations
├── docs/                      # Canonical Engineering Documentation & ADRs
│   ├── adr/                   # Architecture Decision Records (ADR-001 to ADR-007)
│   ├── audits/                # Documentation & Architecture Audits
│   └── database/              # PostgreSQL schema.sql, Data Dictionary & Migrations
├── prompts/                   # 24 Self-Contained AI Coding Prompts
├── pnpm-workspace.yaml        # Monorepo Workspace Manifest
├── turbo.json                 # Turborepo Build & Task Graph Configuration
└── package.json               # Root Workspace Scripts
```

---

## 4. Getting Started & Local Development

### 4.1 Prerequisites

- **Node.js:** v22.x or v26.x
- **pnpm:** v12.x (`npm install -g pnpm`)
- **PostgreSQL:** Running on `localhost:5432` (database `ogroniedu_dev`)

### 4.2 Installation

Install all dependencies across the workspace using pnpm:

```bash
pnpm install
```

### 4.3 Environment Setup

Copy the environment template files:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 4.4 Database Setup & Migrations

```bash
# Run database schema migration
pnpm --filter @ogroniedu/api run db:migrate
```

### 4.5 Start Development Servers

Run both frontend and backend concurrently via Turborepo:

```bash
pnpm dev
```

- **Web App (Next.js):** [http://localhost:5000](http://localhost:5000)
- **API Server (NestJS):** [http://localhost:4000](http://localhost:4000)
- **Swagger API Documentation:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **WebSocket Gateway:** `ws://localhost:4000/notifications`

---

## 5. Running Automated Tests

```bash
# Run all unit and integration tests across workspace
pnpm test

# Run backend tests only
pnpm --filter @ogroniedu/api test

# Run Playwright E2E browser tests
pnpm test:e2e
```

---

## 6. Real-Time Notification Architecture

The platform features a **centralized in-app notification system**:

1. **Catalog Definition:** Every notification event is strictly declared in `@ogroniedu/contracts` with priority, roles, and bilingual keys.
2. **Server-Side Authorization:** Sockets authenticate via JWT and automatically join secure `user:<userId>` rooms.
3. **Guaranteed Delivery:** Notifications are saved to the PostgreSQL `notifications` table so offline recipients never miss an alert.
4. **Interactive UI:** The frontend includes an unread notification badge, toast popups, and a notification drawer with mark-as-read controls in both Bengali and English.
