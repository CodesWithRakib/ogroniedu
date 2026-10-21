# OgroniEdu — Production Deployment & Rollback Runbook

## 1. Release Strategy Overview

OgroniEdu follows a **Rolling Zero-Downtime Deployment** model. Database migrations adhere to an **Expand / Contract** pattern, ensuring that any running instance of the previous release continues to operate without schema-incompatibility errors during the deployment window.

---

## 2. Pre-Deployment Checklist

Before initiating any deployment to staging or production, the release manager must verify:

- [ ] All CI pipeline checks have succeeded on the target commit (`ci.yml`).
- [ ] Static type check passes with 0 errors (`pnpm typecheck`).
- [ ] Linting passes with 0 errors and 0 warnings (`pnpm lint`).
- [ ] 100% of automated tests pass (`pnpm test` across 128 test files).
- [ ] Documentation integrity validation succeeds (`node scripts/validate-documentation.js`).
- [ ] Production build completes without warnings (`pnpm build`).
- [ ] Database backup snapshot has been created within the last 60 minutes.
- [ ] Product Owner explicit written authorization is granted.

---

## 3. Step-by-Step Deployment Procedure

### Step 1: Provision & Validate Secrets
Ensure all production secrets are provisioned in the orchestration environment:
- Verify `JWT_SECRET` is non-default and has >= 32 characters.
- Verify `DATABASE_URL` connects with SSL (`sslmode=require`).
- Verify `SSLCOMMERZ_IS_LIVE` and `BKASH_IS_SANDBOX` are configured appropriately.

### Step 2: Database Migration (Expand Phase)
Run forward-safe, non-blocking migrations against the database prior to deploying new application code:

```bash
# Execute idempotent database schema migrations
pnpm --filter @ogroniedu/database db:migrate
```

*Verification:* Ensure script returns:
`No pending migrations. Database schema is up to date.`

### Step 3: Container Build & Push
Build production Docker container images for API and Web:

```bash
# Build API container image
docker build -t ogroniedu-api:latest -f apps/api/Dockerfile .

# Build Web container image
docker build -t ogroniedu-web:latest -f apps/web/Dockerfile .
```

### Step 4: Rolling Deployment & Orchestration Update
Deploy new containers in a rolling sequence (e.g. 25% increments), allowing readiness probes to pass before terminating older containers:

```bash
# Container orchestrator update (Docker Compose / Kubernetes)
docker compose -f docker-compose.yml up -d --no-deps api web
```

### Step 5: Post-Deployment Smoke Verification
Execute the automated post-deployment smoke test suite:

```bash
# Run 8 automated deployment verification checks
node scripts/smoke-test.mjs --target production
```

*Expected Result:*
- API Liveness Probe (`/api/health/liveness`): HTTP 200 OK
- API Readiness Probe (`/api/health/readiness`): HTTP 200 OK
- Web Frontend Landing Page (`/`): HTTP 200 / 307
- Public Stats API (`/api/v1/public/stats`): HTTP 200 OK
- Protected Route Auth Rejection (`/api/v1/users/me`): HTTP 401 UNAUTHORIZED
- Public Discovery API (`/api/v1/taxonomy/subjects`): HTTP 200 OK
- Frontend SEO Assets (`/robots.txt` & `/sitemap.xml`): HTTP 200 OK
- Zero Credential / Stack Leakage: PASSED

---

## 4. Rollback Runbook

### Rollback Decision Criteria
Initiate immediate rollback if any of the following occur within 30 minutes of deployment:
1. Smoke tests fail (e.g. readiness probe returns 503 or fails to respond).
2. HTTP 5xx error rate exceeds 1% of total requests over a 5-minute rolling window.
3. Database connection pool exhaustion or query deadlocks occur.
4. Critical business workflows (booking creation, payment callback, safeguarding SOS) fail.

### Rollback Execution Steps (< 5 Minute SLA)

#### Step 1: Revert Container Traffic to Previous Stable Image
Roll back the container deployment to the previous stable release tag:

```bash
# Roll back to previous verified image tag
docker service update --image ogroniedu-api:v1.12.0 ogroniedu_api
docker service update --image ogroniedu-web:v1.12.0 ogroniedu_web
```

#### Step 2: Verify Service Restoration
Confirm service health on the restored version:

```bash
node scripts/smoke-test.mjs --target production
```

#### Step 3: Database Schema Review
Because all migrations use the Expand/Contract pattern, schema changes made in the Expand phase are backward-compatible and do NOT require an immediate database rollback. If a faulty migration must be undone, execute the corresponding down-migration script using the procedures in `DATABASE_MIGRATION_AND_RECOVERY.md`.

#### Step 4: Incident Notification & Log Preservation
- Broadcast incident notification to the engineering and operations teams.
- Preserve container logs and error dumps for post-incident triage.
