# ADR-007: Next.js App Router with Bilingual Bengali & English Localization

**Status:** Accepted  
**Deciders:** Principal Architect, Frontend Lead  
**Date:** 2026-10-10

## Context

Serving Bangladesh requires primary support for Bengali (`bn`) with seamless English (`en`) toggling. The user interface spans public tutor discovery landing pages (demanding high SEO, Core Web Vitals, and fast First Contentful Paint) and interactive authenticated dashboards (tutor workspace, guardian portal).

## Decision

1. Adopt **Next.js App Router** with React Server Components (RSC) for public discovery, and Client Components for dynamic dashboards.
2. Standardize on **`next-intl`** for localization:
   - Root URL routing: `/[locale]/...` where locale is `bn` or `en`.
   - Locale cookie persistence (`NEXT_LOCALE`).
   - Type-safe dictionary messages with ICU format support.
3. Integrate **Tailwind CSS** with **shadcn/ui** and Google Font `Hind Siliguri` for readable Bengali typography.

## Consequences

- **Positive:** Outstanding SEO and server rendering for tutor profiles; zero runtime CSS bloat; native accessible UI primitives; complete bilingual coverage.
- **Negative:** Requires disciplined separation between Server Components and Client Components.
