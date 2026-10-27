# Database & Migration Guidelines (`@ogroniedu/database`)

This package manages the PostgreSQL schema, TypeORM data-source connection, and database migrations for OgroniEdu.

## 1. PostgreSQL Patterns & Query Optimization
- **Skill Reference**: Consult [`.agents/skills/postgres-patterns/SKILL.md`](file:///C:/Sofof_tech_2026/ogroniedu/.agents/skills/postgres-patterns/SKILL.md).
- **Data Types**:
  - Always use `timestamptz` for timestamps (never bare `timestamp` without time zone).
  - Use `numeric(10,2)` or integer `poisha` for monetary amounts (never floating point `float` / `double`).
  - Use `text` instead of arbitrary `varchar(255)` unless length constraints are domain-enforced.
  - Foreign keys must be indexed to prevent table-scan locks during cascade operations.
- **Indexing Strategy**:
  - For composite indexes (`WHERE a = x AND b > y`), place equality columns first, then range columns.
  - Use partial indexes (`WHERE deleted_at IS NULL`) for soft-deleted tables to keep index tree compact.
  - Use GIN indexes for JSONB searches and full-text search columns.

## 2. Migration Discipline
- Schema migrations reside in `src/migrations/` as sequenced SQL files (e.g., `034_migration_name.sql`).
- Every migration must be idempotent and non-destructive in staging and production environments.
- Run tests with `pnpm --filter @ogroniedu/database test` to ensure migration integrity and benchmark compliance.
