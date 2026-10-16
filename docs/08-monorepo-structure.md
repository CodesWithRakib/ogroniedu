# 08 — Monorepo Structure

```text
tutoring-platform/
├── apps/web/                 # Next.js public site and dashboards
├── apps/api/                 # NestJS REST API
├── apps/worker/              # Optional isolated queue worker
├── packages/contracts/       # Browser-safe shared schemas/types
├── packages/ui/              # Shared accessible UI
├── packages/config/
├── packages/eslint-config/
├── packages/tsconfig/
├── packages/test-utils/
├── docs/
├── scripts/
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

Use pnpm workspaces; Turborepo is reasonable if the build/test task graph benefits from caching. Compare Nx or plain workspaces during audit. Keep browser-safe contracts free of ORM entities, secrets and Node-only modules. Shared schemas do not replace server validation. Pin Node/package manager and commit lockfile.

Expected scripts: `lint`, `typecheck`, `test`, `test:integration`, `test:e2e`, `build`, `db:migrate`, `db:seed`, `docs:validate`. Confirm exact commands during bootstrap.
