# Phase 09: Admin Operations, Organization Management & Platform Governance — Audit

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Phase:** 09: Admin Operations, Organization Management & Platform Governance  
**Date:** October 21, 2026  
**Auditor:** Senior Full-Stack Architect, Backend Engineer, Security Engineer, QA Lead  

---

## 1. Executive Summary & Purpose

OgroniEdu is a multi-sided educational platform built for the Bangladesh tutoring ecosystem. Operating at this scale requires a strict governance, administration, and multi-tenant organization architecture. Platform governance must enforce separation of duties, ensuring that general administrators, customer support agents, compliance reviewers, and institutional organization managers operate strictly within their authorized spheres of competence and confidentiality.

This audit examines the actual state of the monorepo codebase across authentication, 9-role authorization, existing admin modules, tenant architecture, moderation workflows, financial oversight, audit logging, and platform configuration.

---

## 2. Monorepo & Technology Stack Baseline

| Component | Technology | Version | Location / Package |
| :--- | :--- | :--- | :--- |
| **Monorepo Engine** | Turborepo | 2.11.7 | Root `turbo.json` |
| **Package Manager** | pnpm | 9.x | `pnpm-workspace.yaml` |
| **Backend Framework** | NestJS | 10.x | `apps/api` |
| **Database** | PostgreSQL | 18 (Alpine/Debian) | Port 5432, DB `ogroniedu_dev` |
| **ORM / Query Engine**| TypeORM | 0.3.x | `apps/api/src/database` |
| **Shared Contracts** | Zod + TypeScript | 3.23.x | `packages/contracts` |
| **Frontend Framework**| Next.js | 16.4.0 (Turbopack, App Router) | `apps/web` |
| **State Management** | Redux Toolkit (RTK Query) | 2.x | `apps/web/src/store` |
| **UI Design System** | Tailwind CSS v4 + Radix UI | Latest | `apps/web/src/components/ui` |

---

## 3. Canonical 9-Role System Audit

The platform establishes 9 canonical roles defined in `packages/contracts/src/identity.ts` (`PlatformRoles`):

```typescript
export const PlatformRoles = [
  'student',
  'guardian',
  'tutor',
  'support_agent',
  'compliance_reviewer',
  'admin',
  'super_admin',
  'organization_owner',
  'organization_staff',
] as const;
```

### 3.1 Role Verification Findings
1. **`student`**: Enrolled learner. Can book tutors, participate in sessions, view own history.
2. **`guardian`**: Parent/legal guardian. Can book on behalf of wards, access minor child progress, view mirrored notifications and messages under Child Safety laws.
3. **`tutor`**: Verified educator. Submits credentials for dossier verification, sets availability, accepts bookings, conducts lessons.
4. **`support_agent`**: First-line operations agent. Triages assigned support tickets (`api/v1/admin/support-tickets`), replacement cases, and operational booking queries. **Forbidden from viewing confidential safeguarding reports or private student-tutor chat transcripts.**
5. **`compliance_reviewer`**: Specialized legal and child protection investigator. Adjudicates sensitive child safety reports (`safety_reports`), urgent escalations, and unredacted audit evidence. Isolated from general platform financial operations.
6. **`admin`**: Platform operational administrator. Manages user status (suspension/reactivation), reviews tutor verification queues, oversees taxonomy, cancels emergency bookings with refund triggers. **Forbidden from modifying platform business settings or feature flags without super-admin grant.**
7. **`super_admin`**: Root executive governance role. Unrestricted platform authority: updates system settings (`system_settings`), feature flags (`feature_flags`), assigns roles (`PUT /users/:id/roles`), and initiates time-limited audited impersonation (`POST /impersonation/start`).
8. **`organization_owner`**: Proprietor of an educational coaching center or tutoring agency. Governs organization profile, invites tutors/staff, manages institutional tuition bookings, and inspects organization-scoped analytics.
9. **`organization_staff`**: Academic manager employed by an organization. Manages organization tutors and schedules.

---

## 4. Existing Administrative & Governance Implementation

### 4.1 Backend Admin Modules (`apps/api/src/modules/admin`)
- **`AdminOperationsController`** (`/api/v1/admin`):
  - `GET /dashboard`: Aggregates pending tutor verifications, active replacements, open safety reports, active bookings, total users, and double-entry ledger balance check via `AdminDashboardService`.
  - `GET /users`, `GET /users/:id/dossier`: User directory search with role and status filtering, full profile dossier with past booking counts and audit history.
  - `POST /users/:id/suspend`: Account suspension with mandatory reason logging in `audit_logs`. Self-suspension blocked; only `super_admin` can suspend another `super_admin`.
  - `POST /users/:id/reactivate`: Restores account to active status.
  - `PUT /users/:id/roles`: Restricted to `super_admin`. Reassigns user roles in `user_roles`.
  - `GET /bookings`: Search bookings across status, student, tutor.
  - `POST /bookings/:id/cancel`: Emergency administrative booking cancellation with automated escrow refund request trigger.
  - `POST /cases/assign`: Assigns support/replacement/dispute cases to staff.
  - `GET /reconciliation`: Inspects double-entry ledger reconciliation status.
  - `GET /settings`, `PUT /settings/:key`: Manages system parameters (`platform_fee_percent`, `cancellation_window_hours`, etc.). Restricted to `super_admin`.
  - `GET /feature-flags`, `PUT /feature-flags/:key`: Feature flag management with canary rules. Restricted to `super_admin`.
  - `POST /impersonation/start`: Issues 15-minute emergency audit-logged impersonation JWT token. Restricted to `super_admin`.
  - `GET /audit-logs`: Queries system audit logs with automated PII redaction (`redactSensitiveData`).

