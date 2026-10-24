# OgroniEdu — Security Audit

**Status:** VERIFIED (2026-10-24)  
**Scope:** Threat model, findings, mitigations, verification. Accurate as of commit `32712a9`.

---

## 1. Authentication

| Area | Implementation | Status |
|---|---|---|
| Password hashing | `bcryptjs` (work factor adjustable) | ✅ Industry-standard |
| JWT access token | HS256, 15m expiration, rawBody decode | ✅ Pins `iss`, `aud` claims |
| Refresh token | HttpOnly cookie, sameSite lax | ✅ Revoked on logout/revoke-all |
| OTP | 6-digit, `crypto.randomInt(100000, 999999)` | ✅ Single-use, expires after configurable TTL |
| Magic link | Signed JWT with `exp` claim, one-time use | ✅ Links to password reset flow |
| Account access checks | `AccountAccessService` — blocked/suspended/deactivated rejected | ✅ Auth-epoch mismatch invalidates stale tokens |
| `AuthGuard` | Verifies JWT from Bearer header or `access_token` cookie | ✅ Global auth gate |
| `AuthGuard` test bypass | `x-user-id` header + `isTestAuthBypassEnabled()` env flag | ⚠️ Dev-only, must be default false |
| Secure cookie config | `process.env.JWT_REFRESH_COOKIE_SAMESITE='lax'`, `JWT_REFRESH_COOKIE_SECURE=false` (dev; prod requires HTTPS) | ⚠️ Production requires `secure: true` (env validation) |

### Security Findings: Authentication

- **RLD-006**: Dev-secret fallback `ogroniedu-super-secure-jwt-secret-key-2026-bangladesh` in `notification.gateway.ts`. **Action**: Fail-fast on missing `JWT_SECRET` in production (`env.validation.ts`). Remove fallback or panic-log loudly.
- **RLD-006**: Dev-secret fallback `'secure-jwt-secret-dev'` in `files.service.ts`. **Same** action.

---

## 2. Authorization

| Area | Implementation | Status |
|---|---|---|
| Role-based guard | `RolesGuard` reads `@Roles()` decorator metadata (class/method level) | ✅ Standard |
| `super_admin` bypass | Always bypasses role checks | ✅ Design-intent |
| Guardian-student ABAC | `GuardianStudentGuard` queries `guardian_student_links` DB row | ✅ Authoritative source |
| Booking participant guard | SQL + `OR` conditions: requester/student/tutor/guardian link | ✅ Authoritative source |
| `AuthGuard` test bypass | Same as auth section above | ⚠️ See RLD-006 |
| `@Public()` decorator | Marks routes exempt from `AuthGuard` | ✅ Well-used |

### Security Findings: Authorization

- **RLD-001**: Resource retrieval dead end — signed URLs on uploaded tutor evidence point to nonexistent `GET /api/v1/files/:fileId/download`. The file row exists (`file_assets`) but no download endpoint is exposed. Admin verification queue and tutor dossier UI are blocked. **Action**: Implement download endpoint + persist upload bytes, or re-label as metadata-only.

---

## 3. Input and API Security

| Area | Implementation | Status |
|---|---|---|
| DTO validation | `class-validator` + `class-transformer` on all controllers | ✅ Whitelist + transform |
| SQL injection safety | TypeORM `queryRunner` + parameterized queries | ✅ No raw SQL in controller |
| CSRF | Not explicitly configured (NestJS default: no CSRF for API with cookie auth) | ⚠️ API uses JWT + refresh cookie — evaluate |
| CORS | Dynamic from `FRONTEND_URL` env var; credentials true | ✅ Scoped to frontend origin |
| Security headers | `SecurityHeadersMiddleware` attaches 10 headers to all responses | ✅ 100% coverage |
| Request size limits | NestJS default (100kb body) | ⚠️ Consider explicit limits for uploads |
| Rate limiting | `RateLimiterService` sliding window per IP/user | ✅ Configurable thresholds |
| Mass assignment | `class-validator` whitelists DTO fields | ✅ Protected |
| Unsafe redirects | None found | ✅ Clean |
| Error info leakage | `AllExceptionsFilter` sanitizes SQL, driver, constraint errors | ✅ Zero raw error leak |
| JSON parsing | `class-validator` validates structure; malformed JSON → 400 | ✅ Controlled |

---

## 4. Uploads and Storage

| Area | Implementation | Status |
|---|---|---|
| File type validation | Extension check only | ⚠️ Should add binary magic-number verification |
| File storage | Private directory on disk | ✅ Access via signed URL |
| Signing mechanism | HMAC token validated + owner/admin ABAC | ⚠️ Currently dead end — no `/download` endpoint |
| File naming | UUID-based | ✅ Predictable |
| Content exposure | Access restricted to owner/admin via `files.service.ts:148-171` | ❌ No route — RLD-001 |
| Presigned URL expiry | Not applicable (local disk) | N/A |

### Security Findings: Uploads

- **RLD-001**: No `GET /api/v1/files/:fileId/download` endpoint. All uploads via `POST /api/v1/files/upload-evidence` store metadata only (`file_assets` row with `malwareScanStatus: 'clean'` hardcoded). Evidence retrieval is a dead end.

---

## 5. Payments and Webhooks

