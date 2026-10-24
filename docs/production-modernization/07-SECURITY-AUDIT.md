# OgroniEdu — Master Application Security Audit

**Status:** AUDITED & VERIFIED  
**Date:** 2026-10-24  
**Scope:** Risk-based security review covering OWASP Top 10 (2021), OWASP API Security Top 10 (2023), and platform-specific threat models across `@ogroniedu/api`, `@ogroniedu/web`, `@ogroniedu/database`, and `@ogroniedu/contracts`.

---

## 1. Executive Security Posture

The application demonstrates strong foundational defense-in-depth principles:
- **Authentication**: JWT access tokens (15-minute expiry) paired with database-backed refresh tokens in `httpOnly`, `secure`, `sameSite=lax` cookies.
- **Replay Attack Detection**: If an already-rotated or revoked refresh token is re-submitted, the system triggers family revocation, invalidating ALL active sessions for that user account.
- **Password Hashing**: Industry-standard `bcryptjs` with cost factor 12.
- **Financial Invariant**: Double-entry ledger with debit/credit balance equality enforced at the database transaction boundary.
- **PII & Log Sanitization**: `StructuredLoggerService` actively redacts passwords, tokens, NID, bank cards, OTPs, emails, and Bangladeshi phone numbers (`01[3-9]\d{8}`).

However, the audit identified specific security vulnerabilities and hardening gaps that must be remediated for the MVP launch.

---

## 2. Security Findings Register

| ID | Finding | OWASP Category | Severity | Component | Remediation Required | Status |
|---|---|---|---|---|---|---|
| `SEC-001` (`RLD-001`) | Verification Evidence File Download Endpoint Missing | API1:2023 Broken Object Level Authorization / Missing Function | **P1** | `FilesController` | Tutors upload verification dossiers; signed download URLs point to `GET /api/v1/files/:fileId/download`, but that endpoint does not exist. Must implement signed token verification + stream download. | Open |
| `SEC-002` (`RLD-002`) | Notification Test-Dispatch Verification Gap | API5:2023 Broken Function Level Authorization | **P1** | `NotificationController` | Runtime role check exists, but lacks dedicated automated negative test proving unauthenticated/non-admin requests are rejected with 403 Forbidden. | Needs Test |
| `SEC-003` (`RLD-006`) | Dev-Secret Fallbacks in Gateway and Files Service | API8:2023 Security Misconfiguration | **P2** | `notification.gateway.ts`, `files.service.ts` | Hardcoded fallback strings (e.g. `'secure-jwt-secret-dev'`) used if `JWT_SECRET` is unset. Must fail fast on startup if `JWT_SECRET` is missing in production. | Open |
| `SEC-004` | File Upload Binary Magic-Byte Inspection | API8:2023 Security Misconfiguration | **P2** | `FilesService` | File upload verifies MIME type string and extension, but does not inspect first 16 bytes (magic numbers) for PNG, JPG, PDF across all upload entry points. | Open |
| `SEC-005` | Auth Test Bypass Guard Hardening in Production | API2:2023 Broken Authentication | **P2** | `auth-bypass.guard.ts` | Ensure `ALLOW_TEST_AUTH_BYPASS` header can never bypass authentication when `NODE_ENV === 'production'`. | AUDITED |
| `SEC-006` | Webhook Timestamp Replay Tolerance | API8:2023 Security Misconfiguration | **P2** | `PaymentWebhooksService` | Enforce strict 300-second (5 min) timestamp window on provider webhook signatures to prevent packet replay. | Verified in tests |
| `SEC-007` | Cross-User Notification Access (IDOR) | API1:2023 BOLA / IDOR | **P2** | `NotificationService` | Ensure user B cannot view, read, or acknowledge notifications belonging to user A. | Verified in tests |

---

## 3. Deep-Dive Security Domain Audits

