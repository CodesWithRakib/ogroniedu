# OgroniEdu — Deployment, DevOps & Operations Manual

**Date:** 2026-10-10  
**Infrastructure:** Containerized Linux (Docker), Nginx Reverse Proxy, Managed PostgreSQL, Managed Redis  
**Status:** Approved Operations Standard

---

## 1. Monorepo Containerization Architecture

The application builds as two lightweight container images:

1. **`apps/web` (Next.js 16/15):** Standalone Node.js server container optimized with `output: 'standalone'` in `next.config.js`. Static assets hosted via CDN.
2. **`apps/api` (NestJS 12):** Production Node.js runtime container running the modular monolith backend and Socket.IO server.

### 1.1 Environment Segregation

- **Development (`local`):** Local PostgreSQL 18 service, local Redis, hot-reloading dev servers (`pnpm dev`).
- **Staging / QA:** Mirror of production with synthetic anonymized seed data, automated nightly E2E runs.
- **Production (`prod`):** High-availability multi-AZ deployment, strict environment secret injection via secret managers (AWS Secrets Manager / Doppler), production SSL/TLS termination.

---

## 2. CI/CD Pipeline (GitHub Actions)

Every pull request and merge to `main` executes the following sequential stages:

1. **Lint & Format:** `pnpm lint` and `pnpm format:check`.
2. **Type Check:** `pnpm typecheck` across all apps and packages.
3. **Unit & Integration Tests:** `pnpm test` (with PostgreSQL test container).
4. **Build Verification:** `pnpm build` via Turborepo caching.
5. **E2E Smoke Tests:** Playwright automated test run.
6. **Deployment:** Zero-downtime rolling container update with health check probe verification before traffic cutover.

---

## 3. Database Migration Runbook

1. Migrations are written as versioned SQL scripts or TypeORM migration classes in `packages/database/migrations`.
2. **Never run automatic schema synchronization in production (`synchronize: false`).**
3. Deployment migration step executes during release phase before new application containers start:
   ```bash
   pnpm --filter @ogroniedu/database db:migrate
   ```
4. Backward-incompatible database changes (e.g. column renames) must follow the **Expand and Contract pattern** across two separate releases:
   - **Expand Phase (Release N):** Add new column alongside old column; dual-write in application code; backfill existing data asynchronously.
   - **Contract Phase (Release N+1):** Switch application reads/writes completely to new column; archive and drop old column.

---

## 4. Zero-Downtime Rolling Release Runbook

To achieve 99.9% platform availability without service interruption, production updates follow a strict zero-downtime rolling strategy:

### 4.1 Deployment Sequence

1. **Pre-flight Check:**
   - Verify CI gates have passed (`lint`, `format:check`, `docs:validate`, `typecheck`, `test`, `build`).
   - Validate target database connectivity and replication health (`pg_isready`).
2. **Database Migration Phase:**
   - Execute forward-compatible database migrations before releasing new application binaries.
   - Migrations acquire short table locks (using `statement_timeout = '5s'`) to prevent transaction starvation.
3. **Canary / Rolling Container Update:**
   - Deploy new API container instances (`ogroni_api:vX.Y.Z`).
   - Container health check probe (`GET /api/health/liveness`) polls every 5s.
   - Reverse proxy (Nginx / ALB) waits for readiness probe (`GET /api/health/readiness`) to report `status: "ok"` before directing HTTP traffic to new container instances.
   - Drain connections from old containers over 30 seconds before stopping them.
4. **Web Frontend Rolling Update:**
   - Deploy Next.js standalone container instances.
   - Verify health check (`curl -f http://localhost:3000`).
   - Direct web traffic to newly initialized containers.
5. **Post-Deploy Smoke Verification:**
   - Execute automated smoke test suite:
     ```bash
     node scripts/smoke-test.mjs --target production
     ```

---

## 5. Rollback & Forward-Fix Protocol

When post-deployment smoke tests detect a critical defect or error rates breach 0.5%:

### 5.1 Code Rollback

- Revert traffic at reverse proxy level to the previously healthy container tag (`vX.Y.(Z-1)`).
- Because database changes adhere to the Expand pattern, previous application code remains 100% compatible with the expanded database schema.

