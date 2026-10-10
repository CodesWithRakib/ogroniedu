# OgroniEdu — Security Incident Response Runbook

**Document Version:** 1.0.0  
**Effective Date:** 2026-10-10  
**Classification:** Internal Operational Security Policy  
**Jurisdiction:** People's Republic of Bangladesh (Cyber Security Act 2023 / Digital Security Guidelines)

---

## 1. Purpose and Scope

This runbook outlines the operational procedures and escalation protocols for identifying, containing, mitigating, and documenting cybersecurity incidents, data breaches, and safety violations on the OgroniEdu tutoring marketplace.

It applies to all engineers, operations personnel, compliance reviewers, and executive officers responsible for the platform's infrastructure, customer data, and services.

> [!IMPORTANT]
> **Legal Disclaimer:** Technical execution of this runbook does not constitute complete statutory or regulatory fulfillment on its own. For high-severity incidents involving PII disclosure, legal counsel must be retained immediately to advise on mandatory disclosures under the Cyber Security Act 2023 and the Bangladesh Telecommunication Regulatory Commission (BTRC) guidelines.

---

## 2. Severity Classification Matrix

| Level | Name | Description | SLA Response | Escalation Path |
| :--- | :--- | :--- | :--- | :--- |
| **SEV-1** | **Critical Breach / Active Exploitation** | Active database compromise, unauthorized administrative privilege escalation, leakage of plain NIDs or child records, payment gateway key leakage, or ransomware. | **< 15 minutes** | VP Engineering, CTO, Legal Counsel, CEO |
| **SEV-2** | **High Risk Defect / Potential Exposure** | Broken Object-Level Authorization (BOLA) allowing cross-user reads, bypassed minor consent controls, webhook signature validation failure, or persistent denial of service. | **< 1 hour** | Lead Security Engineer, Engineering Manager, Compliance Lead |
| **SEV-3** | **Medium Risk Vulnerability** | Flaws in rate limiting, non-sensitive PII leaks in debug logs, dependency CVEs without known active exploitation, or minor CORS misconfigurations. | **< 8 hours** | Security Engineer, On-Call Backend Engineer |
| **SEV-4** | **Low / Informational** | Informational security scanner findings, minor documentation discrepancies, or benign credential stuffing blocked by existing rate limiters. | **< 24 hours** | Development Team backlog triage |

---

## 3. Incident Lifecycle & Operational Steps

### Phase 1: Identification & Triage

1. **Alert Ingestion:**
   - Alerts from Sentry, CloudWatch, structured logs (`StructuredLoggerService`), or user reports.
2. **Correlate Request Traces:**
   - Locate the canonical Request ID (`x-request-id`) in `AllExceptionsFilter` logs.
   - Query `audit_logs` using:
     ```sql
     SELECT * FROM audit_logs 
     WHERE request_id = 'incoming-request-id' 
     ORDER BY created_at DESC;
     ```
3. **Determine Scope:**
   - Ascertain whether minor accounts, National ID files (`file_assets`), or escrow funds (`ledger_journals`) are affected.

### Phase 2: Containment & Isolation

1. **Revoke Compromised Sessions:**
   - Execute instant session revocation via `AuthSessionEntity`:
     ```sql
     UPDATE auth_sessions 
     SET revoked_at = NOW(), revoke_reason = 'security_containment' 
     WHERE user_id = 'compromised-user-uuid' AND revoked_at IS NULL;
     ```
2. **Activate Emergency Feature Flags:**
   - If an ongoing automated attack targets bookings or payments, enable platform-wide protection via `feature_flags`:
     ```sql
     UPDATE feature_flags 
     SET enabled = true 
     WHERE key = 'emergency_maintenance_mode';
     ```
3. **Isolate Vulnerable Endpoints:**
   - Route traffic through upstream Cloudflare / Nginx WAF rules to block malicious IPs or user-agents.

### Phase 3: Investigation & Evidence Preservation

1. **Preserve Forensic Logs:**
   - Export audit logs, outbox tables, and access logs for the relevant timeframe to an immutable, write-once storage bucket.
   - Do NOT overwrite or delete database tables before forensic backup.
2. **Determine Breach Boundary:**
   - Calculate exact count of affected learners, guardians, and tutors.
   - Verify whether unredacted government IDs or banking details were queried.

### Phase 4: Eradication & Secret Rotation

1. **Secret Rotation Procedure:**
   - If credentials, database passwords, or JWT secrets were exposed:
     - Generate new 256-bit cryptographically secure secret: `openssl rand -hex 32`.
     - Update secrets in AWS Secrets Manager / environment configuration.
     - Invalidate all existing refresh tokens and signed file URLs.
2. **Payment Webhook Secret Rotation:**
   - Rotate `BKASH_WEBHOOK_SECRET` and `SSLCOMMERZ_STORE_PASSWD` in both the provider merchant console and OgroniEdu configuration.

### Phase 5: Recovery & Verification

1. **Deploy Hotfix:**
   - Apply patch through CI/CD pipeline with positive and negative automated regression tests.
2. **Run Monorepo Test Baseline:**
   - Ensure all unit, integration, and security tests pass (`pnpm test`).
3. **Gradual Traffic Restoration:**
   - Disable emergency maintenance mode.
   - Monitor error rates in `AllExceptionsFilter` for 2 hours post-recovery.

### Phase 6: Notification & Legal Compliance

1. **Statutory Notification in Bangladesh:**
   - If user PII or children's personal data was compromised, file an incident report with the National Computer Emergency Response Team (BGD e-GOV CIRT) and relevant regulatory bodies under statutory timeframes.
2. **Guardian & Learner Notification:**
   - For compromised accounts involving minors, directly contact registered guardians via verified SMS and email explaining the scope, mitigations applied, and recommended protective actions.

### Phase 7: Postmortem & Continuous Improvement

1. **Blameless Postmortem Meeting:**
   - Schedule within 72 hours of incident resolution.
2. **Publish Postmortem Artifact:**
   - Document root cause (Five Whys), timeline, impact, what went well, what went wrong, and concrete prevention action items with assignees and due dates.
