# ADR-001 — Modular Monolith

Status: Proposed. Start with a NestJS modular monolith because the team is small and cross-domain transactions matter. Keep clear module ownership, exported application services and no circular dependencies. Revisit service extraction only when independent teams, fault isolation, deployment needs or measured scaling justify it.
