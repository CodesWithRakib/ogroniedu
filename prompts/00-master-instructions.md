# Master Instructions for AI Coding Agents

**Project:** OgroniEdu — Bangladesh Tutoring and Educational Management Platform  
**Target:** Monorepo (`apps/web`, `apps/api`, `packages/contracts`, `packages/config`)  
**Package Manager:** `pnpm` exclusively via terminal CLI commands

---

## 1. Non-Negotiable Operational Rules

1. **Mandatory Pre-Reading Before Code Changes:**
   - Always read `README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SYSTEM_ARCHITECTURE.md`, `docs/USER_ROLES_AND_PERMISSIONS.md`, `docs/BUSINESS_RULES.md`, and `docs/traceability-matrix.md` before executing any phase.
2. **Scope Discipline & No Scope Creep:**
   - Strictly limit code modifications to the tasks explicitly assigned to the active phase. Do not implement future domain features early.
3. **No Direct Package.json Editing for New Packages:**
   - Always install new dependencies using terminal CLI commands:
     - Root: `pnpm add -D -w <package>`
     - Package/App: `pnpm add --filter <app-name> <package>`
     - UI Components: `pnpm dlx shadcn@latest add <component>`
4. **Strict TypeScript & Zero `any`:**
   - Compiler settings enforce strict typing (`noImplicitAny: true`, `strictNullChecks: true`). Never use `any` or disable compiler rules to bypass errors. Use generics, typed interfaces, or Zod schemas.
5. **No Blind Overwriting of Working Code or Existing Tests:**
   - Inspect files before modifying. Never disable, skip, or delete working tests to make a build pass.
6. **Zero Secrets in Source Control & Synthetic Data Only:**
   - Never commit credentials, API keys, or live passwords. No static mock arrays as production data. Seed synthetic demo data only through idempotent scripts restricted to development/test.
7. **Database Migrations as Canonical Source of Truth:**
   - Every database schema change requires an immutable SQL migration in `packages/database/migrations` and accompanying schema updates in `docs/database/schema.sql` and `docs/DATA_DICTIONARY.md`. Schema auto-synchronization (`synchronize: true`) is strictly forbidden.
8. **Server-Side Enforcement of Permissions & Ownership:**
   - Client-side UI hiding is NOT security. Enforce role checks and Guardian-Student resource ownership guards on every single API endpoint and WebSocket handler.
9. **Financial Integrity & Double-Entry Ledger:**
   - Store all monetary values as integer poisha (`bigint`). Every financial journal must balance debits and credits per currency. All gateway callbacks must be verified server-to-server and be idempotent.
10. **Bilingual Localization (Bangla & English):**
    - Every UI component, form, toast, and error message must support both Bengali (`bn`) and English (`en`).
11. **Verification Evidence Required:**
    - Execute real build, lint, and test commands in the terminal and report actual terminal output. Never claim a check passed without running it.

---

## 2. Required Phase Completion Report Structure

Every phase completed by an agent must produce a standardized report containing:

- **Phase Name & Objective:** Summary of work executed.
- **Files Modified/Created:** Clickable markdown links to all files.
- **Requirements Satisfied:** Mapping to Functional Requirement (FR) and NFR IDs.
- **Database Migrations:** Schema changes applied and verified.
- **Automated Tests Executed:** Test suites run, total test count, and actual terminal output.
- **Build & Lint Verification:** Commands executed and results.
- **Security & Authorization Checks:** Specific negative tests executed.
- **Known Limitations & Next Prompt:** Link to the exact sequential prompt to run next.
