# Phase 09: Admin Operations, Organization Management & Platform Governance — Implementation Plan

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Phase:** 09: Admin Operations, Organization Management & Platform Governance  
**Date:** October 21, 2026  
**Status:** Approved Specification

---

## 1. System Architecture Overview

The Administrative Operations & Platform Governance architecture partitions authority into 5 distinct operational domains to guarantee least-privilege access, confidentiality, and tenant isolation:

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Portals (Next.js 16)"]
        AdminPortal["Admin & Governance Portal (/dashboard/admin)"]
        OrgPortal["Organization Management Portal (/dashboard/organization)"]
        StaffConsole["Support & Compliance Console (/dashboard/admin/disputes)"]
    end

    subgraph ApiGateway["API Gateway Layer (Port 4000)"]
        JwtAuth["JwtAuthGuard (Token & Status Check)"]
        RbacGuard["RolesGuard (9 Canonical Roles)"]
        TenantGuard["OrganizationScopeGuard (Tenant Isolation)"]
    end

    subgraph GovernanceModules["Backend Governance Modules"]
        AdminOps["AdminOperationsService (User Status, Roles, Settings)"]
        OrgService["OrganizationsService (Tenants, Members, Invites)"]
        SupportSvc["SupportService (Support Tickets Queue)"]
        SafetySvc["SafetyReportsService (Safeguarding Reviews)"]
        AuditSvc["AuditService (Append-Only Audit Stream)"]
        AnalyticsSvc["AnalyticsService & ReportExporter (Metrics & CSV)"]
    end

    subgraph DataStorage["Persistence Layer (PostgreSQL 18)"]
        DBOrgs["organizations & organization_members"]
        DBUsers["users & user_roles"]
        DBAudit["audit_logs (with tenant scope)"]
        DBSettings["system_settings & feature_flags"]
        DBTickets["support_tickets & safety_reports"]
    end

    AdminPortal --> JwtAuth
    OrgPortal --> JwtAuth
    StaffConsole --> JwtAuth

    JwtAuth --> RbacGuard --> TenantGuard

    TenantGuard --> AdminOps
    TenantGuard --> OrgService
    TenantGuard --> SupportSvc
    TenantGuard --> SafetySvc
    TenantGuard --> AuditSvc
    TenantGuard --> AnalyticsSvc

    AdminOps --> DBUsers
    AdminOps --> DBSettings
    OrgService --> DBOrgs
    AuditSvc --> DBAudit
    SupportSvc --> DBTickets
    SafetySvc --> DBTickets
```

---

## 2. Work Breakdown Structure (WBS)

### 2.1 Database Schema & Migration (`027_organizations_and_platform_governance.sql`)

- [ ] Create `organizations` table:
  - `id UUID PRIMARY KEY`, `name TEXT`, `slug TEXT UNIQUE`, `type TEXT`, `status TEXT`, `owner_user_id UUID REFERENCES users(id)`, `contact_email TEXT`, `contact_phone TEXT`, `address TEXT`, `division TEXT`, `district TEXT`, `settings JSONB`, timestamps.
- [ ] Create `organization_members` table:
  - `id UUID PRIMARY KEY`, `organization_id UUID REFERENCES organizations(id)`, `user_id UUID REFERENCES users(id)`, `role TEXT`, `status TEXT`, `invited_by UUID`, timestamps, `UNIQUE(organization_id, user_id)`.
- [ ] Create `organization_invitations` table:
  - `id UUID PRIMARY KEY`, `organization_id UUID`, `email TEXT`, `role TEXT`, `invited_by_user_id UUID`, `token TEXT UNIQUE`, `status TEXT`, `expires_at TIMESTAMPTZ`, timestamps.
- [ ] Add `organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL` to `tutor_profiles`.
- [ ] Add `organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL` to `audit_logs`.
- [ ] Add composite indexes for tenant queries: `ix_org_members_org_user`, `ix_audit_org_created`.
- [ ] Execute migration on PostgreSQL 18 and rebuild `@ogroniedu/database`.

### 2.2 Shared Contracts (`packages/contracts`)

- [ ] Create `packages/contracts/src/organizations.ts`:
  - Zod schemas: `CreateOrganizationSchema`, `UpdateOrganizationSchema`, `InviteOrganizationMemberSchema`, `UpdateOrganizationStatusSchema`, `QueryOrganizationsSchema`.
  - Export TypeScript types: `OrganizationRecord`, `OrganizationMemberRecord`, `OrganizationInvitationRecord`.
- [ ] Re-export from `packages/contracts/src/index.ts` and compile.

### 2.3 Backend API & Services (`apps/api`)

- [ ] Create `OrganizationsModule`:
  - Entities: `OrganizationEntity`, `OrganizationMemberEntity`, `OrganizationInvitationEntity`.
  - Service: `OrganizationsService`:
    - Tenant isolation checks on every member query.
    - Owner transfer protocol with audit logging.
    - Invitation dispatch and token redemption.
  - Controller: `OrganizationsController` (`/api/v1/organizations`):
    - Multi-tenant operations for `organization_owner` and `organization_staff`.
  - Controller: `AdminOrganizationsController` (`/api/v1/admin/organizations`):
    - Platform-wide governance for `admin` and `super_admin` (approve, suspend, view all).
- [ ] Enhance `AuditService`:
  - Support `organizationId` parameter in `RecordAuditParams`.
  - Add `getOrganizationAuditHistory(organizationId: string, limit?: number)`.
- [ ] Implement Report Export in `AnalyticsService`:
  - Endpoint `GET /api/v1/admin/reports/export`:
    - Supports `users`, `bookings`, `financial`, `tutors`, `organizations`.
    - Sanitizes CSV data with anti-formula injection rules (`'`, `=`, `+`, `-`, `@`).
    - Emits audit log for every exported dataset.

