# Phase 09: Admin Operations, Organization Management & Platform Governance — Audit Logging Policy

**Platform:** OgroniEdu (অগ্রণী ایڈু)  
**Phase:** 09: Admin Operations, Organization Management & Platform Governance  
**Date:** October 21, 2026  
**Status:** Approved Specification

---

## 1. Governance Principles

Audit logging is the foundational accountability backbone of OgroniEdu:

1. **Append-Only & Non-Tamperable**: Records written to `audit_logs` cannot be updated or deleted by any administrative role via the API.
2. **PII & Credential Neutral**: Passwords, tokens, OTPs, secret keys, bank account passwords, CVVs, and raw unredacted private message bodies are **strictly forbidden** from entering audit payloads.
3. **Tenant-Scoped**: Audit events occurring within an organization's context record `organization_id` to allow scoped institutional compliance inspection.
4. **Resilient Write Handling**: Failure of an audit log write must be logged to disk/stderr but must not crash critical business transactions or database integrity.

---

## 2. Audit Event Schema

| Field             | Data Type     | Nullable | Description                                                                               |
| :---------------- | :------------ | :------: | :---------------------------------------------------------------------------------------- |
| `id`              | `UUID`        |    No    | Primary Key (`gen_random_uuid()`).                                                        |
| `actor_user_id`   | `UUID`        |   Yes    | Foreign Key to `users(id)`. Null for automated system cron jobs.                          |
| `action`          | `TEXT`        |    No    | Machine event identifier (e.g. `admin.user.suspended`, `admin.organization.approved`).    |
| `resource_type`   | `TEXT`        |    No    | Target entity family (`users`, `organizations`, `bookings`, `system_settings`, `ledger`). |
| `resource_id`     | `TEXT`        |   Yes    | Target entity identifier (UUID or setting key).                                           |
| `organization_id` | `UUID`        |   Yes    | Scoped tenant ID (for multi-tenant organization actions).                                 |
| `request_id`      | `TEXT`        |   Yes    | Trace correlation identifier from HTTP/WebSocket request header.                          |
| `reason`          | `TEXT`        |   Yes    | Human-readable justification provided by the actor.                                       |
| `safe_metadata`   | `JSONB`       |    No    | Structured non-PII operational context (e.g. previous/new status, amounts in poisha).     |
| `created_at`      | `TIMESTAMPTZ` |    No    | Event timestamp (`now()`).                                                                |

---

## 3. Mandatory Audited Events

| Domain              | Event Action Key                           | Target Resource   | Required Metadata                                      |
| :------------------ | :----------------------------------------- | :---------------- | :----------------------------------------------------- |
| **User Governance** | `admin.user.suspended`                     | `users`           | Target user ID, reason, prior status.                  |
| **User Governance** | `admin.user.reactivated`                   | `users`           | Target user ID, reason.                                |
| **Role Assignment** | `admin.user.roles_updated`                 | `users`           | Target user ID, prior roles, new assigned roles.       |
| **Organizations**   | `admin.organization.approved`              | `organizations`   | Org ID, owner user ID.                                 |
| **Organizations**   | `admin.organization.suspended`             | `organizations`   | Org ID, suspension reason.                             |
| **Organizations**   | `admin.organization.ownership_transferred` | `organizations`   | Org ID, previous owner, new owner.                     |
| **System Settings** | `admin.system_setting.updated`             | `system_settings` | Setting key, updated value, previous value.            |
| **Feature Flags**   | `admin.feature_flag.updated`               | `feature_flags`   | Flag key, enabled status, canary rules.                |
| **Emergency Ops**   | `admin.booking.cancelled`                  | `bookings`        | Booking ID, reason, refund trigger status.             |
| **Emergency Ops**   | `admin.impersonation.started`              | `users`           | Target user ID, duration minutes, emergency ticket ID. |
| **Reporting**       | `admin.report.exported`                    | `analytics`       | Report type, date range, row count.                    |
| **Safeguarding**    | `compliance.safety_action.applied`         | `safety_reports`  | Case ID, target user ID, action type (`warn`, `ban`).  |

---

## 4. PII Redaction Implementation

When audit logs are streamed to the frontend or API consumers, `redactSensitiveData` transforms the payload:

```typescript
export function redactSensitiveData(entry: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...entry };
  if (sanitized.safeMetadata && typeof sanitized.safeMetadata === 'object') {
    const meta = { ...(sanitized.safeMetadata as Record<string, unknown>) };
    // Redact tokens, phone numbers, and emails from arbitrary metadata
    delete meta.token;
    delete meta.password;
    delete meta.otp;
    sanitized.safeMetadata = meta;
  }
  return sanitized;
}
```

---

## 5. Retention & Archival

- **Hot Online Storage**: Retained in primary PostgreSQL table `audit_logs` for **365 days**.
- **Cold Compliance Archive**: Annually partitioned and moved to encrypted WORM (Write Once, Read Many) cold storage for **7 years** in accordance with financial regulations and national child protection statutes.
