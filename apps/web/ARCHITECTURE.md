# Frontend architecture (`apps/web/src`)

Small rules that keep this codebase maintainable. They are enforced by
code review and by the test suites (`pnpm test`, `pnpm e2e`), not by tooling
magic — when in doubt, follow the existing feature modules below.

## Layers

| Directory | Owns | Must never |
|---|---|---|
| `app/` | Thin route composers only: locale resolve → guard → feature page inside `<main id="main-content">`. No data fetching, no business logic. | Fetch data, duplicate a route URL (route groups share URLs; flat segments must stay unique). |
| `features/<domain>/` | One business domain: `pages/` (composition), `components/` (presentational), `hooks/` (state + data boundaries), `types/`, `utils/`, `index.ts` barrel. | Import from another feature except via its barrel; keep fake/demo data. |
| `components/` | Cross-domain shared UI: `ui/` primitives, `shared/` (tables, filters, states), `shell` (navbar/footer), `auth`, `dashboard`, plus legacy domain views still mounted by features pages/tests. | Add new domain views here — they belong in `features/`. |
| `layouts/` | Role shells (`TutorLayout`, …) used by feature pages. | Fetch data (receive everything via props). |
| `store/services/` | One RTK Query module per backend module, typed envelopes, tag invalidation. Single data-fetching system. | Raw `fetch()` to the API in components/pages (use the hooks). |
| `lib/` | Pure helpers (`i18n`, `api-error`, `api/*` parsers, `auth` routing, theme). | Import store or components (no cycles). |
| `hooks/` | Cross-domain client hooks. | Domain logic (belongs in the feature). |

## Data rules (non-negotiable)

1. Every user-visible number, list, or status comes from an authorized API
   response backed by persistent storage. Empty states stay empty until records
   exist — never seed the UI with demo rows.
2. Mutations refetch/invalidate; views never fabricate the result locally
   (no `sub-local-*` ids, no locally generated receipts, no fake ledgers).
3. Unexpected shapes fail loudly to error states via `normalizeApiError`
   (localized), never silently to invented content.
4. Auth is Bearer JWT from the persisted session; 401 clears the session and
   route guards bounce to login. No `x-user-id` bypasses, no `mock:` tokens
   outside backend tests.

## i18n rules

- All user-facing copy lives in `messages/bn.json` + `messages/en.json`
  (deep key parity is asserted by `test/i18n.spec.ts`).
- Aria-labels, titles, placeholders, and empty/error copy are localized too —
  including admin and shared components (they take an optional `locale` prop,
  default `'bn'`).
- Numbers/dates use `formatLocalizedNumber` and locale-aware formatters.

## Accessibility baseline

- One `<main id="main-content">` per page; skip link in the root layout.
- Every icon-only control has an `aria-label`; dialogs use `role="dialog"`
  + `aria-modal`; form inputs have `<label>`s; focus-visible ring and
  `prefers-reduced-motion` handling live in `globals.css`.
- Responsive matrix (`e2e/responsive.matrix.spec.ts`): 360 / 390 / 768 / 1280 /
  1440 must render with zero horizontal overflow. Decorative fixed-width
  layers must be viewport-capped (`max-w-[100vw]`) or clipped.

## E2E contract with tests

- `data-testid`s are a public contract: `*-form`, `*-btn`, `*-list`,
  `*-error`, `*-empty` patterns. Renaming one requires updating every spec
  that touches it (unit + Playwright).
- Playwright specs (`e2e/`) run against a live stack with seeded demo
  accounts; journey specs must be run-to-run repeatable (withdraw/cleanup
  first, serial mode for ordered flows).