### 2.4 Frontend Web Application (`apps/web`)

- [ ] Update `navigation.ts`:
  - Add navigation configuration for `organization_owner` and `organization_staff` pointing to `/dashboard/organization`.
  - Add `Organizations` entry in Admin Navigation pointing to `/dashboard/admin/organizations`.
- [ ] Create RTK Query Service `organizations-api.ts`:
  - `getOrganizations`, `getOrganization`, `createOrganization`, `updateOrganization`, `inviteMember`, `removeMember`, `adminUpdateStatus`.
- [ ] Build Admin Organizations View:
  - `apps/web/src/app/[locale]/dashboard/admin/organizations/page.tsx`:
    - Filterable table with status badges (`pending_approval`, `active`, `suspended`).
    - Action dialog to Approve, Suspend, or Inspect an organization.
- [ ] Build Organization Portal:
  - `apps/web/src/app/[locale]/dashboard/organization/page.tsx`:
    - Organization overview, staff member table, invitation modal, and agency profile editor.

---

## 3. Sequence Diagrams

### 3.1 Organization Registration & Admin Approval Flow

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Organization Owner
    participant Web as Next.js Web Client
    participant OrgCtrl as OrganizationsController
    participant OrgSvc as OrganizationsService
    participant DB as PostgreSQL 18
    participant AdminCtrl as AdminOrganizationsController
    actor Admin as Platform Admin

    Owner->>Web: Fill organization registration form
    Web->>OrgCtrl: POST /api/v1/organizations {name, slug, type, contactEmail, etc.}
    OrgCtrl->>OrgSvc: createOrganization(owner, dto)
    OrgSvc->>DB: INSERT INTO organizations (status = 'pending_approval')
    OrgSvc->>DB: INSERT INTO organization_members (role = 'owner', status = 'active')
    OrgSvc-->>OrgCtrl: Organization Created (Pending Approval)
    OrgCtrl-->>Web: 201 Created

    Admin->>Web: Open Admin Organizations Queue
    Web->>AdminCtrl: GET /api/v1/admin/organizations?status=pending_approval
    AdminCtrl-->>Web: List of pending organizations
    Admin->>Web: Click "Approve Organization"
    Web->>AdminCtrl: PATCH /api/v1/admin/organizations/:id/status {status: 'active'}
    AdminCtrl->>OrgSvc: updateStatus(admin, id, 'active')
    OrgSvc->>DB: UPDATE organizations SET status = 'active'
    OrgSvc->>DB: INSERT INTO audit_logs (action = 'admin.organization.approved')
    AdminCtrl-->>Web: 200 OK (Organization Approved)
```

### 3.2 Member Invitation & Role Assignment Flow

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Organization Owner / Staff
    participant Web as Web Client
    participant OrgCtrl as OrganizationsController
    participant OrgSvc as OrganizationsService
    participant DB as PostgreSQL 18
    participant Email as Notification Gateway
    actor Invitee as Invited Tutor / Staff

    Owner->>Web: Enter invitee email & role ('staff' | 'tutor')
    Web->>OrgCtrl: POST /api/v1/organizations/:id/invitations {email, role}
    OrgCtrl->>OrgSvc: inviteMember(user, orgId, dto)
    OrgSvc->>OrgSvc: Verify caller is owner or admin in this organization
    OrgSvc->>DB: INSERT INTO organization_invitations (token = randomUUID)
    OrgSvc->>Email: Send invitation email with acceptance token
    OrgSvc-->>OrgCtrl: 201 Created (Invitation Sent)

    Invitee->>Web: Clicks invitation link with token
    Web->>OrgCtrl: POST /api/v1/organizations/invitations/accept {token}
    OrgCtrl->>OrgSvc: acceptInvitation(invitee, token)
    OrgSvc->>DB: INSERT INTO organization_members (user_id, role, status = 'active')
    OrgSvc->>DB: UPDATE organization_invitations SET status = 'accepted'
    OrgSvc-->>Web: 200 OK (Joined Organization)
```

### 3.3 Safe CSV Export with Anti-Formula Injection

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Authorized Admin
    participant Web as Next.js Web Client
    participant Api as AnalyticsController
    participant Export as ReportExportService
    participant Audit as AuditService
    participant DB as PostgreSQL 18

    Admin->>Web: Click "Export Users CSV"
    Web->>Api: GET /api/v1/admin/reports/export?reportType=users&from=2026-01-01
    Api->>Api: Verify user has 'admin' or 'super_admin' role
    Api->>Export: generateCsvStream('users', filters)
    Export->>DB: Execute bounded aggregate query
    DB-->>Export: Data rows
    loop For each cell in each row
        alt Cell starts with '=', '+', '-', '@', '\t', '\r'
            Export->>Export: Prepend single quote (') to neutralize spreadsheet formula execution
        end
    end
    Export->>Audit: record({action: 'admin.report.exported', reportType: 'users'})
    Export-->>Api: Sanitized CSV Stream
    Api-->>Web: 200 OK (Content-Type: text/csv, Content-Disposition: attachment)
    Web-->>Admin: Download safe CSV file
```

---

## 4. Rollback & Migration Safety Strategy

### 4.1 Zero-Downtime Migration

- `027_organizations_and_platform_governance.sql` uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- Foreign keys use `ON DELETE SET NULL` on `tutor_profiles` and `audit_logs` so existing rows remain 100% valid.

### 4.2 Rollback Script

```sql
ALTER TABLE tutor_profiles DROP COLUMN IF EXISTS organization_id;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS organization_id;
DROP TABLE IF EXISTS organization_invitations CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DELETE FROM schema_migrations WHERE version = '027_organizations_and_platform_governance';
```
