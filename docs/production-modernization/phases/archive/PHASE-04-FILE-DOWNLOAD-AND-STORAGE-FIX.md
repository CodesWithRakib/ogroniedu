# Phase 4 — File Download & Storage Fix

**Date:** Day 3 of 7-day sprint  
**Duration:** 1 day  
**Owner:** Backend Lead (files domain)

---

## Objective

Implement `GET /api/v1/files/:fileId/download` endpoint and persist upload bytes, resolving RLD-001 and enabling tutor evidence retrieval.

---

## Scope

| Task | Description                                                                                                           |
| ---- | --------------------------------------------------------------------------------------------------------------------- |
| S4.1 | Add `storage` column to `file_assets` migration (binary blob or external storage reference)                           |
| S4.2 | Update `files.service.ts:uploadEvidence` to persist upload bytes (use existing S3-compatible adapter or local gridFS) |
| S4.3 | Implement `GET /api/v1/files/:fileId/download` endpoint with signed URL or direct bytes streaming                     |
| S4.4 | Add MIME-type validation using binary magic-number verification (not just extension)                                  |
| S4.5 | Integrate with tutor verification flow: verification queue can now download evidence                                  |
| S4.6 | Run integration test: create tutor evidence → upload → download successfully returns file                             |
| S4.7 | Run `pnpm turbo run build` + `pnpm turbo run test:unit` — verify zero breakage                                        |

---

## Acceptance Criteria

- [ ] `GET /api/v1/files/:fileId/download` returns tutor evidence file (or 404 if not found)
- [ ] Download endpoint respects ABAC: only owner/admin can access
- [ ] Binary magic-number validation rejects non-image/pdf uploads with proper error envelope
- [ ] Upload bytes persisted; `file_assets.storage` column populated
- [ ] No regression in existing file upload flow

---

## Risk Mitigation

| Risk                                      | Mitigation                                                 |
| ----------------------------------------- | ---------------------------------------------------------- |
| Large file uploads cause timeout          | Stream uploads; set 100MB max size limit in config         |
| Storage cost overruns (if using external) | Cap evidence file size at 10MB; log warning for >5MB files |

---

_End of Phase 4._
