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
