# Phase 10: Search, SEO, Performance, Accessibility & Production Readiness
## Security Headers & Caching Strategy

This document specifies the HTTP security headers, Content Security Policy (CSP), and caching directives enforced across the platform.

---

## 1. HTTP Security Headers

Configured in `apps/web/next.config.js`:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' data:; connect-src 'self' http://localhost:4000 ws://localhost:4000 https: wss:; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none';
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(self), geolocation=(self), payment=(self)
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Directives Rationale
- **`X-Frame-Options: DENY` & `frame-ancestors 'none'`:** Completely eliminates clickjacking attacks by forbidding embedding OgroniEdu inside iframes.
- **`X-Content-Type-Options: nosniff`:** Prevents MIME-confusion attacks and malicious payload execution.
- **`Referrer-Policy: strict-origin-when-cross-origin`:** Protects user privacy by stripping paths from referrers sent to external sites.
- **`Permissions-Policy`:** Restricts sensor and hardware APIs (camera, microphone, geolocation) to the platform origin only.

---

## 2. Caching Directives & Cache Invalidation

### Public Assets & Static Routes
- Static assets (`/_next/static/*`): `Cache-Control: public, max-age=31536000, immutable`
- Public pages (Home, Tutors Catalog): `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
- Public Tutor Profile (`/tutors/:id`): Next.js fetch revalidation with on-demand tag revalidation `revalidateTag('tutor-[id]')` triggered when tutor profile or qualifications mutate.

### Private & Authenticated Endpoints
- Private routes (`/dashboard/*`, `/messages`, `/payments/*`, `/safety-reports`):
  `Cache-Control: private, no-cache, no-store, must-revalidate`
- **Cache Isolation Invariant:** Private responses must NEVER be cached by edge or intermediate CDN proxies, guaranteeing User A never observes User B's data under any concurrent load scenario.