### 3.1 Authentication & Session Management
- **JWT Signing**: HS256 algorithm with secret read from `process.env.JWT_SECRET`. Enforces 15-minute expiry (`900s`).
- **Refresh Token Lifecycle**: Stored as SHA-256 hash in `auth_sessions` table (`packages/database`). Carries `expires_at` (30 days). Revoked upon logout or password change.
- **Account Status Enforcement**: `AuthGuard` queries user account state (`active`, `suspended`, `pending_approval`). Suspended accounts are immediately rejected with 401/403 even if JWT signature is valid.
- **Password Reset**: OTP generation utilizes `crypto.randomInt(100000, 999999)` for a cryptographically secure 6-digit code. TTL is 600s (10 min). Maximum 5 wrong attempts before code invalidation.
- **Magic Links**: 32-byte secure random token (`crypto.randomBytes(32).toString('hex')`). Stored in database as SHA-256 hash. 15-minute single-use validity.

### 3.2 Authorization (RBAC & ABAC)
- **Role Hierarchy**: 9 canonical roles: `student`, `guardian`, `tutor`, `admin`, `super_admin`, `support_agent`, `compliance_reviewer`, `organization_owner`, `organization_staff`.
- **Role Enforcement**: Implemented via `@Roles(...)` decorator and `RolesGuard`. SuperAdmin has emergency administrative overrides; compliance reviewer restricted to verification queue; support agent restricted to tickets and disputes.
- **Guardian-Student ABAC**: `GuardianStudentGuard` verifies that the authenticated guardian possesses an active, confirmed relationship in `guardian_students` table for the target `studentId`. Prevents unauthorized guardians from accessing other children's academic progress.
- **Booking-Chat BOLA**: Socket gateway and REST controller check that the current user is either the booking student, tutor, or authorized guardian before joining room `booking_chat:<bookingId>`. Non-participants are rejected with 403.

### 3.3 Payment & Webhook Security
- **HMAC Signatures**: SSLCommerz, bKash, and Nagad webhook endpoints verify signature headers against pre-shared gateway secret keys using `crypto.createHmac('sha256', secret)`.
- **Idempotency Protection**: Every payment webhook event ID is recorded in `payment_webhooks` table. Duplicate events with the same provider transaction ID return HTTP 200 immediately without executing state changes.
- **Amount & Currency Invariant**: Webhook callback amount is verified against the server-persisted `payment_orders.amount_poisha` record. Any mismatch rejects the payment and alerts the fraud/compliance queue.
- **Server-Authoritative States**: Client apps cannot mark orders paid. Only signed provider webhooks transition orders to `paid`.

### 3.4 Uploads & Storage Security
- **Private Storage**: Sensitive tutor evidence (NID card scan, educational certificates, criminal background checks) is stored in private storage (non-public directory / private S3 bucket).
- **Signed URL Access**: Private files can only be accessed via expiring signed URLs with HMAC signatures (`?token=...&expires=...`).
- **Filename Sanitization**: Uploaded files are assigned UUID filenames on disk (`${uuidv4()}.${extension}`). Original filenames are sanitized using regex `/[^a-zA-Z0-9._-]/g` to prevent directory traversal (`../`).

### 3.5 Defense Against Information Leakage
- **Error Sanitizer**: `AllExceptionsFilter` intercepts unhandled 500 errors and replaces raw PostgreSQL syntax errors, table names, or connection strings with generic messages (`"Internal server error"`) while attaching a correlation request ID (`req-...`).
- **Security Headers**: Standard OWASP HTTP response headers configured:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy`: Default restrictive policy allowing Next.js and Socket.IO connections.

---

## 4. Verification Evidence & Security Test Commands

Run the dedicated security test suites to verify platform defenses:
```pwsh
# 1. OWASP security headers, PII masking, file upload hardening, anti-replay
pnpm --filter @ogroniedu/api test test/security-and-privacy-hardening.spec.ts

# 2. RBAC, ABAC, and tenant isolation (BOLA/IDOR)
pnpm --filter @ogroniedu/api test test/safeguarding-security-authorization.spec.ts
pnpm --filter @ogroniedu/api test test/tenant-isolation-idor.spec.ts

# 3. Auth guard account status and token rotation
pnpm --filter @ogroniedu/api test test/auth-guard-account-status.spec.ts
pnpm --filter @ogroniedu/api test test/auth-tokens.spec.ts

# 4. Payment webhook signature and replay protection
pnpm --filter @ogroniedu/api test test/payments.service.spec.ts
pnpm --filter @ogroniedu/api test test/idempotency.spec.ts
```
