# OgroniEdu — Security Release Checklist

## 1. Security Baseline & Verification Summary

This checklist validates the security controls across identity, authorization, transport, tenant isolation, payment processing, file uploads, and data protection for OgroniEdu.

---

## 2. Security Verification Matrix

| Category | Security Control | Implementation Mechanism | Evidence File | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | Password Hashing | bcrypt with salt rounds >= 12 | `auth.service.ts` | **PASS** |
| **Authentication** | JWT Signature Integrity | Signed with high-entropy secret; default secret blocked in production | `env.validation.ts`, `production-smoke.spec.ts` | **PASS** |
| **Authentication** | Session Cookie Security | `HttpOnly; Secure; SameSite=Lax` cookie flags | `auth.controller.ts` | **PASS** |
| **Authentication** | OTP Delivery Limiting | Max attempts tracked, rate-limited per phone/email | `otp-delivery.spec.ts` | **PASS** |
| **Authorization** | Role-Based Access Control | Strict RBAC guards (`@Roles(Role.ADMIN)`, `GUARDIAN`, `TUTOR`, `STUDENT`) | `roles.guard.ts`, `phase11-canonical-roles-matrix.spec.ts` | **PASS** |
| **Multi-Tenancy** | Organization Isolation | Tenant ID verification on every scoped query; cross-tenant IDOR rejected | `tenant-isolation-idor.spec.ts` | **PASS** |
| **Transport** | SSL / TLS Enforcement | HSTS header enabled, `sslmode=require` on PostgreSQL connections | `main.ts`, `migration-runner.ts` | **PASS** |
| **Transport** | CORS Restriction | Explicit origin allowlist (no wildcard `*` with credentials) | `main.ts` | **PASS** |
| **HTTP Security** | Security Headers | Helmet middleware: CSP, X-Frame-Options: DENY, X-Content-Type-Options | `main.ts` | **PASS** |
| **Rate Limiting** | DDoS & Abuse Protection | Global throttler + sensitive route limits (5 req/min on auth OTPs) | `app.module.ts` | **PASS** |
| **Input Validation** | Strict DTO Validation | Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true` | `main.ts` | **PASS** |
| **SQL Injection** | Parameterized Queries | TypeORM repository & parameterized raw queries (`$1, $2`) | `packages/database/src/` | **PASS** |
| **Information Leakage** | Exception Sanitization | `AllExceptionsFilter` masks 500 errors with generic message | `http-exception.filter.ts`, `production-smoke.spec.ts`| **PASS** |
| **File Storage** | Signed URL Protection | Private Supabase buckets; temporary presigned URLs expire in 15 mins | `files.service.ts` | **PASS** |
| **File Storage** | Upload File Type Validation | Magic byte MIME verification; restricts executable extensions | `files.controller.ts` | **PASS** |
| **Payment Integrity** | Webhook Signature Check | SSLCOMMERZ / bKash IPN HMAC validation and verification queries | `payments.service.ts`, `sslcommerz.adapter.spec.ts` | **PASS** |
| **Payment Integrity** | Idempotency Protection | `idempotency_keys` table prevents duplicate charge or double release | `idempotency.spec.ts` | **PASS** |
| **Payment Sandbox** | Live Safeguard | Sandbox flag enforced (`SSLCOMMERZ_IS_LIVE=false`, `BKASH_IS_SANDBOX=true`) | `apps/api/.env`, `apps/api/.env.example` | **PASS** |
| **Safeguarding** | Child Safety Escalation | Instant emergency SOS escalation and tamper-evident audit trails | `safeguarding.service.ts`, `safeguarding-security-authorization.spec.ts` | **PASS** |
| **Audit Trails** | Immutable Audit Logging | Structured audit event emission on administrative and sensitive actions | `audit.service.ts` | **PASS** |

---

## 3. Specific Security Policies

### 3.1 Data Protection & Privacy (GDPR / Bangladeshi ICT Act Compliance)
- **Data Minimization:** No unnecessary PII collected from students or guardians.
- **Account Deletion & Data Export:** Students and tutors can export their personal dossiers (`/api/v1/users/me/export`) and request account erasure (`/api/v1/users/me/delete-account`).
- **Child Protection Standard:** Guardian linking is strictly verified via verification codes (`GuardiansService`). Unlinked third parties cannot access a minor student's live session feeds or tutor chat logs.

### 3.2 Secret Management Standard
- Repository `.gitignore` strictly includes `.env`, `.env.local`, `.env.*.local`, `*.dump`, and `logs/`.
- CI/CD pipelines use encrypted GitHub Actions Secrets.
- Local tests utilize isolated sandbox secrets.
