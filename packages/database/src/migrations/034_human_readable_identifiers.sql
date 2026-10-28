-- ==============================================================================
-- OgroniEdu — Migration 034: Human-Readable Business Identifiers (Dual-ID Pattern)
-- Target: PostgreSQL 16+ / 18
--
-- Adds human-readable, sequence-backed public reference identifiers across
-- key domain entities while preserving internal UUID primary keys.
-- Format: <PREFIX>-<YYYY>-<PADDED_SEQUENCE>
-- Examples:
--   - Bookings:        BK-2026-01001
--   - Sessions:        SES-2026-01001
--   - Students:        STU-2026-01001
--   - Tutors:          TUT-2026-01001
--   - Support Tickets: TKT-2026-01001
--   - Payment Orders:  ORD-2026-01001
--   - Disputes:        DSP-2026-01001
-- ==============================================================================

-- 1. Sequences for Human-Readable Identifiers
CREATE SEQUENCE IF NOT EXISTS booking_reference_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS booking_session_code_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS student_code_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS tutor_code_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS payment_order_reference_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS booking_dispute_code_seq START WITH 1001;

-- 2. Bookings (BK-YYYY-XXXXX)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS booking_reference TEXT;

UPDATE bookings
SET booking_reference = ('BK-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('booking_reference_seq')::text, 5, '0'))
WHERE booking_reference IS NULL;

ALTER TABLE bookings
ALTER COLUMN booking_reference
SET DEFAULT ('BK-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('booking_reference_seq')::text, 5, '0'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_booking_reference ON bookings(booking_reference);

-- 3. Booking Sessions (SES-YYYY-XXXXX)
ALTER TABLE booking_sessions
ADD COLUMN IF NOT EXISTS session_code TEXT;

UPDATE booking_sessions
SET session_code = ('SES-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('booking_session_code_seq')::text, 5, '0'))
WHERE session_code IS NULL;

ALTER TABLE booking_sessions
ALTER COLUMN session_code
SET DEFAULT ('SES-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('booking_session_code_seq')::text, 5, '0'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_sessions_session_code ON booking_sessions(session_code);

-- 4. Student Profiles (STU-YYYY-XXXXX)
ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS student_code TEXT;

UPDATE student_profiles
SET student_code = ('STU-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('student_code_seq')::text, 5, '0'))
WHERE student_code IS NULL;

ALTER TABLE student_profiles
ALTER COLUMN student_code
SET DEFAULT ('STU-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('student_code_seq')::text, 5, '0'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_profiles_student_code ON student_profiles(student_code);

-- 5. Tutor Profiles (TUT-YYYY-XXXXX)
ALTER TABLE tutor_profiles
ADD COLUMN IF NOT EXISTS tutor_code TEXT;

UPDATE tutor_profiles
SET tutor_code = ('TUT-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('tutor_code_seq')::text, 5, '0'))
WHERE tutor_code IS NULL;

ALTER TABLE tutor_profiles
ALTER COLUMN tutor_code
SET DEFAULT ('TUT-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('tutor_code_seq')::text, 5, '0'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_tutor_profiles_tutor_code ON tutor_profiles(tutor_code);

-- 6. Support Tickets (TKT-YYYY-XXXXX)
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS ticket_number TEXT;

UPDATE support_tickets
SET ticket_number = ('TKT-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('support_ticket_seq')::text, 5, '0'))
WHERE ticket_number IS NULL;

ALTER TABLE support_tickets
ALTER COLUMN ticket_number
SET DEFAULT ('TKT-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('support_ticket_seq')::text, 5, '0'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_support_tickets_ticket_number ON support_tickets(ticket_number);

-- 7. Payment Orders (ORD-YYYY-XXXXX)
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS order_reference TEXT;

UPDATE payment_orders
SET order_reference = ('ORD-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('payment_order_reference_seq')::text, 5, '0'))
WHERE order_reference IS NULL;

ALTER TABLE payment_orders
ALTER COLUMN order_reference
SET DEFAULT ('ORD-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('payment_order_reference_seq')::text, 5, '0'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_orders_order_reference ON payment_orders(order_reference);

-- 8. Booking Disputes (DSP-YYYY-XXXXX)
ALTER TABLE booking_disputes
ADD COLUMN IF NOT EXISTS dispute_code TEXT;

UPDATE booking_disputes
SET dispute_code = ('DSP-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('booking_dispute_code_seq')::text, 5, '0'))
WHERE dispute_code IS NULL;

ALTER TABLE booking_disputes
ALTER COLUMN dispute_code
SET DEFAULT ('DSP-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('booking_dispute_code_seq')::text, 5, '0'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_disputes_dispute_code ON booking_disputes(dispute_code);

