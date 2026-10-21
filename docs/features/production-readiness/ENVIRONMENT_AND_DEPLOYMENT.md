# Phase 10: Search, SEO, Performance, Accessibility & Production Readiness
## Environment & Deployment Readiness

This document defines environment variable requirements, container packaging, database migration procedures, and deployment rollback steps.

---

## 1. Environment Variables Registry

### Backend API (`apps/api`)
| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `production` / `development` | Runtime environment toggle |
| `PORT` | No | `4000` | HTTP listening port |
| `DATABASE_URL` | Yes | `postgres://user:pass@host:5432/ogroniedu` | PostgreSQL connection pool URL |
| `JWT_SECRET` | Yes | `[REDACTED_32_CHAR_SECRET]` | Token signing secret |
| `JWT_REFRESH_SECRET` | Yes | `[REDACTED_32_CHAR_SECRET]` | Refresh token signing secret |
| `FRONTEND_URL` | Yes | `https://ogroni.edu.bd` | Allowed CORS origin |
| `REDIS_URL` | No | `redis://localhost:6379` | Optional cache / pub-sub |

### Frontend Web (`apps/web`)
| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `production` / `development` | Next.js optimization mode |
| `PORT` | No | `5000` | HTTP server port |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://ogroni.edu.bd` | Public canonical base URL for SEO |
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:4000` | Backend API gateway URL |

---

## 2. Container Packaging & Standalone Output

- Next.js is configured with `output: 'standalone'`.
- Docker containers copy only `.next/standalone`, `.next/static`, and `public`, reducing production container images from >1.2GB to <180MB.
- Server startup command: `node server.js` inside `.next/standalone/apps/web/`.

---

## 3. Database Migration & Rollback Strategy

1. **Pre-Deployment:**
   - Execute migrations before deploying new container versions:
     `pnpm --filter @ogroniedu/database db:migrate`
   - Migrations are strictly additive; column drops or renames must be executed across multi-phase deprecation cycles.
2. **Rollback Safety:**
   - If a deployment must be rolled back, additive database columns remain dormant without disrupting previous application versions.
   - Database BCDR disaster recovery drills are tested via `packages/database/test/bcdr-recovery.spec.ts`.
