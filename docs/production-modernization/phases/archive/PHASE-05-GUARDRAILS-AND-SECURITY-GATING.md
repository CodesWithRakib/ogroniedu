# Phase 5 — Guardrails & Security Gating

**Date:** Day 4 of 7-day sprint  
**Duration:** 1 day  
**Owner:** Security Officer / Backend Lead  

---

## Objective

Gate the test-dispatch endpoint, enforce JWT_SECRET fail-fast, and close RLD-006 and RLD-002 findings before production release.

---

## Scope

| Task | Description |
|---|---|
| S5.1 | Add `TEST_DISPATCH_ENABLED` env variable to `env.validation.ts` (default: `false`) |
| S5.2 | Update `notification.controller.ts:test-dispatch` to check `process.env.TEST_DISPATCH_ENABLED` — return 403 when false |
| S5.3 | Remove dev-secret fallbacks in `notification.gateway.ts` and `files.service.ts` — make `JWT_SECRET` required; panic-log loudly if missing |
| S5.4 | Add `JWT_SECRET` validation at app startup (production mode only) — exit with status 1 if not set |
| S5.5 | Run app locally without `JWT_SECRET` — verify crash on startup (production config) |
| S5.6 | Run app with `JWT_SECRET` set — verify normal startup |
| S5.7 | Execute existing unit + integration tests — verify no breakage from env validation changes |

---

## Acceptance Criteria

- [ ] `TEST_DISPATCH_ENABLED` defaults to `false`; setting it to `true` + using super_admin/admin role allows dispatch; otherwise returns 403
- [ ] `notification.gateway.ts` fails loudly if `JWT_SECRET` env missing in production
- [ ] `files.service.ts` fails loudly if `JWT_SECRET` env missing in production
- [ ] App startup validates `JWT_SECRET` presence; exits gracefully in production if absent
- [ ] All existing tests pass after environment validation changes

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Developer workflow breakage (local dev without JWT_SECRET) | Dev mode has fallback path explicitly; `NODE_ENV=development` skips fail-fast check |
| Test-dispatch used accidentally in staging | Ensure `TEST_DISPATCH_ENABLED` is never true outside explicitly allowed environments |

---

*End of Phase 5.*