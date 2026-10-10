-- ==============================================================================
-- OgroniEdu — Payments and Double-Entry Ledger Migration (004)
-- Purpose: Payment Refunds Table & Ledger Balance Verification Functions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS payment_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_order_id UUID NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'processing', 'succeeded', 'failed', 'rejected')),
    provider_refund_id TEXT,
    requested_by UUID NOT NULL REFERENCES users(id),
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_payment_refunds_order ON payment_refunds(payment_order_id, created_at DESC);

-- Verification function to mathematically confirm that debits equal credits for a journal
CREATE OR REPLACE FUNCTION verify_ledger_journal_balance(p_journal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_debits BIGINT;
    v_credits BIGINT;
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END), 0)
    INTO v_debits, v_credits
    FROM ledger_entries
    WHERE journal_id = p_journal_id;
    
    RETURN (v_debits = v_credits AND v_debits > 0);
END;
$$ LANGUAGE plpgsql;