### 5.2 Database Forward-Fix Rule

- **Never rollback database migrations in production using `DROP COLUMN` or destructive scripts** if live transactions have occurred, as this causes catastrophic data loss.
- Always apply an immediate forward-fix migration script (`011_forward_fix_*.sql`) that repairs corrupted constraints or schema definitions while preserving audit trails and financial ledger consistency.

---

## 6. Environment Security & Non-Root Hardening

1. **Non-Root Execution:**
   - `apps/api` container runs strictly as user `node` (UID 1000).
   - `apps/web` container runs strictly as user `nextjs` (UID 1001, GID 1001).
2. **Startup Secret Validation:**
   - Application validates all environment variables on boot via `validateEnvironment()`.
   - In `production`, default development secrets (e.g. `super-secret-jwt-key-replace-in-production`, `postgres`) immediately trigger a fatal startup assertion to prevent accidental deployment with default credentials.
3. **Secret Storage:**
   - Production secrets are injected at container runtime through AWS Secrets Manager, Doppler, or sealed Kubernetes secrets.
   - Server secrets are never prefixed with `NEXT_PUBLIC_` to eliminate frontend credential leakage.

---

## 7. Seed Execution Safety Governance

- **Foundational System Data:** Roles, curricula, education levels, subjects, and ledger accounts are idempotent and safe to run in any environment.
- **Demo User Invariant:** Production seed execution (`NODE_ENV=production`) is strictly prohibited from inserting synthetic demo users (`guardian.demo@ogroniedu.com`, etc.).
- Automated regression tests in `packages/database/test/seed.spec.ts` enforce that `isProduction: true` prevents demo user creation with 100% certainty.

---

## 8. Cloud Native Production Deployment: Vercel + Render + PostgreSQL + Supabase

### 8.1 Architecture Overview

- **Frontend:** Next.js 16 (`apps/web`) deployed to **Vercel** with global Edge CDN caching and Server Components.
- **Backend API:** NestJS 12 (`apps/api`) deployed as a Web Service on **Render** with HTTP + Socket.IO WebSockets (`/notifications`).
- **Database:** Managed PostgreSQL (Render PostgreSQL, Neon, AWS RDS, or Supabase Postgres) with SSL termination (`sslmode=require`).
- **Storage:** Supabase Storage (public avatar bucket + private evidence bucket with HMAC-signed token access).

```
                      +-----------------------------+
                      |         End User            |
                      +--------------+--------------+
                                     |
                    HTTPS            |             HTTPS / WSS
                      |              |                  |
                      v              |                  v
        +-------------------------+  |   +-----------------------------+
        |    Vercel Edge CDN      |  |   |    Render Web Service       |
        |    (apps/web Next.js)   |--+-->|    (apps/api NestJS 12)     |
        +-------------------------+      +--------------+--------------+
                                                        |
                                       +----------------+----------------+
                                       |                                 |
                                       v                                 v
                        +-----------------------------+   +-----------------------------+
                        |     Managed PostgreSQL      |   |      Supabase Storage       |
                        |   (32 SQL Migrations)       |   |   (Evidence & Documents)    |
                        +-----------------------------+   +-----------------------------+
```

---

### 8.2 Managed PostgreSQL Setup & Database Provisioning

1. **Database Instance Provisioning:**
   - Provision a PostgreSQL 16+ or 18 instance on Render PostgreSQL, Neon, or AWS RDS.
   - Note the connection string (format: `postgresql://[user]:[password]@[host]:5432/[database]?sslmode=require`).
2. **Connection Parameters:**
   - Enforce `sslmode=require` in `DATABASE_URL`.
   - Set `DB_SSL=true` and `DB_POOL_MAX=20` to manage connection pooling limits.
3. **Running Migrations:**
   - Migrations are versioned SQL scripts located in `packages/database/src/migrations/` (001 to 032).
   - Execution is tracked idempotently in `schema_migrations` table inside database transactions.
   - Command to run migrations against the managed database:
     ```bash
     DATABASE_URL="postgresql://user:password@host:5432/ogroniedu?sslmode=require" pnpm --filter @ogroniedu/database db:migrate
     ```
   - On Render, this is automated via the `preDeployCommand` in `render.yaml`.

