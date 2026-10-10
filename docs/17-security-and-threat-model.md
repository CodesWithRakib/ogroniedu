# 17 — Security and Threat Model

**Version:** 1.1.0  
**Status:** Approved Architectural Baseline  
**Standards:** STRIDE Threat Modeling, OWASP Top 10 API Security (2023), ISO/IEC 27001 Controls, Minor Data Privacy Baseline  
**Legal Disclaimer:** Technical implementation of these controls provides defensive hardening; it does not substitute for independent statutory legal counsel or regulatory certification under the Cyber Security Act 2023 of Bangladesh.

---

## 1. Asset Catalog & Threat Actors

### Primary Assets
1. **Identity & Authentication:** User accounts, password hashes (Argon2id/bcrypt), refresh token hashes, session records.
2. **Child & Guardian Records:** Minor learner profiles, date of birth, school enrollment, verified guardian links, parental consent agreements.
3. **Educator Credentials & Verification:** National ID (NID) cards, university degree certificates, police clearance records, bank accounts (`file_assets`).
4. **Tutoring & Academic Data:** Bookings, study room sessions, lesson logs, assignments, submissions, feedback comments.
5. **Financial Ledger & Transactions:** Payment orders, gateway transaction tokens, escrow holdings, double-entry journals (`ledger_journals`).
6. **Administrative Governance:** System configuration settings, feature flags, role assignments, audit logs.

### Threat Actors
- **External Attackers:** Automated credential stuffers, OTP brute-forcers, scraper bots, web application exploiters.
- **Malicious Consumers:** Abusive tutors or students attempting off-platform contact bypass, fraudulent refund claims, or fake reviews.
- **Compromised Integrations:** Man-in-the-middle attackers, forged webhook replays from payment gateways.
- **Malicious Insiders / Compromised Admins:** Support agents attempting unauthorized data exfiltration or role privilege escalation.

---

## 2. STRIDE Threat Model & Defense Matrix

| STRIDE Category | Threat Description | Mitigation & Architectural Controls | Automated Verification |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Forged webhook requests claiming payment settlement. | Provider HMAC signature verification (`verifyWebhookSignature`), timing-safe comparison (`crypto.timingSafeEqual`), and $\pm 5$ min timestamp window tolerance. | `security-and-privacy-hardening.spec.ts` |
| **Spoofing** | Attacker impersonating another student or tutor. | JWT bearer authentication (`AuthGuard`), short-lived tokens (15m), and secure rotating refresh tokens with replay detection. | `auth.service.spec.ts`, `auth.authorization.spec.ts` |
| **Tampering** | File upload MIME spoofing (executable renamed as `.pdf`). | Magic byte validation (`verifyMagicBytes`), strict extension checking, filename sanitization against path traversal (`..`, null bytes). | `files.service.spec.ts`, `security-and-privacy-hardening.spec.ts` |
| **Tampering** | Double-booking or tampering with escrow amounts. | Atomic database transactions, double-entry ledger balance invariants (Debits === Credits), status state-machine guards. | `payments.service.spec.ts`, `ledger.service.spec.ts` |
| **Repudiation** | Tutor or student denies booking agreement or message. | Immutable audit log trail (`audit_logs`) with request IDs, outbox events, and immutable service agreement snapshots. | `bookings.service.spec.ts`, `audit.service.spec.ts` |
| **Information Disclosure** | Broken Object-Level Authorization (BOLA/IDOR) on private files or bookings. | Ownership-scoped queries (direct participant or active guardian check), deny-by-default access, short-lived signed URLs for downloads. | `files.service.spec.ts`, `bookings.service.spec.ts` |
| **Information Disclosure** | Sensitive database error leaks in 500 API responses. | Canonical exception filter (`AllExceptionsFilter`) masking all 500 responses; client never sees SQL syntax or stack traces. | `http-exception.filter.ts`, `security-and-privacy-hardening.spec.ts` |
| **Information Disclosure** | PII leakage in application logs. | `StructuredLoggerService` automatically masking passwords, tokens, NID, bank accounts, emails, and Bangladeshi phone numbers. | `structured-logger.service.ts`, `security-and-privacy-hardening.spec.ts` |
| **Denial of Service** | Volumetric brute force on OTP or payment APIs. | Rate limiting via Redis/in-memory throttling, file upload max size enforced at 10MB. | `auth.service.spec.ts`, `files.service.spec.ts` |
| **Elevation of Privilege** | Student or tutor accessing administrative control queues. | Role-based access control (`RolesGuard`), least privilege hierarchy (`support_agent`, `compliance_reviewer`, `admin`, `super_admin`), protected super-admin role mutation. | `admin-operations.spec.ts`, `admin-operations.controller.spec.ts` |

---

## 3. OWASP API Security Top 10 (2023) Alignment

1. **API1:2023 Broken Object Level Authorization (BOLA):**
   - Implemented server-side ownership assertions across bookings (`assertCanPayForBooking`), learning records (`assertCanAccessStudentRecords`), and evidence files (`getFileAccess`).
2. **API2:2023 Broken Authentication:**
   - Password hashing with bcrypt, single-use OTP codes with expiration, rotating refresh token revocation.
3. **API3:2023 Broken Object Property Level Authorization:**
   - Strict `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`; TypeORM partial selects prevent unintended column exposure.
4. **API4:2023 Unrestricted Resource Consumption:**
   - File size upper bound (10MB); paginated list endpoints; database connection pooling.
5. **API5:2023 Broken Function Level Authorization:**
   - Strict `@Roles()` guard enforcement; non-admin users denied access to operations queues.
6. **API6:2023 Unrestricted Access to Sensitive Business Flows:**
   - Anti-double-spending checks on escrow release; booking status state machine prevents skipping payment.
7. **API7:2023 Server Side Request Forgery (SSRF):**
   - Outbound payment gateway requests strictly routed to allowlisted domains (`sandbox.sslcommerz.com`, `sandbox.payment.bkash.com`).
8. **API8:2023 Security Misconfiguration:**
   - `SecurityHeadersMiddleware` enforcing `nosniff`, `DENY` framing, HSTS with preload, and CSP.
9. **API9:2023 Improper Inventory Management:**
   - Automated OpenAPI documentation at `/api/docs`; deprecated routes removed; strict route separation.
10. **API10:2023 Unsafe Consumption of APIs:**
    - Cryptographic verification of payment provider webhooks; sanity checks on amounts and currencies.

---

## 4. Privacy, Data Retention & Erasure Protocols

1. **Data Portability (`GET /api/v1/users/me/export`):**
   - Users can retrieve full machine-readable JSON exports of personal profile, academic records, sessions, family links, and bookings without leaking credentials or counterparty sensitive data.
2. **Account Erasure & Safety Invariants (`POST /api/v1/users/me/delete-account`):**
   - Rejects deletion requests if the user has active ongoing bookings or unreleased escrow holdings (`BadRequestException`).
   - Clean accounts transition to `deletion_pending` status with immediate session revocation and a 30-day compliance retention hold before hard purging.
3. **Minor Consent Oversight:**
   - Minors (<18) cannot register unlinked accounts; guardians possess full visibility into booking notes, attendance, and safety reports involving their children.