### 4.2 Support Module (`apps/api/src/modules/support`)
- **`AdminSupportController`** (`/api/v1/admin/support-tickets`):
  - Exposes ticket triage queue for `SUPPORT_TRIAGE_ROLES` (`['admin', 'super_admin', 'support_agent']`).
  - Supports status updates (`submitted`, `in_review`, `resolved`, `spam`) and resolution notes.

### 4.3 Trust & Safeguarding (`apps/api/src/modules/trust`)
- **`SafetyReportsController`** (`/api/v1/safety-reports`):
  - Governs safeguarding reports, evidence attachments, safety actions (`warn`, `temporary_suspension`, `ban`), and protective holds.
  - Confidentiality strictly enforced: ordinary administrators and support agents cannot access private child safety reports.

### 4.4 Analytics Module (`apps/api/src/modules/analytics`)
- **`AnalyticsController`** (`/api/v1/analytics`):
  - Provides operational overview, double-entry financial metrics, tutor leaderboard, and learner retention.

---

## 5. Architectural Gap Analysis for Phase 09

| Area | Current Baseline State | Phase 09 Mandate | Severity |
| :--- | :--- | :--- | :--- |
| **Organization Data Model** | Roles `organization_owner` and `organization_staff` exist in contracts, but **no `organizations`, `organization_members`, or `organization_invitations` tables exist in PostgreSQL.** | Create migration `027_organizations_and_platform_governance.sql` adding full relational tenant model with lifecycle (`pending_approval`, `active`, `suspended`, `archived`), membership management, and invitation tokens. | **CRITICAL** |
| **Tenant Isolation & IDOR Protection** | No server-side organization scope enforcement on queries. | Enforce server-side tenant scoping. Prevent cross-organization record visibility or mutation. Reject client-supplied `organizationId` without verified membership. | **CRITICAL** |
| **Organization Admin Management** | Platform admins have no dedicated APIs to review, approve, suspend, or audit educational organizations. | Implement `/api/v1/admin/organizations` endpoints and service methods to list, inspect, approve, and suspend organizations. | **HIGH** |
| **Audit Logs Tenant Scoping** | Table `audit_logs` has no `organization_id` column. | Add `organization_id UUID REFERENCES organizations(id)` to `audit_logs` to enable organization-scoped audit histories. | **HIGH** |
| **Administrative Reporting & CSV Export** | Analytics returns JSON aggregates only. No secure CSV export facility exists. | Implement `GET /api/v1/admin/reports/export` with date-range filters, scope validation, and **anti-formula injection escaping** (`=`, `+`, `-`, `@`, `\t`, `\r`). | **HIGH** |
| **Organization Frontend Hub** | `navigation.ts` lacks items for `organization_owner` and `organization_staff`. No organization dashboard exists. | Add navigation items and build Organization Portal (`/dashboard/organization`) for member management and agency profile. Build Admin Organizations View (`/dashboard/admin/organizations`). | **HIGH** |
| **Platform Settings Validation** | `updateSetting` accepts raw `JSONB` without runtime schema validation. | Implement explicit Zod schema validators for standard platform parameters. | **MEDIUM** |

---

## 6. Audit Recommendations & Strategy

1. **Incremental Schema Extension**: Create database migration `027_organizations_and_platform_governance.sql` to introduce `organizations`, `organization_members`, `organization_invitations`, add `organization_id` to `tutor_profiles`, and add `organization_id` to `audit_logs`.
2. **Dedicated Organizations Module**: Create `apps/api/src/modules/organizations` encapsulating organization registration, member management, invitation workflows, and admin approval pipelines.
3. **Strengthen Role-Based Guarding**: Ensure `organization_owner` and `organization_staff` can only manage resources belonging to their verified organization, while platform `admin` and `super_admin` maintain platform-wide governance.
4. **Anti-Formula Injection in Exports**: Ensure all CSV generation pipelines prepend a single quote (`'`) to any cell value beginning with `=`, `+`, `-`, `@`, `\t`, or `\r`.
5. **Preserve Existing Architecture**: Integrate directly with existing `AuditService`, `LedgerService`, `RefundsService`, and `NotificationGateway`.
