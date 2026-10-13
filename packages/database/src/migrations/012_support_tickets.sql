-- ==============================================================================
-- OgroniEdu — Support Tickets Table Migration (012)
-- Phase 22/H-3: persist public contact-form submissions for staff triage.
-- Guests may file tickets (reporter_user_id nullable); authenticated filers
-- are linked. Idempotent: safe to run on databases that already have it.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_e164 TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_support_tickets_status
  ON support_tickets(status);

CREATE INDEX IF NOT EXISTS ix_support_tickets_email
  ON support_tickets(email);

CREATE INDEX IF NOT EXISTS ix_support_tickets_created
  ON support_tickets(created_at DESC);
