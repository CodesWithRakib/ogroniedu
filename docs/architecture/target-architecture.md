# Target Architecture (Phase 22)

## 1. Principles

Thin routes → feature pages → feature modules → shared primitives → contracts. Backend: controllers (transport) → services (domain) → entities. No fat files, no mixed responsibilities, no fake data.

## 2. Backend (`apps/api/src`)

```
src/
  main.ts                 # bootstrap: ValidationPipe, AllExceptionsFilter, ResponseMetaInterceptor, Swagger
  app.module.ts           # imports feature modules only; entity list re-exported from modules
  common/
    api-response/         # success envelope, collection envelope, response helpers (NEW)
    api-error/            # error codes, error envelope, exception→code map (NEW)
    pagination/           # OffsetQueryDto, CursorQueryDto, paginate() helpers, sortable-field guard (NEW)
    interceptors/         # ResponseMetaInterceptor — injects meta.requestId, never double-wraps (NEW)
    filters/              # AllExceptionsFilter — returns canonical error envelope (REWORK)
    guards/ decorators/ pipes/ logging/ validation/  (existing, keep)
  modules/<domain>/
    controllers/  services/  dto/  entities/  enums/  interfaces/  constants/  tests/
```

- Each domain splits by responsibility: e.g. `tutors/services/tutor-profile.service.ts`, `tutor-search.service.ts`, `tutor-verification.service.ts` behind the existing `TutorsService` facade (no import break).
- `booking.entity.ts` splits into `entities/booking.entity.ts`, `enums/booking-status.enum.ts`, `enums/tutoring-mode.enum.ts`, `interfaces/service-agreement-snapshot.interface.ts` with type-only re-exports for compat.
- Controllers return `ok(data)`, `created(data)`, `paginated(items, {page,pageSize,totalItems})` helpers — never hand-built envelopes.

## 3. Frontend (`apps/web/src`)

```
src/
  app/[locale]/           # THIN routes: locale → layout/guard → <FeaturePage/> (10–40 lines each)
    (public)/ (auth)/ (student)/ (guardian)/ (tutor)/ (admin)/
  features/<domain>/      # owns api/, components/, hooks/, schemas/, types/, utils/, pages/, index.ts
  components/
    ui/                   # shadcn (existing) — add badge/skeleton/table/pagination as needed
    shared/               # PageContainer, PageHeader, StatCard, StatusBadge, DataTable, FilterToolbar,
                          # SearchInput, ConfirmDialog, FormField, EmptyState/ErrorState/LoadingState (NEW)
  layouts/                # student/guardian/tutor/admin/super-admin shells (NEW, wrap DashboardShell)
  lib/
    api/                  # contract.ts, parse.ts, query.ts (typed qs serializer) (NEW)
    theme/                # themes.ts, ThemeProvider, useTheme (NEW)
    auth/ permissions/ routing/ i18n/ utils/
  hooks/                  # useOffsetPagination, useCursorPagination, useDebouncedSearch, useUrlTableState (NEW)
  providers/ store/ styles/ types/ config/
```

- RTK Query stays the single data layer. Feature `api/*.ts` inject endpoints into `baseApi`; shared `lib/api/*` owns envelope parsing, error normalization, query serialization (removes per-file `toQueryString` duplication).
- Route guard: `<RequireRole allow={[...]}>` + `primaryRole()` for nav; hidden buttons never substitute for server checks.

## 4. API contract (summary; full spec in `api-contract-standard.md`)

- Item: `{success:true, data, message?, meta:{requestId}}`.
- Offset collection: `meta.pagination = {strategy:'offset', page, pageSize, totalItems, totalPages, hasNextPage, hasPreviousPage}` (+ legacy top-level `total` during migration, then removed).
- Cursor collection: `meta.pagination = {strategy:'cursor', nextCursor, previousCursor, hasNextPage, pageSize}`.
- Error: `{success:false, error:{code, message, details?:[{field?,code,message}]}, meta:{requestId}}`.
- Exceptions: file downloads, webhooks, health, auth callbacks are exempt.

## 5. Pagination policy

- Offset: admin tables, user management, verification queues, tutor search (page navigation + totals).
- Cursor: chat history, notifications, activity/audit feeds, infinite scroll.
- Frontend: `useOffsetPagination`/`useCursorPagination` + `useUrlTableState` (shareable `?page=&sort=&q=`), debounced search, filter chips, retry/empty states.

## 6. Themes & typography

- Three data-theme values on `<html>`: `midnight-violet` (default), `ocean-teal`, `emerald-slate`. Semantic CSS vars only (`--background`, `--primary`, `--sidebar-*`, `--chart-*`, `--gradient-*`); no hardcoded page colors.
- `next/font` (Inter + Hind Siliguri) via `next/font/google` with Bangla subset; logical CSS properties for RTL readiness; `prefers-reduced-motion` respected; durations/easings centralized.