---

### 8.3 Render Deployment (NestJS Backend API)

The repository root includes a production Blueprint specification (`render.yaml`).

#### Step-by-Step Render Dashboard Setup:

1. **Option A: Blueprint Deployment (Recommended)**
   - In Render Dashboard, click **New +** -> **Blueprint**.
   - Connect the GitHub repository `ogroniedu`.
   - Render automatically detects `render.yaml` and parses the `ogroniedu-api` web service.
   - Fill in the required secret environment variables (`DATABASE_URL`, `FRONTEND_URL`, `CORS_ORIGINS`, `SUPABASE_*`).
   - Click **Apply**.

2. **Option B: Manual Web Service Creation**
   - Click **New +** -> **Web Service**.
   - Select GitHub repository `ogroniedu`.
   - Configure service details:
     - **Name:** `ogroniedu-api`
     - **Environment:** `Node`
     - **Region:** `Oregon (US West)` or preferred region closest to users (e.g. `Singapore`).
     - **Branch:** `main`
     - **Root Directory:** `.` (leave empty or dot — monorepo root)
     - **Build Command:**
       ```bash
       pnpm install --frozen-lockfile && pnpm build:api
       ```
     - **Pre-deploy Command:**
       ```bash
       pnpm --filter @ogroniedu/database db:migrate
       ```
     - **Start Command:**
       ```bash
       pnpm --filter @ogroniedu/api start
       ```
     - **Health Check Path:** `/health/live`
     - **Auto-Deploy:** `Yes`
   - Under **Advanced -> Build Filters**:
     - Add paths: `apps/api/**`, `packages/**`, `package.json`, `pnpm-lock.yaml`, `turbo.json`.

---

### 8.4 Vercel Deployment (Next.js Frontend)

#### Step-by-Step Vercel Dashboard Setup:

1. In Vercel Dashboard, click **Add New...** -> **Project**.
2. Import the GitHub repository `ogroniedu`.
3. In **Configure Project**:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `apps/web` (Click _Edit_ and select `apps/web`).
   - Ensure the option **"Include files outside of the Root Directory in the Build Step"** remains **ENABLED** (required for resolving `@ogroniedu/contracts` and root lockfile).
   - **Build and Output Settings:**
     - **Build Command:** Leave as default (`next build`) or `cd ../.. && pnpm build:web`
     - **Install Command:** `pnpm install` (Vercel automatically detects `pnpm@12.10.1` from `packageManager` in root `package.json`).
4. **Environment Variables:**
   - Configure the frontend environment variables in Vercel:
     - `NEXT_PUBLIC_API_URL`: Your deployed Render API URL (e.g., `https://ogroniedu-api.onrender.com`).
     - `NEXT_PUBLIC_APP_URL`: Your Vercel domain (e.g., `https://ogroniedu.vercel.app` or custom domain `https://ogroni.edu.bd`).
     - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (`https://<project-ref>.supabase.co`).
     - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon/publishable key (`sb_publishable_...`).
     - `NODE_ENV`: `production`
5. Click **Deploy**.

---

### 8.5 Production Environment Variable Matrix

