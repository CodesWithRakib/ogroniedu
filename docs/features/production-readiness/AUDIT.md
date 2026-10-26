# Phase 10: Search, SEO, Performance, Accessibility & Production Readiness

## Platform & Infrastructure Audit

**Date:** October 21, 2026  
**Auditors:** Senior Performance Engineer, Next.js Architect, Backend Optimization Specialist, Accessibility Lead, Security Reviewer  
**Scope:** Full-stack inspection of `@ogroniedu/contracts`, `@ogroniedu/database`, `@ogroniedu/api`, and `@ogroniedu/web`.

---

## 1. Stack & Runtime Inventory

| Layer                    | Technology              | Actual Version      | Configuration & Notes                                             |
| :----------------------- | :---------------------- | :------------------ | :---------------------------------------------------------------- |
| **Monorepo Engine**      | Turborepo               | `2.11.7`            | Remote caching disabled; strict topological task execution        |
| **Package Manager**      | pnpm                    | `12.10.1`           | Workspaces configured with strict hoisting isolation              |
| **Frontend Framework**   | Next.js                 | `16.4.0`            | App Router with Turbopack bundler, `output: 'standalone'`         |
| **Frontend Library**     | React                   | `19.3.0`            | React 19 Server/Client components, Concurrent mode                |
| **Internationalization** | next-intl               | `4.14.9`            | Dynamic locale routing `[locale]` (`en`, `bn`) with JSON catalogs |
| **UI Design System**     | Tailwind CSS / Radix UI | `4.3.3` / `1.7.0`   | Radix headless primitives with custom Tailwind tokens             |
| **Backend Framework**    | NestJS                  | `12.1.2`            | Fastify-compatible Express engine, global exception filter        |
| **Database Engine**      | PostgreSQL              | `18.0` on port 5432 | Database `ogroniedu_dev` with 27 sequential migrations applied    |
| **ORM & Driver**         | TypeORM / pg            | `1.1.2` / `8.23.1`  | Native connection pooling, decorator-driven schema reflection     |
| **Real-Time WebSockets** | Socket.IO               | `4.8.4`             | Namespace `/notifications`, room-based dispatch                   |
| **Health Probes**        | @nestjs/terminus        | `12.1.0`            | `/health/live` (process alive) and `/health/ready` (db + heap)    |

---

## 2. Tutor Search & Discovery Audit

### Current Implementation

- **Controller & Service:** `apps/api/src/modules/tutors/services/tutor-search.service.ts` provides `searchTutors(query: SearchTutorsQueryDto)`.
- **Filters Supported:** Keyword `q`, `subjectId`, `educationLevelId`, `curriculumId`, `mode` (`online`, `in_person`, `hybrid`), `minPrice`, `maxPrice`, `minExperience`, `districtCode`, `upazilaCode`, `availableWeekday`, and Haversine geo-distance (`lat`, `lng`, `radiusKm`).
- **Eligibility Enforced:** Hard filters require:
  - `tp.publication_status = 'published'`
  - `tp.verification_status = 'approved'`
  - `tp.safety_hold_status != 'safety_hold'`
  - `tp.verification_expires_at IS NULL OR tp.verification_expires_at > NOW()`
  - `u.status = 'active' AND u.deleted_at IS NULL`

### Discovered Search Inefficiencies & Bottlenecks

1. **Unindexed Keyword `ILIKE` Scans:** Keyword search `q` executes 12 sequential `ILIKE '%term%'` disjunctions across `users`, `tutor_profiles`, `subjects`, `tutor_qualifications`, and `tutor_service_areas`.
2. **Missing Active User Partial Index:** Table `users` only has a partial index for `status = 'deletion_pending'`. Every search query joins `users` on `u.status = 'active'`, forcing full scans as user count scales.
3. **Missing Foreign-Key / Composite Indexes:**
   - `tutor_qualifications` lacked composite index on `(tutor_user_id, review_status, qualification_type)`.
   - `tutor_profiles` lacked a composite index covering `(publication_status, verification_status, safety_hold_status, hourly_rate_minor, years_experience)`.
4. **PostgreSQL Extension Status:** Extensions installed are `plpgsql`, `uuid-ossp`, `pgcrypto`, `btree_gist`. Extension `pg_trgm` (trigram matching) was absent.

---

## 3. SEO, Metadata & Discoverability Audit

### Discovered Issues

1. **Missing Public Route Metadata:**
   - Public pages `[locale]/(public)/page.tsx`, `[locale]/(public)/tutors/page.tsx`, and `[locale]/(public)/tutors/[id]/page.tsx` were marked `'use client'` without exporting Server `generateMetadata`.
   - Web crawlers received generic fallback titles without tutor name, subjects, or localized Bengali/English copy.
2. **Missing Structured Data (JSON-LD):** No `schema.org/Person`, `schema.org/Organization`, or `schema.org/WebSite` JSON-LD schemas were rendered on public pages.
3. **Incomplete `robots.txt` Disallow Rules:** `apps/web/src/app/robots.ts` disallowed `/*/admin/*` and `/*/payments`, but omitted:
   - `/*/dashboard` and `/*/dashboard/*`
   - `/*/messages`
   - `/*/notifications`
   - `/*/safety-reports`
   - `/*/classroom/*`
   - `/*/onboarding`
4. **Static Incomplete `sitemap.ts`:**
   - Contained hardcoded dates (`2026-10-10`).
   - Omitted individual verified public tutor profiles (`/tutors/[id]`), preventing search engine discovery of educators.

---

## 4. Frontend Performance & Core Web Vitals Audit

1. **Missing Root Error Boundaries:** No `error.tsx`, `not-found.tsx`, or `global-error.tsx` existed in `apps/web/src/app`. Unhandled errors or 404s resulted in unbranded default screens.
2. **Bundle Optimization:** `next.config.js` had `optimizePackageImports` commented out. Packages like `lucide-react`, `date-fns`, and `clsx` were bundled without tree-shaking barrel optimizations.
3. **Missing Security Headers:** `next.config.js` did not define HTTP headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
4. **Image Remote Patterns:** Next.js Image component lacked configured `remotePatterns` for secure avatar and CDN asset rendering.

---

## 5. Accessibility Audit (WCAG 2.2 AA)

1. **Positive Foundations:** Radix UI primitives (`dialog`, `popover`, `select`, `tabs`, `sheet`, `tooltip`) are already in use, with ARIA associations present in `apps/web/test/accessibility-and-a11y.spec.ts`.
2. **Opportunities:**
   - Ensure all public search inputs have explicit labels or `aria-label`.
   - Ensure search result counts announce dynamically to screen readers using `aria-live="polite"`.
   - Verify `prefers-reduced-motion` compliance across interactive modals and transition states.

---

## 6. Audit Verdict & Remediation Roadmap

The platform architecture is robust and modular, but requires targeted optimizations in:

1. Database indexing (PostgreSQL `pg_trgm`, composite filter indexes).
2. Server-side metadata, canonical URLs, and structured JSON-LD schemas.
3. Comprehensive robots and dynamic sitemap generation.
4. HTTP security headers and Next.js bundle optimizations.
5. Branded error boundaries (`error.tsx`, `not-found.tsx`, `global-error.tsx`).
