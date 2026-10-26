# Phase 10: Search, SEO, Performance, Accessibility & Production Readiness

## Route & Rendering Strategy Matrix

This document defines the rendering mode, caching behavior, data sensitivity, indexing policy, and security classification for every route group in OgroniEdu.

---

## 1. Route Classification Matrix

| Route Pattern                        | Access Level    | Rendering Mode                    | Cache Policy                       | Robots Directives   | Structured Data                                 |
| :----------------------------------- | :-------------- | :-------------------------------- | :--------------------------------- | :------------------ | :---------------------------------------------- |
| `/[locale]` (Home)                   | Public          | Server Component + Client Hero    | Public CDN cache / ISR (1 hour)    | `index, follow`     | `schema.org/WebSite`, `schema.org/Organization` |
| `/[locale]/tutors`                   | Public          | Server Metadata + Client Catalog  | Dynamic SSR / Client cache         | `index, follow`     | `schema.org/CollectionPage`                     |
| `/[locale]/tutors/[id]`              | Public          | Server Component + Client Details | Dynamic ISR / On-Demand Revalidate | `index, follow`     | `schema.org/Person`                             |
| `/[locale]/how-it-works`             | Public          | Static / ISR                      | Public CDN cache (24 hours)        | `index, follow`     | `schema.org/WebPage`                            |
| `/[locale]/pricing`                  | Public          | Static / ISR                      | Public CDN cache (24 hours)        | `index, follow`     | `schema.org/WebPage`                            |
| `/[locale]/safety`                   | Public          | Static / ISR                      | Public CDN cache (24 hours)        | `index, follow`     | `schema.org/WebPage`                            |
| `/[locale]/faq`                      | Public          | Static / ISR                      | Public CDN cache (24 hours)        | `index, follow`     | `schema.org/FAQPage`                            |
| `/[locale]/contact`                  | Public          | Static / ISR                      | Public CDN cache (24 hours)        | `index, follow`     | `schema.org/ContactPage`                        |
| `/[locale]/terms`                    | Public          | Static / ISR                      | Public CDN cache (7 days)          | `index, follow`     | `schema.org/WebPage`                            |
| `/[locale]/privacy`                  | Public          | Static / ISR                      | Public CDN cache (7 days)          | `index, follow`     | `schema.org/WebPage`                            |
| `/[locale]/login`                    | Public (Guest)  | Client Component                  | `no-store, no-cache`               | `noindex, nofollow` | None                                            |
| `/[locale]/register`                 | Public (Guest)  | Client Component                  | `no-store, no-cache`               | `noindex, nofollow` | None                                            |
| `/[locale]/dashboard`                | Authenticated   | Dynamic Client Component          | `private, no-cache`                | `noindex, nofollow` | None                                            |
| `/[locale]/dashboard/admin/*`        | Admin Only      | Dynamic Client Component          | `private, no-store`                | `noindex, nofollow` | None                                            |
| `/[locale]/dashboard/organization/*` | Org Staff/Owner | Dynamic Client Component          | `private, no-store`                | `noindex, nofollow` | None                                            |
| `/[locale]/dashboard/guardian/*`     | Guardian Only   | Dynamic Client Component          | `private, no-cache`                | `noindex, nofollow` | None                                            |
| `/[locale]/dashboard/student/*`      | Student Only    | Dynamic Client Component          | `private, no-cache`                | `noindex, nofollow` | None                                            |
| `/[locale]/dashboard/tutor/*`        | Tutor Only      | Dynamic Client Component          | `private, no-cache`                | `noindex, nofollow` | None                                            |
| `/[locale]/messages`                 | Authenticated   | Real-time WebSocket Client        | `private, no-store`                | `noindex, nofollow` | None                                            |
| `/[locale]/notifications`            | Authenticated   | Real-time WebSocket Client        | `private, no-cache`                | `noindex, nofollow` | None                                            |
| `/[locale]/safety-reports`           | Authenticated   | Encrypted Client Portal           | `private, no-store`                | `noindex, nofollow` | None                                            |

---

## 2. Rendering Rules & Invariants

1. **Server-Client Boundary:**
   - Root page wrappers (`page.tsx`) for public routes MUST be Server Components that execute `generateMetadata()` on the server.
   - Interactive UI elements (search filters, dropdowns, booking modals, tab switchers) are modular Client Components isolated with `'use client'`.
2. **Private Data Protection Invariant:**
   - Authenticated dashboards and personal portals MUST NEVER be generated statically at build time.
   - Private API responses MUST include HTTP header `Cache-Control: private, no-cache, no-store, must-revalidate`.
   - `sitemap.xml` and `robots.txt` MUST exclude all authenticated paths.
