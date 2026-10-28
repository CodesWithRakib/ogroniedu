<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

## Agent Skills Reference

This repository maintains project skills in `.agents/skills/` (and tracked via `skills-lock.json`):

- `codebase-design` (`.agents/skills/codebase-design/SKILL.md`): Deep module architecture, clean seams, small interfaces with high leverage, and testability.
- `shadcn` (`.agents/skills/shadcn/SKILL.md`): CLI and component rules for adding, styling, and composing UI in `apps/web`.
- `frontend-design` (`.agents/skills/frontend-design/SKILL.md`): High-quality frontend visual design principles.
- `ui-ux-pro-max` (`.agents/skills/ui-ux-pro-max/SKILL.md`): Interaction design, responsiveness, and UX patterns.
- `vercel-react-best-practices` (`.agents/skills/vercel-react-best-practices/SKILL.md`): React and Next.js performance patterns.
- `web-design-guidelines` (`.agents/skills/web-design-guidelines/SKILL.md`): Web interface design and accessibility guidelines.
- `theme-factory` (`.agents/skills/theme-factory/SKILL.md`): Theme generation and design tokens.
- `nestjs-best-practices` (`.agents/skills/nestjs-best-practices/SKILL.md`): NestJS architecture, DI, modules, guards, and production patterns in `apps/api`.
- `postgres-patterns` (`.agents/skills/postgres-patterns/SKILL.md`): PostgreSQL query optimization, composite/partial indexes, and schema design in `packages/database`.
- `vercel-composition-patterns` (`.agents/skills/vercel-composition-patterns/SKILL.md`): React 19 compound components, state management, and scalable component architecture.
- `webapp-testing` (`.agents/skills/webapp-testing/SKILL.md`): Web application automation and Playwright testing workflows in `apps/web/e2e`.
- `tdd` (`.agents/skills/tdd/SKILL.md`): Test-driven development, red-green-refactor loop, and seam-based testing with Vitest.
