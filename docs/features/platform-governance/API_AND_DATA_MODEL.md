# Phase 09: Admin Operations, Organization Management & Platform Governance — API & Data Model

**Platform:** OgroniEdu (অগ্রণী ایڈু)  
**Phase:** 09: Admin Operations, Organization Management & Platform Governance  
**Date:** October 21, 2026  
**Status:** Approved & Implemented

---

## 1. Database Schema Migration `027_organizations_and_platform_governance.sql`

```sql
-- Migration: 027_organizations_and_platform_governance.sql
-- Module: Platform Governance & Multi-Tenant Organizations

-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'coaching_center' CHECK (type IN ('coaching_center', 'tutoring_agency', 'academic_institution')),
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'active', 'suspended', 'archived')),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    trade_license_number TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    address TEXT,
    division TEXT,
    district TEXT,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS ix_organizations_owner ON organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS ix_organizations_slug ON organizations(slug);

-- 2. Organization Memberships Table
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'tutor' CHECK (role IN ('owner', 'admin', 'staff', 'tutor')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'left')),
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_organization_member UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_organization_members_org_user ON organization_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS ix_organization_members_user ON organization_members(user_id);

-- 3. Organization Invitations Table
CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'tutor' CHECK (role IN ('admin', 'staff', 'tutor')),
    invited_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_organization_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS ix_organization_invitations_email ON organization_invitations(organization_id, email);

-- 4. Alter tutor_profiles to support institutional affiliation
ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_tutor_profiles_organization ON tutor_profiles(organization_id);

-- 5. Alter audit_logs to support tenant scoping
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_audit_logs_organization ON audit_logs(organization_id, created_at DESC);
```

---

## 2. HTTP REST Endpoints

### 2.1 Multi-Tenant Organization Endpoints (`/api/v1/organizations`)

#### `POST /api/v1/organizations`

Registers a new organization entity. Caller automatically becomes the initial `owner`.

- **Permissions**: `organization_owner`, `admin`, `super_admin`.
- **Request Body**:

```json
{
  "name": "Retina Medical Coaching Uttara",
  "slug": "retina-medical-uttara",
  "type": "coaching_center",
  "contactEmail": "uttara@retinabd.org",
  "contactPhone": "+8801712345678",
  "tradeLicenseNumber": "TRAD/DNCC/12345/2026",
  "division": "Dhaka",
  "district": "Dhaka",
  "address": "House 12, Sector 4, Uttara, Dhaka"
}
```

- **Response (`201 Created`)**:

```json
{
  "success": true,
  "data": {
    "id": "b1b2c3d4-0000-0000-0000-000000000001",
    "name": "Retina Medical Coaching Uttara",
    "slug": "retina-medical-uttara",
    "status": "pending_approval",
    "ownerUserId": "owner-uuid",
    "createdAt": "2026-10-21T06:00:00.000Z"
  }
}
```

#### `GET /api/v1/organizations`

Lists organizations affiliated with the authenticated user.

- **Permissions**: `organization_owner`, `organization_staff`, `tutor`.

#### `GET /api/v1/organizations/:id`

Retrieves tenant-scoped details for an organization.

- **Permissions**: Verified members of the organization or platform administrators.

#### `PATCH /api/v1/organizations/:id`

Updates organization metadata.

- **Permissions**: Organization `owner` or `admin`.

#### `GET /api/v1/organizations/:id/members`

Lists all members in the organization.

- **Permissions**: Verified members.

#### `POST /api/v1/organizations/:id/invitations`

Dispatches an invitation to a staff member or tutor.

- **Permissions**: Organization `owner` or `admin`.
- **Request Body**:

```json
{
  "email": "dr.nusrat@example.com",
  "role": "tutor"
}
```

#### `POST /api/v1/organizations/invitations/accept`

Accepts an invitation token and links the user to the organization.

- **Request Body**:

```json
{
  "token": "4f8a3b1c-9d2e-4f7a-8b3c-1d5e7f9a2b4c"
}
```

#### `DELETE /api/v1/organizations/:id/members/:memberId`

Removes a member from the organization.

- **Permissions**: Organization `owner` (cannot remove self without transferring ownership).

#### `POST /api/v1/organizations/:id/transfer-ownership`

Transfers the `owner` role to another active member.

- **Permissions**: Current organization `owner`.
- **Request Body**:

```json
{
  "newOwnerUserId": "member-uuid",
  "reason": "Retirement of founder and executive transition"
}
```

---

### 2.2 Platform Administration Endpoints (`/api/v1/admin/organizations`)

#### `GET /api/v1/admin/organizations`

Platform-wide registry of all organizations with status and date filtering.

- **Permissions**: `admin`, `super_admin`.

#### `PATCH /api/v1/admin/organizations/:id/status`

Approves, suspends, or archives an organization.

- **Permissions**: `admin`, `super_admin`.
- **Request Body**:

```json
{
  "status": "active",
  "reason": "Trade license verified with Dhaka North City Corporation"
}
```

---

### 2.3 Safe Reporting & CSV Export Endpoint (`/api/v1/admin/reports/export`)

#### `GET /api/v1/admin/reports/export`

Generates formula-safe CSV export stream.

- **Permissions**: `admin`, `super_admin`.
- **Query Parameters**:
  - `reportType`: `'users' | 'bookings' | 'financial' | 'tutors' | 'organizations'`
  - `from`: ISO Date (`2026-01-01`)
  - `to`: ISO Date (`2026-10-21`)
- **Headers**:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="report-users-2026-10-21.csv"`
- **Response**: Stream of sanitized CSV rows.
