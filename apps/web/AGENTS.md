<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UI Component & Design System Guidelines (`shadcn`)

The `@ogroniedu/web` frontend uses shadcn/ui components (`new-york` style, `radix` base, `lucide-react` icons).
When building, modifying, or styling UI components:
- **Skill reference**: Consult `.agents/skills/shadcn/SKILL.md` and rules in `.agents/skills/shadcn/rules/`.
- **Imports**: Always import `cn` from `@/lib/utils` (never from `'cn'`).
- **Adding components**: Use `pnpm dlx shadcn@latest add <component>` from inside `apps/web`.
- **Layout & Spacing**: Use `flex` with `gap-*` (never `space-x-*` or `space-y-*`).
- **Dimensions**: Use `size-*` when width and height are equal (e.g. `size-10`).
- **Semantic colors**: Use `bg-primary`, `text-muted-foreground`, etc., rather than raw hex/color utilities.
- **Composition**: Ensure modals/dialogs contain accessible titles (`DialogTitle`, `SheetTitle`), and forms use standard field wrappers.

## React 19 Composition Patterns (`vercel-composition-patterns`)
- **Skill reference**: Consult `.agents/skills/vercel-composition-patterns/SKILL.md`.
- Avoid boolean prop proliferation (e.g., `isSecondary`, `hasHeader`, `withFooter`); prefer compound components with contextual composition.
- Decouple state management into clear provider components and use React 19 primitives (`use()` over `useContext()`).

## E2E Testing with Playwright (`webapp-testing`) & TDD (`tdd`)
- **Skill references**: Consult `.agents/skills/webapp-testing/SKILL.md` and `.agents/skills/tdd/SKILL.md`.
- End-to-end tests live in `e2e/`. Always wait for network idle and use accessible role/text selectors (`page.getByRole(...)`).
- Unit and integration tests live in `test/` using Vitest. Test at defined public component seams rather than internal state.
