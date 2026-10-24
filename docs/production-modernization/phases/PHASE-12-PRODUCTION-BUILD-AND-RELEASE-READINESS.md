# Phase 12 — Production Build & Release Readiness

**Phase ID:** `PHASE-12`  
**Phase Name:** Production Build & Release Readiness  
**Estimated Effort:** 1 Day (Day 7)  
**Status:** READY  
**Owner:** Release Manager & DevOps Lead

---

## 1. Objective and Business Justification
Perform final pre-launch verification, Docker container build validation, production environment configuration audits, and evidence-based Go/No-Go release certification. Ensure that OgroniEdu is ready for immediate deployment as a production-grade MVP tutoring SaaS platform in Bangladesh.

---

## 2. Current-State Findings and Evidence
- Production build (`pnpm build`) compiles cleanly in ~30 seconds for both Next.js and NestJS.
- Docker configuration exists in `docker-compose.yml`, `docker-compose.staging.yml`, and `apps/api/Dockerfile`.
- Environment variable schemas are validated by `apps/api/src/config/env.validation.ts`.
- Master release readiness checklist authored in `docs/production-modernization/14-RELEASE-READINESS-CHECKLIST.md`.

---

## 3. Exact Scope
1. Execute final production build (`pnpm build`) and verify all 88 Next.js routes and NestJS bundles compile with zero warnings.
2. Assert zero server secrets, API keys, or database credentials leak into client JavaScript bundles.
3. Validate `.env.example` against `env.validation.ts` schema; verify application crashes on boot if `JWT_SECRET` is unset in production mode.
4. Build and boot the Docker staging compose stack (`docker-compose.staging.yml`).
5. Complete every item in `14-RELEASE-READINESS-CHECKLIST.md` and sign off the release.

---

## 4. Explicit Exclusions
- Deploying to live production cloud infrastructure (Phase 12 validates release artifacts; actual DNS cutover is scheduled following signoff).

---

## 5. Prerequisite Phases
- All prior phases (`PHASE-00` through `PHASE-11`).

---

## 6. Tasks and Unique Task IDs
- `REL-001`: Validate production builds and zero bundle leaks (`pnpm build`).
- `REL-002`: Validate `.env.example` and runtime fail-fast config checks.
- `REL-003`: Verify Docker staging compose build and multi-container boot.
- `REL-004`: Produce final evidence-based release scorecard and go/no-go signoff.

---

## 7. Actual Affected Files and Modules
- Entire repository.
- `docker-compose.staging.yml`
- `.env.example`
- `docs/production-modernization/14-RELEASE-READINESS-CHECKLIST.md`

---

## 8. Files Created, Split, Moved, or Removed
- Created: Final release evidence report artifact.

---

## 9. Frontend Work
- Inspect `.next` bundle analyzer output to confirm zero node modules or server utilities in client chunks.

---

## 10. Backend Work
- Verify health check endpoints (`/health`, `/api/health`) report database and Redis connectivity.

---

## 11. Database and Migration Work
- Verify all 32 migrations are recorded in `schema_migrations` table.

---

## 12. Event-Driven Architecture Work
- Confirm outbox worker processes pending events on boot.

---

## 13. Security Requirements
- Zero credentials in version control; `.env` listed in `.gitignore`.

---

## 14. Unit Test Requirements
- Full suite passes 1,367/1,367 tests.

---

## 15. Integration Test Requirements
- BCDR cold disaster recovery drill passes.

---

## 16. Browser Automation and E2E Scenarios
- Playwright E2E passes 100%.

---

## 17. Required Commands
```pwsh
# 1. Production Build
pnpm build

# 2. Environment Validation Spec
pnpm --filter @ogroniedu/api test test/env.validation.spec.ts

# 3. Docker Staging Build
docker compose -f docker-compose.staging.yml build
```

---

## 18. Acceptance Criteria
1. Production build succeeds for all 5 workspaces.
2. Client bundle contains zero server credentials.
3. Docker staging stack builds and passes health checks.
4. All items in `14-RELEASE-READINESS-CHECKLIST.md` are signed off as READY.

---

## 19. Failure and Rollback Considerations
- If Docker build fails on any dependency step, verify lockfile integrity (`pnpm-lock.yaml`).
- Maintain tagged git commit `v1.0.0-mvp` for rollback stability.

---

## 20. Definition of Done
- Release manager signs off on MVP launch; release artifacts verified.

---

## 21. Expected Evidence
- Release sign-off document and Docker staging health probe logs.

---

## 22. Known Risks and Blockers
- None.

---

## 23. Estimated Effort
- 1 Day.

---

## 24. Next-Phase Dependencies
- MVP Launch and post-launch monitoring.
