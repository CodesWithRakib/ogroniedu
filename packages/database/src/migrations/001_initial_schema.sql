-- ==============================================================================
-- OgroniEdu — Initial Canonical Relational Schema Migration (001)
-- Target: PostgreSQL 16+ / 18
-- Standards: UUID v4 primary keys, UTC TIMESTAMPTZ, Integer Poisha Bigint amounts,
--            GiST Double-Booking Exclusion Constraints, Double-Entry Financial Ledger,
--            Transactional Outbox Pattern & Idempotency Store.
-- ==============================================================================

-- 1. PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. Core Identity & User Management
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    phone_e164 TEXT,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    preferred_locale TEXT NOT NULL DEFAULT 'bn' CHECK (preferred_locale IN ('bn', 'en')),
    status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'active', 'suspended', 'deactivated', 'deletion_pending')),
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_user_contact_present CHECK (email IS NOT NULL OR phone_e164 IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower ON users(lower(email)) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone ON users(phone_e164) WHERE phone_e164 IS NOT NULL AND deleted_at IS NULL;

-- 3. RBAC Roles & Permissions
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    PRIMARY KEY(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    ip_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoke_reason TEXT
);

CREATE INDEX IF NOT EXISTS ix_auth_sessions_user_active ON auth_sessions(user_id, expires_at) WHERE revoked_at IS NULL;

-- 4. Education Taxonomy (Curricula, Levels & Subjects)
CREATE TABLE IF NOT EXISTS curricula (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    country_code CHAR(2) NOT NULL DEFAULT 'BD',
    board_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS education_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'academic',
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 5. Guardian & Student Family Linking
CREATE TABLE IF NOT EXISTS guardian_student_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guardian_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'rejected', 'revoked')),
    consent_policy_version TEXT,
    consent_recorded_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(guardian_user_id, student_user_id),
    CONSTRAINT chk_guardian_student_different CHECK(guardian_user_id <> student_user_id)
);

CREATE INDEX IF NOT EXISTS ix_guardian_links_student_status ON guardian_student_links(student_user_id, status);

