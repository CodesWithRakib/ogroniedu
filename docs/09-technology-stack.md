# 09 — Technology Stack Decision

| Layer      | Candidate                              | Why                          | Verify                              |
| ---------- | -------------------------------------- | ---------------------------- | ----------------------------------- |
| Runtime    | Active Node LTS                        | supportability               | current LTS/framework compatibility |
| Web        | Next.js App Router + React + strict TS | SEO + interactive dashboards | stable support policy               |
| API        | NestJS                                 | modularity and DI            | release/Node support                |
| DB         | PostgreSQL                             | transactions and constraints | supported major/provider limits     |
| ORM        | TypeORM or justified alternative       | Nest ecosystem/migrations    | migration safety and team skill     |
| Jobs/cache | Redis + BullMQ where needed            | retryable background jobs    | provider limits                     |
| Forms      | RHF + Zod                              | accessible typed validation  | compatible versions                 |
| UI         | Tailwind + shadcn/ui                   | composable UI base           | accessibility review                |
| API docs   | OpenAPI/Swagger                        | visible contract             | generated schema correctness        |
| Tests      | Vitest/Jest, Supertest, Playwright     | layered coverage             | compatibility/CI setup              |

Assess Turborepo vs Nx, TypeORM vs Prisma/Drizzle, Redux Toolkit/RTK Query vs alternatives, managed Redis vs simpler early jobs, and storage providers. Choose stable compatible tools; record exact versions/date in `VERSION-VERIFICATION.md`. Avoid novelty without clear value.
