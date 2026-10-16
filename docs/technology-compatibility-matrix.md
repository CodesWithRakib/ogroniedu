# Technology Compatibility Matrix & Peer-Dependency Governance

**Date:** 2026-10-10  
**Status:** Validated

---

## 1. Compatibility Matrix

| Dependency A        | Dependency B                                   | Compatible Versions                                                      | Verification / Notes                                                                                           |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Next.js**         | React & React DOM                              | Next.js 16.x / 15.x ↔ React 19.3.0                                       | Next.js 15+ officially targets React 19 as its primary runtime. Server Components and Actions fully supported. |
| **NestJS Core**     | @nestjs/websockets, @nestjs/platform-socket.io | NestJS 12.1.2 ↔ Socket.IO 4.8.4                                          | NestJS v12 provides native adapters for Socket.IO 4.8.x with TypeScript decorators.                            |
| **NestJS Core**     | @nestjs/typeorm & TypeORM                      | NestJS 12.1.2 ↔ @nestjs/typeorm 12.0.2 ↔ TypeORM 0.3.x / 1.x ↔ pg 8.23.1 | Seamless dependency injection and connection pooling across NestJS modules.                                    |
| **React Hook Form** | Zod & @hookform/resolvers                      | RHF 7.89.x ↔ @hookform/resolvers 5.9.1 ↔ Zod 3.24.x                      | Standardized form validation with typed resolvers across all client forms.                                     |
| **Next.js**         | next-intl                                      | Next.js 15/16 App Router ↔ next-intl 4.14.9                              | Full server-side cookie/header locale detection with async request routing.                                    |
| **Turborepo**       | pnpm Workspaces                                | Turbo 2.11.7 ↔ pnpm 12.4.2                                               | Pnpm workspace protocols (`workspace:*`) cleanly handled by Turborepo pipeline caching.                        |
| **Tailwind CSS**    | Radix UI / shadcn                              | Tailwind 4.x / 3.4.x ↔ Lucide React 1.54.x                               | Fully compatible with headless accessible primitives and CSS variables.                                        |
| **Node.js**         | PostgreSQL                                     | Node.js 22/26 ↔ PostgreSQL 16/18                                         | Node pg driver 8.23+ natively supports PostgreSQL wire protocol version 3.0 and scram-sha-256 auth.            |

---

## 2. Upgrade Governance & Incompatibility Mitigation

1. **Lockfile Pinned Policy**: Every automated CI check executes with `pnpm install --frozen-lockfile`. No dynamic resolution in build pipelines.
2. **Major Upgrades**: Major versions are never upgraded via automatic dependabot/renovate without an architectural review and integration test validation.
3. **TypeScript Ecosystem Alignment**: TypeScript compiler options enforce `moduleResolution: "bundler"` (frontend) and `moduleResolution: "node16"` / `"nodenext"` (backend) to prevent CJS/ESM interop breakage.