CREATE TABLE IF NOT EXISTS student_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    education_level_id UUID REFERENCES education_levels(id),
    curriculum_id UUID REFERENCES curricula(id),
    institution_name TEXT,
    stream TEXT,
    district_code TEXT,
    upazila_code TEXT,
    learning_goals TEXT,
    profile_visibility TEXT NOT NULL DEFAULT 'private' CHECK(profile_visibility IN ('private', 'limited')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. File Assets
CREATE TABLE IF NOT EXISTS file_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES users(id),
    storage_provider TEXT NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    original_filename TEXT,
    media_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK(size_bytes >= 0),
    checksum_sha256 TEXT,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private', 'public_approved')),
    purpose TEXT NOT NULL,
    malware_scan_status TEXT NOT NULL DEFAULT 'pending' CHECK(malware_scan_status IN ('pending', 'clean', 'infected', 'failed', 'not_required')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 7. Tutor Profiles & Verification
CREATE TABLE IF NOT EXISTS tutor_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    headline TEXT,
    bio TEXT,
    years_experience SMALLINT CHECK(years_experience >= 0),
    teaching_modes TEXT[] NOT NULL DEFAULT '{}',
    hourly_rate_minor BIGINT CHECK(hourly_rate_minor >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    verification_status TEXT NOT NULL DEFAULT 'not_submitted' CHECK(verification_status IN ('not_submitted', 'submitted', 'under_review', 'needs_information', 'approved', 'rejected', 'suspended', 'expired')),
    publication_status TEXT NOT NULL DEFAULT 'draft' CHECK(publication_status IN ('draft', 'published', 'unpublished')),
    response_time_minutes INTEGER CHECK(response_time_minutes >= 0),
    profile_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_teaching_modes_valid CHECK(teaching_modes <@ ARRAY['in_person', 'online', 'hybrid']::TEXT[])
);

CREATE INDEX IF NOT EXISTS ix_tutor_public_search ON tutor_profiles(verification_status, publication_status) WHERE publication_status = 'published';

CREATE TABLE IF NOT EXISTS tutor_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE CASCADE,
    qualification_type TEXT NOT NULL,
    institution TEXT,
    title TEXT NOT NULL,
    issued_year SMALLINT,
    expires_on DATE,
    evidence_asset_id UUID REFERENCES file_assets(id),
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending', 'approved', 'rejected', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tutor_verification_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE CASCADE,
    reviewer_user_id UUID NOT NULL REFERENCES users(id),
    decision TEXT NOT NULL CHECK(decision IN ('approved', 'rejected', 'needs_information', 'suspended', 'reinstated')),
    reason_code TEXT NOT NULL,
    internal_notes TEXT,
    policy_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_tutor_verification_history ON tutor_verification_reviews(tutor_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tutor_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id),
    education_level_id UUID NOT NULL REFERENCES education_levels(id),
    curriculum_id UUID REFERENCES curricula(id),
    stream TEXT,
    rate_minor BIGINT CHECK(rate_minor >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tutor_user_id, subject_id, education_level_id, curriculum_id, stream)
);

CREATE INDEX IF NOT EXISTS ix_tutor_subject_lookup ON tutor_subjects(subject_id, education_level_id, curriculum_id);

CREATE TABLE IF NOT EXISTS tutor_service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE CASCADE,
    district_code TEXT NOT NULL,
    upazila_code TEXT,
    locality_name TEXT,
    radius_km NUMERIC(5,2) CHECK(radius_km IS NULL OR radius_km >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_tutor_service_area ON tutor_service_areas(district_code, upazila_code);

CREATE TABLE IF NOT EXISTS tutor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE CASCADE,
    weekday SMALLINT NOT NULL CHECK(weekday BETWEEN 0 AND 6),
    start_local TIME NOT NULL,
    end_local TIME NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    effective_from DATE,
    effective_until DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT chk_availability_time CHECK(end_local > start_local)
);

-- 8. Booking, Scheduling & Double-Booking Exclusion Constraint
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_user_id UUID NOT NULL REFERENCES users(id),
    student_user_id UUID NOT NULL REFERENCES users(id),
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id),
    subject_id UUID NOT NULL REFERENCES subjects(id),
    education_level_id UUID NOT NULL REFERENCES education_levels(id),
    mode TEXT NOT NULL CHECK(mode IN ('in_person', 'online', 'hybrid')),
    status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested', 'accepted', 'awaiting_payment', 'confirmed', 'in_progress', 'completed', 'declined', 'cancelled', 'expired', 'disputed', 'replacement_requested')),
    price_per_session_minor BIGINT NOT NULL CHECK(price_per_session_minor >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    duration_minutes INTEGER NOT NULL CHECK(duration_minutes BETWEEN 15 AND 480),
    cancellation_policy_version TEXT NOT NULL,
    service_agreement_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_bookings_tutor_status ON bookings(tutor_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_bookings_student_status ON bookings(student_user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS booking_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id),
    student_user_id UUID NOT NULL REFERENCES users(id),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'reschedule_pending')),
    meeting_url TEXT,
    location_instructions TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_session_time_order CHECK(ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS ix_sessions_tutor_start ON booking_sessions(tutor_user_id, starts_at);
CREATE INDEX IF NOT EXISTS ix_sessions_student_start ON booking_sessions(student_user_id, starts_at);

-- Double-Booking Prevention: GiST Exclusion Constraint on Active Tutor Sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ex_tutor_session_overlap'
    ) THEN
        ALTER TABLE booking_sessions 
        ADD CONSTRAINT ex_tutor_session_overlap 
        EXCLUDE USING gist (
            tutor_user_id WITH =, 
            tstzrange(starts_at, ends_at, '[)') WITH &&
        ) 
        WHERE (status IN ('scheduled', 'in_progress'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS session_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES booking_sessions(id) ON DELETE CASCADE,
    participant_user_id UUID NOT NULL REFERENCES users(id),
    attendance_status TEXT NOT NULL CHECK(attendance_status IN ('present', 'late', 'absent', 'excused')),
    recorded_by UUID NOT NULL REFERENCES users(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    UNIQUE(session_id, participant_user_id)
);

-- 9. Double-Entry Financial Ledger
CREATE TABLE IF NOT EXISTS ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK(account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS ledger_journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id UUID NOT NULL REFERENCES ledger_journals(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES ledger_accounts(id),
    direction TEXT NOT NULL CHECK(direction IN ('debit', 'credit')),
    amount_minor BIGINT NOT NULL CHECK(amount_minor > 0),
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ledger_entries_journal ON ledger_entries(journal_id);
CREATE INDEX IF NOT EXISTS ix_ledger_entries_account_created ON ledger_entries(account_id, created_at DESC);

-- 10. Digital Payments & Gateway Callbacks
CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    payer_user_id UUID NOT NULL REFERENCES users(id),
    amount_minor BIGINT NOT NULL CHECK(amount_minor > 0),
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created', 'pending', 'succeeded', 'failed', 'expired', 'cancelled')),
    idempotency_key TEXT NOT NULL,
    provider TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(payer_user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_order_id UUID NOT NULL REFERENCES payment_orders(id),
    provider TEXT NOT NULL,
    provider_transaction_id TEXT,
    provider_event_id TEXT,
    amount_minor BIGINT NOT NULL CHECK(amount_minor >= 0),
    currency CHAR(3) NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'succeeded', 'failed', 'reversed')),
    verified_at TIMESTAMPTZ,
    raw_payload_redacted JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider, provider_transaction_id),
    UNIQUE(provider, provider_event_id)
);

-- 11. Centralized Notifications & Delivery Logs
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    title_key TEXT NOT NULL,
    body_key TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK(channel IN ('in_app', 'email', 'sms', 'push', 'whatsapp')),
    provider TEXT,
    provider_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'sent', 'delivered', 'failed', 'suppressed')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0),
    last_error_code TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(channel, provider, provider_message_id)
);

-- 12. Transactional Outbox, Idempotency & Audit Logs
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0),
    last_error_code TEXT
);

CREATE INDEX IF NOT EXISTS ix_outbox_pending ON outbox_events(created_at) WHERE published_at IS NULL;

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('processing', 'completed', 'failed')),
    resource_type TEXT,
    resource_id UUID,
    response_status INTEGER,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(scope, idempotency_key)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    request_id TEXT,
    reason TEXT,
    safe_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_audit_resource_created ON audit_logs(resource_type, resource_id, created_at DESC);
