# 26 — Seed Data and Development Environment

Seed scripts are versioned, deterministic and idempotent. Production seed commands may create essential reference catalogs only; never create public demo users or fake reviews. Test/demo accounts are development/test only and synthetic. Do not use real children's data in fixtures.

Seed locality hierarchy, class/level catalog, curricula/boards, subjects, languages, tutoring modes and required status reference data. Document runtime, package manager, DB, Redis/queue, storage, email sandbox, payment sandbox, env variables, migrations, seeds and smoke tests. `.env.example` contains placeholders only. Validate required production settings at startup.