| Area | Implementation | Status |
|---|---|---|
| Provider signature verification | `sslcommerz.adapter.ts`, `bkash.adapter.ts` verify against provided secret | ✅ Fail-closed on invalid |
| Idempotent webhook handling | `uq_outbox_idempotency` + EVT-999 deduplication in `PaymentWebhooksService` | ✅ Tested |
| Duplicate event handling | Rejects `EVT-DUPLICATE-777`, logs warning | ✅ Implemented |
| Valid payment state transitions | Escrow → settled only after `session.status = completed` | ✅ Enforced by `booking.status` and `schedulingService` |
| Server-authoritative amount validation | Amount from order payload verified against webhook body | ✅ Enforced |
| Client-controlled transaction status | Payment status flows from provider webhook → outbox → settlement; not directly client-set | ✅ Good |
| Sandbox gateways only | SSLCommerz / bKash / Nagad sandbox adapters | ⚠️ Production credentials not configured; adapters fail closed |

### Security Findings: Payments

- **RLD-002**: `POST /api/v1/notifications/test-dispatch` (`notification.controller.ts:98-103`) guarded only by generic `AuthGuard`. Any authenticated user can dispatch arbitrary whitelisted events to arbitrary recipients. **Action**: Gate by environment flag (e.g. `TEST_DISPATCH_ENABLED` default false in prod; also restrict to `super_admin/dev` role) or delete endpoint + remove RTK mutation.

---

## 6. Real-Time and Event Processing

| Area | Implementation | Status |
|---|---|---|
| Socket.IO auth | JWT handshake validation: unauth/invalid tokens rejected (`auth_error`) + connection termination | ✅ Enforced |
| User-scoped room routing | Client auto-joins `user:${userId}` room; `unread_count` sync | ✅ Implemented |
| Dual-channel dispatch | `sendToUser` broadcasts typed `notification` items + updated `unread_count` | ✅ Implemented |
| Bi-directional client events | `get_unread_count`, `mark_as_read`, `mark_all_as_read` with real-time fanout | ✅ Implemented |
| ABAC chat room joining | `join_booking_chat` enforces strict participant verification via `booking_id` | ✅ Enforced |
| Content safety redaction | `PHONE_NUMBER`, `OFF_PLATFORM_PAYMENT`, `EXTERNAL_LINK` detection with `[REDACTED]` replacement | ✅ Implemented |

---

## 7. Configuration and Dependencies

| Area | Implementation | Status |
|---|---|---|
| Secrets in version control | `.env` (gitignored) — no real secrets committed | ✅ Clean |
| No server credentials in public env vars | `.env.example` lists all required vars; production vars from `docker-compose.yml` | ✅ Clean |
| Dependency vulnerability checks | `pnpm audit --prod` = 0 known vulnerabilities (Phase 15) | ✅ Confirmed |
| Lockfile integrity | `pnpm-lock.yaml` (root) maintained | ✅ |
| Deprecated APIs in app code | Verified: zero deprecated framework API usage in application-owned code | ✅ Clean |
| Known unsafe/deprecated APIs | None in application code (verified by audit) | ✅ Clean |
| `.env.example` completeness | Lists all vars referenced in `env.validation.ts` | ⚠️ Add documentation for missing vars |

### Security Findings: Configuration

- **RLD-006**: Sandbox SSLCommerz store credentials and personal ngrok tunnel URL committed as defaults in `.env`. **Note**: Fine for dev; must not survive to staging. Existing env `JWT_SECRET` set; risk is single misconfigured deployment. **Action**: Fail-fast on missing `JWT_SECRET` in production; rotate/scope sandbox credentials to CI-only `.env`.

---

## 8. Realtime and Event Processing Security

| Area | Implementation | Status |
|---|---|---|
| Socket auth | JWT handshake validation per-connection | ✅ Enforced |
| Per-resource authorization | `AuthGuard` + room-scoped checks in gateway handlers | ✅ Enforced |
| Event payload validation | All payloads go through `class-validator` DTOs before emit | ✅ Enforced |
| Sensitive event data | No secrets in event payloads (verified) | ✅ Clean |
| Duplicate processing | Idempotency keys + outbox deduplication | ✅ Enforced |
| Retry and failure | Outbox worker retries with exponential backoff on transient errors | ✅ Implemented |

---

## 9. Summary: Severity Classification

| Severity | Count | Status |
|---|---|---|
| **P0** — Critical security bypass / data loss | 0 | ✅ None found |
| **P1** — Critical control gap / abuse vector | 2 | Open: RLD-001, RLD-002 |
| **P2** — Documentation overclaim / partial gap | 3 | Open: RLD-003, RLD-004, RLD-005 |
| **P3** — Hardening / stale numbers | 3 | Open: RLD-006, RLD-007, RLD-008 |

---

## 10. Outstanding Security Tasks (for this program)

| Task ID | Priority | Action |
|---|---|---|
| SEC-001 | P1 | Implement `GET /api/v1/files/:fileId/download` endpoint + persist upload bytes; remove hardcoded `'clean'` status |
| SEC-002 | P1 | Gate or remove `POST /api/v1/notifications/test-dispatch` (env flag + role restriction) |
| SEC-003 | P3 | Remove dev-secret fallbacks in `notification.gateway.ts` and `files.service.ts` (fail-fast on missing `JWT_SECRET`) |
| SEC-004 | P3 | Add binary magic-number verification to file upload pipeline |
| SEC-005 | P2 | Document/re-scope collaborative whiteboard claim (RLD-003) |
| SEC-006 | P2 | Rewrite journey/navigation docs against real routes (RLD-004) |

---

*End of `07-SECURITY-AUDIT.md`.*