# OgroniEdu — Post-Launch Smoke Tests Specification

## 1. Objectives & Non-Destructive Guarantee

The post-launch smoke test harness is designed to execute immediately after any staging or production deployment to verify the operational integrity of critical system endpoints.

**Strict Non-Destructive Guarantee:**

- Smoke tests **never** insert fake production bookings or ratings.
- Smoke tests **never** charge cards or trigger real mobile financial service (bKash/Nagad) transactions.
- Smoke tests **never** dispatch unsolicited emails or SMS messages to real users.
- Smoke tests **never** execute destructive database mutations.

---

## 2. Automated Smoke Verification Suite

The harness is implemented in `scripts/smoke-test.mjs` and mirrored as automated Vitest integration assertions in `apps/api/test/production-smoke.spec.ts`.

### 2.1 The 8 Core Smoke Checks

| Test # | Check Name                         | Target Endpoint                          | Pass Criteria                                             | Verified Local Outcome                 |
| :----- | :--------------------------------- | :--------------------------------------- | :-------------------------------------------------------- | :------------------------------------- |
| **01** | **API Liveness Probe**             | `GET /api/health/liveness`               | HTTP 200, `status: 'ok'`, valid uptime and timestamp      | **PASSED** (status: ok)                |
| **02** | **API Readiness Probe**            | `GET /api/health/readiness`              | HTTP 200, database connected, memory under heap threshold | **PASSED** (HTTP 200 OK)               |
| **03** | **Web Application Availability**   | `GET /` (Frontend Web)                   | HTTP 200, 307, or 308 redirect without 5xx errors         | **PASSED** (HTTP 307)                  |
| **04** | **Public Statistics API**          | `GET /api/v1/public/stats`               | HTTP 200, valid JSON envelope with `success: true`        | **PASSED** (verified tutors: 0)        |
| **05** | **Protected Route Auth Rejection** | `GET /api/v1/users/me` (unauthenticated) | HTTP 401 UNAUTHORIZED (verifies auth guard is active)     | **PASSED** (HTTP 401 UNAUTHORIZED)     |
| **06** | **Taxonomy & Discovery API**       | `GET /api/v1/taxonomy/subjects`          | HTTP 200, array of subjects loaded from database          | **PASSED** (HTTP 200)                  |
| **07** | **Frontend SEO Metadata Assets**   | `GET /robots.txt` & `GET /sitemap.xml`   | HTTP 200 for both assets                                  | **PASSED** (robots: 200, sitemap: 200) |
| **08** | **Zero Information Leakage**       | Sample endpoint responses                | Responses contain zero stack traces, SQL, or secrets      | **PASSED** (Zero leakage detected)     |

---

## 3. Execution Commands

### Running Smoke Tests against Local Development / CI:

```bash
node scripts/smoke-test.mjs --target local
```

### Running Smoke Tests against Staging:

```bash
node scripts/smoke-test.mjs --target staging
```

### Running Smoke Tests against Production:

```bash
node scripts/smoke-test.mjs --target production
```

### Programmatic Smoke Suite in Vitest:

```bash
pnpm --filter @ogroniedu/api test test/production-smoke.spec.ts
```

---

## 4. Sample Verification Output Log

```text
============================================================
🚀 OgroniEdu Deployment Smoke Verification [Target: local]
============================================================

Testing API Liveness Probe [http://localhost:4000/api/health/liveness]... ✅ PASSED (status: ok, uptime: 210s)
Testing API Readiness Probe [http://localhost:4000/api/health/readiness]... ✅ PASSED (HTTP 200 OK)
Testing Web Frontend Landing Page [http://localhost:5000/]... ✅ PASSED (HTTP 307)
Testing Public Stats API [http://localhost:4000/api/v1/public/stats]... ✅ PASSED (verified tutors: 0)
Testing Protected Route Auth Rejection [http://localhost:4000/api/v1/users/me]... ✅ PASSED (HTTP 401 UNAUTHORIZED, correctly rejected)
Testing Public Taxonomy & Discovery [http://localhost:4000/api/v1/taxonomy/subjects]... ✅ PASSED (0 taxonomy subjects loaded)
Testing Frontend SEO Assets [/robots.txt & /sitemap.xml]... ✅ PASSED (robots: 200, sitemap: 200)
Verifying Zero Sensitive Data / Stack Leakage... ✅ PASSED (Zero stack traces or secrets exposed)

============================================================
Deployment Smoke Verification complete.
============================================================
```
