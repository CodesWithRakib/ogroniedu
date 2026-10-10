-- ==============================================================================
-- OgroniEdu — Auth Verification Codes & Contact Verification Migration (002)
-- Purpose: Support OTP/verification codes for email/phone verification and password recovery
-- ==============================================================================

CREATE TABLE IF NOT EXISTS auth_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('contact_verification', 'password_recovery', 'login_2fa')),
    code_hash TEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_auth_verification_contact_purpose ON auth_verification_codes(contact, purpose, expires_at) WHERE verified_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_auth_verification_user_id ON auth_verification_codes(user_id);
