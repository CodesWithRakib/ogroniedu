-- ==============================================================================
-- OgroniEdu — Phase 05: Escrow, Refunds, Payouts & Invoices (022)
-- Purpose: durable webhook events, escrow holds, versioned commission policy,
-- session settlements, tutor payable dimension, payout lifecycle, invoices and
-- reconciliation runs. Extends the existing payments/ledger schema; it does not
-- replace it.
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 1. Versioned commission policy
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commission_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    version INTEGER NOT NULL CHECK (version > 0),
    platform_fee_bps INTEGER NOT NULL CHECK (platform_fee_bps BETWEEN 0 AND 10000),
    min_payout_minor BIGINT NOT NULL DEFAULT 50000 CHECK (min_payout_minor >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    is_active BOOLEAN NOT NULL DEFAULT false,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (code, version),
    CONSTRAINT chk_commission_window CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- Only one active version per policy code.
CREATE UNIQUE INDEX IF NOT EXISTS ux_commission_policies_active
    ON commission_policies (code)
    WHERE is_active;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM commission_policies WHERE code = 'default') THEN
        INSERT INTO commission_policies
            (code, version, platform_fee_bps, min_payout_minor, currency, is_active, notes)
        VALUES
            ('default', 1, 800, 50000, 'BDT', true,
             'Phase 05 baseline: 8% platform commission, BDT 500 minimum payout');
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Payment order snapshots
-- ---------------------------------------------------------------------------
ALTER TABLE payment_orders
    ADD COLUMN IF NOT EXISTS commission_rate_bps INTEGER NOT NULL DEFAULT 800,
    ADD COLUMN IF NOT EXISTS commission_policy_id UUID REFERENCES commission_policies(id),
    ADD COLUMN IF NOT EXISTS provider_reference TEXT,
    ADD COLUMN IF NOT EXISTS escrow_hold_id UUID;

ALTER TABLE payment_orders
    DROP CONSTRAINT IF EXISTS chk_payment_order_commission_bps;
ALTER TABLE payment_orders
    ADD CONSTRAINT chk_payment_order_commission_bps
    CHECK (commission_rate_bps BETWEEN 0 AND 10000);

-- ---------------------------------------------------------------------------
-- 3. Escrow holds (one per successful payment order)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS escrow_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_order_id UUID NOT NULL UNIQUE REFERENCES payment_orders(id),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    payer_user_id UUID NOT NULL REFERENCES users(id),
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id),
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    released_minor BIGINT NOT NULL DEFAULT 0 CHECK (released_minor >= 0),
    refunded_minor BIGINT NOT NULL DEFAULT 0 CHECK (refunded_minor >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    commission_rate_bps INTEGER NOT NULL CHECK (commission_rate_bps BETWEEN 0 AND 10000),
    commission_policy_id UUID REFERENCES commission_policies(id),
    status TEXT NOT NULL DEFAULT 'held'
        CHECK (status IN ('held', 'partially_released', 'released', 'partially_refunded',
                          'refunded', 'closed')),
    held_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_escrow_hold_total
        CHECK (released_minor + refunded_minor <= amount_minor)
);

CREATE INDEX IF NOT EXISTS ix_escrow_holds_booking ON escrow_holds(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_escrow_holds_tutor ON escrow_holds(tutor_user_id, status);
CREATE INDEX IF NOT EXISTS ix_escrow_holds_status ON escrow_holds(status, created_at DESC);

ALTER TABLE payment_orders
    DROP CONSTRAINT IF EXISTS fk_payment_orders_escrow_hold;
ALTER TABLE payment_orders
    ADD CONSTRAINT fk_payment_orders_escrow_hold
    FOREIGN KEY (escrow_hold_id) REFERENCES escrow_holds(id);

-- ---------------------------------------------------------------------------
-- 4. Durable webhook event log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    signature_valid BOOLEAN NOT NULL DEFAULT false,
    payload_hash TEXT NOT NULL,
    payload_redacted JSONB NOT NULL DEFAULT '{}'::JSONB,
    status TEXT NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'processed', 'duplicate', 'rejected', 'failed')),
    error_message TEXT,
    payment_order_id UUID REFERENCES payment_orders(id),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS ix_webhook_events_order ON webhook_events(payment_order_id, received_at DESC);
CREATE INDEX IF NOT EXISTS ix_webhook_events_status ON webhook_events(status, received_at DESC);

-- ---------------------------------------------------------------------------
-- 5. Refund workflow columns
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS refund_number_seq START 1;

