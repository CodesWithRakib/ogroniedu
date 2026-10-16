-- ==============================================================================
-- OgroniEdu — Phase 01 Authentication Completion Migration (013)
-- Purpose:
--   1. users.auth_epoch — monotonic credential epoch so access tokens issued
--      before a password change / forced revocation / suspension stop working.
--   2. user_onboarding — server-owned, per-role onboarding progress. Onboarding
--      state is deliberately separate from authentication state and from account
--      authorization (users.status / user_roles).
--   3. auth_magic_links — passwordless single-use, time-limited login tokens.
--      Only the SHA-256 hash of the token is stored.
-- Forward-only, idempotent and safe to re-run.
-- ==============================================================================

-- 1. Credential epoch (bumped on password change / forced session revocation) ----
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS auth_epoch INTEGER NOT NULL DEFAULT 0;

-- 2. Per-role onboarding progress -----------------------------------------------
CREATE TABLE IF NOT EXISTS user_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'pending_review', 'completed')),
    completed_steps TEXT[] NOT NULL DEFAULT '{}',
    pending_steps TEXT[] NOT NULL DEFAULT '{}',
    step_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role_code)
);

CREATE INDEX IF NOT EXISTS ix_user_onboarding_user ON user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS ix_user_onboarding_incomplete
    ON user_onboarding(status) WHERE status <> 'completed';

-- 3. Passwordless magic-link login tokens ---------------------------------------
CREATE TABLE IF NOT EXISTS auth_magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    purpose TEXT NOT NULL DEFAULT 'login' CHECK (purpose IN ('login')),
    redirect_path TEXT,
    requested_ip_hash TEXT,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_auth_magic_links_active
    ON auth_magic_links(user_id, expires_at) WHERE consumed_at IS NULL;
