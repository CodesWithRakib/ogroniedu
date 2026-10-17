# Changelog — UI/UX Refactor

**Date:** 2026-10-17 · **Version:** design system v2.0.0 (light-only) · **Status:** implemented, uncommitted.

## Added

- `apps/web/src/lib/theme/brand.ts` — exact approved brand hexes (Ocean Teal `#0df5c4`/`#00e1b2`, Sapphire `#2563eb`/`#3b82f6`) plus `relativeLuminance()` / `contrastRatio()` helpers.
- `--color-surface` / `--surface: #f8fafc` token — fixes 117 previously dead `bg-surface` utilities.
- Light-only sidebar token set, status `-soft` triples, `--gradient-hero` / `--gradient-card`, `.brand-ribbon`, `.card-hover-elevate`, `.animate-rise-in`, `.tabular-nums`.
- `Button asChild` regression test (`apps/web/test/components.spec.ts`) using `renderToStaticMarkup` through strict radix-slot.
- Docs: `docs/ui-refactor/*` (this set) + rewritten `docs/design-system-and-ui-guidelines.md` v2.0.0.

## Changed

| Area                                               | Change                                                                                                                                                                                                                    |
| :------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `globals.css`                                      | Rewritten as the single light-only source of truth (tokens, focus ring, reduced motion, scrollbars, selection, typography incl. Bengali rules).                                                                           |
| Brand usage                                        | Brand accents consume exact approved hexes as fills/indicators; readable derivations (`--primary` teal-700, `--interactive` sapphire) carry text/actions/links.                                                           |
| Markup (167 `src` files)                           | Three codemod passes converted dark-first and palette utilities to semantic tokens: `bg-slate-900→bg-card`, safe `text-white→text-foreground`, soft status washes, gradient panels → light brand cards, hover/focus maps. |
| `Button`                                           | `asChild` path now renders `<Slottable>` (fixes crash with radix-slot ≥1.4; see Fixed).                                                                                                                                   |
| `sonner` toaster                                   | Forced light; `next-themes` import removed.                                                                                                                                                                               |
| `Navbar` / `Topbar` / `authShell` / `BottomNavbar` | Tokenised; contrast-safe ink on mint/avatar/FAB.                                                                                                                                                                          |
| `checkoutMethodPicker`                             | Interactive gradient → light brand card; bKash/Nagad brand colours intentionally kept.                                                                                                                                    |
| `StudyTimeTrackerCard`                             | Play button mint fill + `brand-foreground` ink.                                                                                                                                                                           |
| `src/lib/navigation.ts`                            | Role badge/accent classes tokenised.                                                                                                                                                                                      |
| PWA assets                                         | `manifest.json` theme/background `#f6f8fa`; `offline.html` rewritten light (ink text, mint/ink button, sapphire focus).                                                                                                   |
| Tests                                              | `test/api-contract.spec.ts`: theme-registry test replaced by brand-config & contrast assertions.                                                                                                                          |

## Removed

- All 5 selectable palettes and dark-mode tokens/variants (~349 `dark:` usages across 74 files; ~718 hex literals across 37 files normalised/deleted).
- `ThemeProvider`, `ThemePicker`, `ThemeSwitcher`, theme registry, theme-init script, `data-theme`/`data-mode` attributes, theme fields in `ui-slice`, theme persistence.
- `next-themes` dependency (`apps/web/package.json`, `pnpm-lock.yaml`).
- Hardcoded sample analytics dataset default (was already removed pre-refactor; retained empty state documented).

## Fixed

- **All 10 public marketing routes returned HTTP 500.** Root cause: strict `@radix-ui/react-slot@1.4` counts the `{isLoading && <Loader2/>}` sibling (falsy) as a second child of `Slot` in `Button asChild`, throwing `"Slot failed to slot onto its children. Expected a single React element child or Slottable"`. Fix: `Button` wraps children in `<Slottable>` when `asChild`. Verified by dev smoke (10/10 routes → 200), production build, unit regression test, and E2E (`smoke.public` passes bn+en).

## Not changed (explicit)

- Role lists / `route-policy.ts` / any API, contract, or database file (see `API_AND_SCHEMA_CHANGES.md`).
- Canvas colours (`InteractiveWhiteboard`), payment-provider brand colours.
- Known issues B1/B2 (admin layout allow-list mismatch; duplicate trust components) — documented, not fixed.