ALTER TABLE payment_refunds
    ADD COLUMN IF NOT EXISTS refund_number TEXT,
    ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id),
    ADD COLUMN IF NOT EXISTS initiated_by_role TEXT,
    ADD COLUMN IF NOT EXISTS decided_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS decision_note TEXT,
    ADD COLUMN IF NOT EXISTS provider_status TEXT,
    ADD COLUMN IF NOT EXISTS provider_reference TEXT,
    ADD COLUMN IF NOT EXISTS provider_confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT,
    ADD COLUMN IF NOT EXISTS eligibility_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS ledger_journal_id UUID REFERENCES ledger_journals(id),
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_refunds_number
    ON payment_refunds (refund_number)
    WHERE refund_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_refunds_idempotency
    ON payment_refunds (requested_by, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_payment_refunds_status
    ON payment_refunds(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. Ledger party dimension (tutor payable must be derivable per tutor)
-- ---------------------------------------------------------------------------
ALTER TABLE ledger_entries
    ADD COLUMN IF NOT EXISTS tutor_user_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS ix_ledger_entries_tutor_account
    ON ledger_entries (tutor_user_id, account_id, created_at DESC)
    WHERE tutor_user_id IS NOT NULL;

-- Payouts in transit clearing account.
INSERT INTO ledger_accounts (code, name, account_type, currency)
VALUES ('2200', 'Tutor Payouts In Transit', 'liability', 'BDT')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Session settlements (one per session, bounded by its escrow hold)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE REFERENCES booking_sessions(id),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    payment_order_id UUID NOT NULL REFERENCES payment_orders(id),
    escrow_hold_id UUID NOT NULL REFERENCES escrow_holds(id),
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id),
    gross_amount_minor BIGINT NOT NULL CHECK (gross_amount_minor > 0),
    platform_fee_minor BIGINT NOT NULL CHECK (platform_fee_minor >= 0),
    tutor_net_minor BIGINT NOT NULL CHECK (tutor_net_minor >= 0),
    commission_rate_bps INTEGER NOT NULL CHECK (commission_rate_bps BETWEEN 0 AND 10000),
    commission_policy_id UUID REFERENCES commission_policies(id),
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    status TEXT NOT NULL DEFAULT 'settled' CHECK (status IN ('settled', 'reversed')),
    journal_id UUID NOT NULL UNIQUE REFERENCES ledger_journals(id),
    reversal_journal_id UUID REFERENCES ledger_journals(id),
    settled_by UUID NOT NULL REFERENCES users(id),
    settled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reversed_at TIMESTAMPTZ,
    CONSTRAINT chk_settlement_split CHECK (platform_fee_minor + tutor_net_minor = gross_amount_minor)
);

CREATE INDEX IF NOT EXISTS ix_session_settlements_tutor
    ON session_settlements (tutor_user_id, settled_at DESC);
CREATE INDEX IF NOT EXISTS ix_session_settlements_hold
    ON session_settlements (escrow_hold_id);

-- ---------------------------------------------------------------------------
-- 8. Tutor financial account (serialization row for concurrent payouts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutor_financial_accounts (
    tutor_user_id UUID PRIMARY KEY REFERENCES users(id),
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    reserved_minor BIGINT NOT NULL DEFAULT 0 CHECK (reserved_minor >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 9. Audited tutor earning adjustments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutor_earning_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_user_id UUID NOT NULL REFERENCES users(id),
    payment_order_id UUID REFERENCES payment_orders(id),
    session_id UUID REFERENCES booking_sessions(id),
    amount_minor BIGINT NOT NULL CHECK (amount_minor <> 0),
    direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
    reason TEXT NOT NULL,
    journal_id UUID REFERENCES ledger_journals(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_tutor_adjustments_tutor
    ON tutor_earning_adjustments (tutor_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 10. Payouts (manual, audited disbursement)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_number TEXT NOT NULL UNIQUE,
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id),
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    status TEXT NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested', 'approved', 'processing', 'paid', 'rejected',
                          'cancelled', 'failed')),
    method TEXT NOT NULL CHECK (method IN ('bkash', 'nagad', 'rocket', 'bank', 'other')),
    account_reference_masked TEXT NOT NULL,
    account_reference_hash TEXT NOT NULL,
    requested_by UUID NOT NULL REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    decision_note TEXT,
    external_reference TEXT,
    paid_at TIMESTAMPTZ,
    paid_by UUID REFERENCES users(id),
    failure_reason TEXT,
    idempotency_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tutor_user_id, idempotency_key)
);

CREATE SEQUENCE IF NOT EXISTS payout_number_seq START 1;

CREATE INDEX IF NOT EXISTS ix_payouts_tutor ON payouts (tutor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_payouts_status ON payouts (status, created_at DESC);

-- ---------------------------------------------------------------------------
-- 11. Invoices
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    payment_order_id UUID NOT NULL UNIQUE REFERENCES payment_orders(id),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    payer_user_id UUID NOT NULL REFERENCES users(id),
    student_user_id UUID NOT NULL REFERENCES users(id),
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id),
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    subtotal_minor BIGINT NOT NULL CHECK (subtotal_minor > 0),
    total_minor BIGINT NOT NULL CHECK (total_minor > 0),
    commission_rate_bps INTEGER NOT NULL CHECK (commission_rate_bps BETWEEN 0 AND 10000),
    commission_minor BIGINT NOT NULL DEFAULT 0 CHECK (commission_minor >= 0),
    status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'void')),
    snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    voided_at TIMESTAMPTZ,
    void_reason TEXT
);

CREATE INDEX IF NOT EXISTS ix_invoices_payer ON invoices (payer_user_id, issued_at DESC);

-- ---------------------------------------------------------------------------
-- 12. Durable reconciliation runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reconciliation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('running', 'reconciled', 'discrepancy_detected', 'failed')),
    run_by UUID REFERENCES users(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    orders_checked INTEGER NOT NULL DEFAULT 0,
    transactions_checked INTEGER NOT NULL DEFAULT 0,
    refunds_checked INTEGER NOT NULL DEFAULT 0,
    payouts_checked INTEGER NOT NULL DEFAULT 0,
    discrepancy_count INTEGER NOT NULL DEFAULT 0,
    ledger_total_debits_minor BIGINT NOT NULL DEFAULT 0,
    ledger_total_credits_minor BIGINT NOT NULL DEFAULT 0,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS ix_reconciliation_runs_started
    ON reconciliation_runs (started_at DESC);
