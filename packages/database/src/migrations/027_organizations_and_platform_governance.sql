-- Migration: 027_organizations_and_platform_governance.sql
-- Module: Platform Governance & Multi-Tenant Organizations
-- Target: PostgreSQL 16+ / 18

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