| Variable Name                          | Service | Scope  |   Required in Prod   | Description / Example                                                                  |
| :------------------------------------- | :------ | :----- | :------------------: | :------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`                  | Vercel  | Public |         Yes          | Backend URL: `https://ogroniedu-api.onrender.com`                                      |
| `NEXT_PUBLIC_APP_URL`                  | Vercel  | Public |         Yes          | Frontend URL: `https://ogroniedu.vercel.app`                                           |
| `NEXT_PUBLIC_SUPABASE_URL`             | Vercel  | Public |         Yes          | Supabase endpoint: `https://<ref>.supabase.co`                                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel  | Public |         Yes          | Supabase client publishable key                                                        |
| `NEXT_PUBLIC_LIVEKIT_URL`              | Vercel  | Public |         Yes          | LiveKit WebRTC SFU WebSocket endpoint                                                  |
| `PORT`                                 | Render  | Server |      Yes (Auto)      | Port assigned by Render (e.g. 10000)                                                   |
| `NODE_ENV`                             | Both    | Server |         Yes          | `production`                                                                           |
| `DATABASE_URL`                         | Render  | Secret |         Yes          | Postgres connection string with `sslmode=require`                                      |
| `DB_SSL`                               | Render  | Server |         Yes          | `true`                                                                                 |
| `DB_POOL_MAX`                          | Render  | Server |   No (default 20)    | Maximum connections per pool                                                           |
| `FRONTEND_URL`                         | Render  | Server |         Yes          | Primary frontend URL (`https://ogroniedu.vercel.app`)                                  |
| `CORS_ORIGINS`                         | Render  | Server |         Yes          | Comma-separated allowed origins (`https://ogroniedu.vercel.app,https://ogroni.edu.bd`) |
| `JWT_SECRET`                           | Render  | Secret |         Yes          | High-entropy 256-bit secret (32+ chars, non-default)                                   |
| `SUPABASE_URL`                         | Render  | Server |         Yes          | Supabase project URL                                                                   |
| `SUPABASE_PUBLISHABLE_KEY`             | Render  | Server |         Yes          | Supabase client key                                                                    |
| `SUPABASE_SECRET_KEY`                  | Render  | Secret |         Yes          | Supabase `service_role` privileged server key                                          |
| `SUPABASE_JWKS_URL`                    | Render  | Server |         Yes          | Supabase Auth JWKS: `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`          |
| `SSLCOMMERZ_STORE_ID`                  | Render  | Secret |          No          | SSLCOMMERZ store identifier                                                            |
| `SSLCOMMERZ_STORE_PASSWD`              | Render  | Secret |          No          | SSLCOMMERZ merchant password                                                           |
| `SSLCOMMERZ_IS_LIVE`                   | Render  | Server | No (default `false`) | Set `true` only when commercial live credentials provisioned                           |
| `OTP_SMS_PRIMARY_PROVIDER`             | Render  | Server |         Yes          | `http_gateway`                                                                         |
| `OTP_SMS_FALLBACK_PROVIDER`            | Render  | Server |         Yes          | `http_gateway` (`dev` blocked in production)                                           |
| `OTP_EMAIL_PRIMARY_PROVIDER`           | Render  | Server |         Yes          | `http_gateway`                                                                         |
| `OTP_EMAIL_FALLBACK_PROVIDER`          | Render  | Server |         Yes          | `http_gateway` (`dev` blocked in production)                                           |

---

### 8.6 Post-Deployment Smoke Test Protocol

Run these verification steps immediately after production deployment:

1. **Backend Health Liveness Probe:**
   ```bash
   curl -i https://ogroniedu-api.onrender.com/health/live
   ```
   _Expected:_ HTTP 200 `{"status":"ok","uptime":...,"timestamp":"..."}`
2. **Backend Health Readiness Probe:**
   ```bash
   curl -i https://ogroniedu-api.onrender.com/health/ready
   ```
   _Expected:_ HTTP 200 with database health probe `{"database":{"status":"up"}}`.
3. **Frontend Ingress & Localization:**
   ```bash
   curl -I https://ogroniedu.vercel.app/
   ```
   _Expected:_ HTTP 200 or 307 redirect to `/[locale]` (e.g. `/bn`).
4. **CORS Preflight Test:**
   ```bash
   curl -i -X OPTIONS https://ogroniedu-api.onrender.com/api/v1/auth/login \
     -H "Origin: https://ogroniedu.vercel.app" \
     -H "Access-Control-Request-Method: POST"
   ```
   _Expected:_ HTTP 204 or 200 with `Access-Control-Allow-Origin: https://ogroniedu.vercel.app` and `Access-Control-Allow-Credentials: true`.
5. **WebSocket Handshake Verification:**
   - Open browser console on frontend.
   - Verify connection to `wss://ogroniedu-api.onrender.com/notifications` succeeds.
6. **Authentication & Session:**
   - Register or log in with verified test credentials.
   - Verify access token is received in response and subsequent RTK Query requests send `Authorization: Bearer <token>`.
7. **Document Upload & Storage:**
   - In tutor verification tab, upload a sample PDF/JPEG credential evidence.
   - Verify file signature verification succeeds and HMAC-signed URL is generated.
