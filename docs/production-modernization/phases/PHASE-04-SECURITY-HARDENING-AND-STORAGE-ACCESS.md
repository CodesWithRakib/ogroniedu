# Phase 04 — Security Hardening, Storage Access & Gating

**Phase ID:** `PHASE-04`  
**Phase Name:** Security Hardening, Storage Access & Gating  
**Estimated Effort:** 1 Day (Day 5)  
**Status:** READY  
**Owner:** Application Security Engineer & Backend Lead

---

## 1. Objective and Business Justification

Resolve all verified P1 and P2 security vulnerabilities discovered during the baseline audit. Specifically implement the missing file download endpoint (`RLD-001`), verify test-dispatch role gating (`RLD-002`), eliminate dev-secret fallback vulnerabilities (`RLD-006`), and enforce binary magic-number MIME type inspection.

---

## 2. Current-State Findings and Evidence

- **RLD-001 (P1)**: `POST /api/v1/files/upload-evidence` stores file metadata and issues signed URLs pointing to `GET /api/v1/files/:fileId/download`, but `FilesController` only contains `upload-evidence` and `:fileId/access`. When an admin tries to view or download a tutor's uploaded evidence, the endpoint 404s, blocking verification decisions.
- **RLD-002 (P1)**: `POST /api/v1/notifications/test-dispatch` has runtime checks in `notification.controller.ts`, but lacks dedicated negative tests verifying that unauthenticated or non-admin callers receive 403 Forbidden.
- **RLD-006 (P2)**: `notification.gateway.ts` and `files.service.ts` contain fallback strings (e.g. `'secure-jwt-secret-dev'`) if `JWT_SECRET` is unset.
- **SEC-004 (P2)**: Upload validation checks file extensions and client-declared mediaType, but does not inspect binary header bytes.

---

## 3. Exact Scope

1. Implement `GET /api/v1/files/:fileId/download` in `FilesController` and `FilesService`:
   - Validate HMAC signature and expiration timestamp from query parameters (`?token=...&expires=...`).
   - Verify that caller is either the file owner or has compliance/admin permissions.
   - Stream file bytes with appropriate `Content-Type` and `Content-Disposition` headers.
2. Add automated negative test in `apps/api/test/notification.authorization.spec.ts` asserting 403 Forbidden for non-admin callers of `test-dispatch`.
3. Remove all hardcoded dev-secret fallback strings; fail fast on application boot in production mode if `JWT_SECRET` is undefined.
4. Implement 16-byte magic-number inspection for PDF (`%PDF`), PNG (`\x89PNG`), and JPEG (`\xFF\xD8\xFF`).

---

## 4. Explicit Exclusions

- Do not introduce external commercial antivirus SaaS (keep validation local and deterministic).
- Do not change existing database migration files (create new migrations if needed).

---

## 5. Prerequisite Phases

- `PHASE-01-ARCHITECTURE-AND-TDD-FOUNDATION.md`
- `PHASE-03-BACKEND-SERVICE-INTERFACE-MODULARIZATION.md`

---

## 6. Tasks and Unique Task IDs

- `SEC-001`: Implement `GET /api/v1/files/:fileId/download` in `FilesController` and `FilesService`.
- `SEC-002`: Add automated negative test verifying `test-dispatch` 403 Forbidden gating.
- `SEC-003`: Remove dev-secret fallbacks in `notification.gateway.ts` and `files.service.ts`.
- `SEC-004`: Enforce binary magic-number MIME type inspection for uploads.

---

## 7. Actual Affected Files and Modules

- `apps/api/src/modules/files/files.controller.ts`
- `apps/api/src/modules/files/files.service.ts`
- `apps/api/src/modules/notifications/notification.controller.ts`
- `apps/api/src/modules/notifications/notification.gateway.ts`
- `apps/api/test/files.service.spec.ts`
- `apps/api/test/notification.authorization.spec.ts`
- `apps/api/test/security-and-privacy-hardening.spec.ts`

---

## 8. Files Created, Split, Moved, or Removed

- Modified: `files.controller.ts`, `files.service.ts`, `notification.gateway.ts`, test specs.

---

## 9. Frontend Work

- Confirm frontend file preview and download links in `TutorVerificationTab.tsx` point to `/api/v1/files/:fileId/download`.

---

## 10. Backend Work

- Implement download streaming handler using NestJS `@Res()` or `StreamableFile`.
- Add cryptographic token validation using `crypto.timingSafeEqual()`.

---

## 11. Database and Migration Work

- None required for endpoint addition.

---

## 12. Event-Driven Architecture Work

- Emit audit event `file.downloaded` on successful evidence retrieval.

---

## 13. Security Requirements

- Download tokens must expire within 15 minutes.
- Invalid or expired signatures must return 401 Unauthorized.
- Unauthorized users attempting to download other users' private files must receive 403 Forbidden (BOLA protection).

---

## 14. Unit Test Requirements

- `apps/api/test/files.service.spec.ts` passes owner download, compliance admin download, and rejects unauthorized users.
- `apps/api/test/security-and-privacy-hardening.spec.ts` passes anti-MIME spoofing tests.

---

## 15. Integration Test Requirements

- Supertest suite verifies `GET /api/v1/files/:fileId/download` returns HTTP 200 with raw file stream.

---

## 16. Browser Automation and E2E Scenarios

- `apps/web/e2e/tutor.evidence.spec.ts` uploads evidence and verifies file retrieval.

---

## 17. Required Commands

```pwsh
pnpm --filter @ogroniedu/api test test/files.service.spec.ts
pnpm --filter @ogroniedu/api test test/notification.authorization.spec.ts
pnpm --filter @ogroniedu/api test test/security-and-privacy-hardening.spec.ts
```

---

## 18. Acceptance Criteria

1. `GET /api/v1/files/:fileId/download` exists, validates signed tokens, and streams file bytes.
2. `POST /api/v1/notifications/test-dispatch` 403 Forbidden gating is verified by automated negative tests.
3. Zero dev-secret fallback strings remain in application code.
4. Binary magic-byte validation rejects spoofed files pretending to be PDFs or images.

---

## 19. Failure and Rollback Considerations

- If signed URL verification fails due to secret mismatches, verify `process.env.JWT_SECRET` is consistent.

---

## 20. Definition of Done

- Security findings `RLD-001`, `RLD-002`, `RLD-006` resolved with automated test evidence.

---

## 21. Expected Evidence

- Passing test logs for `files.service.spec.ts` and `security-and-privacy-hardening.spec.ts`.

---

## 22. Known Risks and Blockers

- None.

---

## 23. Estimated Effort

- 1 Day.

---

## 24. Next-Phase Dependencies

- Unblocks `PHASE-05-EVENT-DRIVEN-ARCHITECTURE-AND-OUTBOX.md` and `PHASE-06-DATABASE-INTEGRITY-AND-MIGRATIONS.md`.
