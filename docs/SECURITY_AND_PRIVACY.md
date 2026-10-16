# OgroniEdu — Security, Privacy & Child Protection Architecture

**Date:** 2026-10-10  
**Standard:** OWASP Top 10, STRIDE Threat Modeling, Minor Safety Baseline  
**Status:** Approved Security Specification

---

## 1. Authentication & Token Lifecycle

1. **Short-Lived Access Tokens:**
   - Format: Cryptographically signed JWT (RS256 or HS256 with 256-bit secret).
   - Lifetime: 15 minutes.
   - Claims: `{ sub: userId, roles: string[], exp: number, iat: number }`.
2. **Rotating Refresh Tokens:**
   - Lifetime: 7 days.
   - Storage: HTTP-Only, Secure, SameSite=Strict cookie (`refresh_token`).
   - Server-Side Revocation: Stored as SHA-256 hash in `auth_sessions(refresh_token_hash)`. Each token use triggers one-time rotation; reuse of an old refresh token revokes all user sessions immediately (Replay Detection).
3. **Password Hashing:**
   - Algorithm: Argon2id (or bcrypt with salt factor 12).
   - Plaintext passwords never logged, indexed, or stored.

---

## 2. Child Protection & Minor Safety Guardrails

Because the platform connects adult tutors with school students (Class 1–12), uncompromising child safety mechanisms are mandatory:

1. **Parental Supervision Model:**
   - Any learner under 18 years of age cannot register an unlinked independent account.
   - All booking agreements, financial transactions, and schedule modifications for minor students require explicit guardian authorization.
   - Guardians possess concurrent visibility into all messages, homework, and session notes involving their children.
2. **Contact Information Concealment:**
   - Direct personal phone numbers, physical residential addresses, and external social media links are obfuscated until a formal booking is accepted and paid.
   - In-app messaging pipelines employ automated regex scanners to detect and redact unauthorized phone numbers or off-platform communication bypass attempts.
3. **Physical & Hybrid Safety Verifications:**
   - In-person tutors must present verified National ID (NID) and police clearance / university student ID cards prior to home visit authorization.

---

## 3. PII Redaction & Data Sanitization

- **Structured Logging Rule:**
  - Phone numbers (`+88017****1234`), passwords, national ID numbers, and payment transaction tokens are scrubbed using logging interceptors prior to emission to Winston/Pino.
- **SQL Sanitization:**
  - All database queries use TypeORM parameterized queries or prepared statements. Raw string concatenation in SQL queries is prohibited by automated lint rules.
- **Header Hardening:**
  - Helmet middleware applies:
    - `Content-Security-Policy (CSP)`
    - `Strict-Transport-Security (HSTS)`: `max-age=31536000; includeSubDomains`
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`

---

## 4. File Storage Security & Malware Protection

- Verification documents (NID, grade cards) are stored in private object storage (S3/MinIO).
- Direct public URLs are disabled. Access is granted only via time-limited presigned URLs (60-minute expiry).
- File upload pipeline:
  1. Client requests presigned PUT URL.
  2. Client uploads directly to quarantine bucket.
  3. ClamAV background worker scans file.
  4. On clean scan, file moves to active bucket and `malware_scan_status` set to `'clean'`.
  5. On infected scan, file is deleted and security alert raised.
