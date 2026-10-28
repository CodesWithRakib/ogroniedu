# NestJS API Guidelines (`@ogroniedu/api`)

This application is built with NestJS 12, TypeORM, and PostgreSQL.
When implementing, refactoring, or testing features in `apps/api`, adhere to the following project skills:

## 1. NestJS Architecture & Best Practices

- **Skill Reference**: Consult [`.agents/skills/nestjs-best-practices/SKILL.md`](file:///C:/Sofof_tech_2026/ogroniedu/.agents/skills/nestjs-best-practices/SKILL.md).
- **Feature Modules**: Organize by business domain feature (`modules/<domain>`), containing its own controllers, services, DTOs, and entities.
- **Dependency Injection**: Use constructor injection; avoid property injection or service locator patterns.
- **Input Validation**: Every request payload must be typed with a dedicated DTO and validated using `class-validator` / `class-transformer`.
- **Response Format**: Respect the canonical response contract: `{ success: true, data: T, meta: { requestId } }` and centralized exception envelope `{ success: false, error: { code, message, details? }, meta: { requestId } }`.
- **Lifecycle & Shutdown**: Ensure `app.enableShutdownHooks()` is active in `main.ts` for clean teardown.

## 2. Codebase Design & Seam Discipline

- **Skill Reference**: Consult [`.agents/skills/codebase-design/SKILL.md`](file:///C:/Sofof_tech_2026/ogroniedu/.agents/skills/codebase-design/SKILL.md).
- Design deep modules with small public interfaces and encapsulated business rules.
- Test at defined module seams rather than inspecting private implementation state.

## 3. Test-Driven Development (TDD)

- **Skill Reference**: Consult [`.agents/skills/tdd/SKILL.md`](file:///C:/Sofof_tech_2026/ogroniedu/.agents/skills/tdd/SKILL.md).
- Write tests in `test/` using Vitest.
- Follow the red-green-refactor loop: establish expectations against public interfaces before implementation.
