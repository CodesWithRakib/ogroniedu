# 23 — DevOps and Deployment

Environments: local, CI/test, staging, production. Separate DBs, credentials, buckets, webhook secrets, provider modes and seed rules. Production must never seed demo accounts.

CI/CD: frozen install; lint/typecheck; unit/integration; migration validation; security checks; build; E2E smoke; deploy with health checks; safe migrations; post-deploy verification. Use hosting secret manager and strict startup validation. Never expose server secrets through client variables.

Compare region, PostgreSQL durability/pooling, backup/restore, Redis/queue, storage egress, email/SMS deliverability, support, uptime and total cost. Free tiers may have limits and are not assumed production-safe. Define code rollback separately from database rollback; prefer backward-compatible expand/contract migrations and forward-fix when rollback risks data loss.
