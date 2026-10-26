-- ==============================================================================
-- OgroniEdu — Migration 033: Scalable Dual-Mode LiveKit Video Classroom
-- Target: PostgreSQL 16+ / 18
-- ==============================================================================

-- 1. Classroom Sessions table
CREATE TABLE IF NOT EXISTS classroom_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name VARCHAR(128) NOT NULL UNIQUE,
  mode VARCHAR(32) NOT NULL DEFAULT 'SMALL_GROUP',
  status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
  title VARCHAR(255) NOT NULL,
  booking_session_id UUID REFERENCES booking_sessions(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  batch_id UUID NULL,
  host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_participants INTEGER NOT NULL DEFAULT 6,
  is_recording_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  recording_status VARCHAR(32) NOT NULL DEFAULT 'none',
  recording_metadata JSONB NULL,
  livekit_room_sid VARCHAR(128) NULL,
  started_at TIMESTAMPTZ NULL,
  ended_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_classroom_mode CHECK (mode IN ('SMALL_GROUP', 'LARGE_BATCH')),
  CONSTRAINT chk_classroom_status CHECK (status IN ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_classroom_sessions_room_name ON classroom_sessions (room_name);
CREATE INDEX IF NOT EXISTS ix_classroom_sessions_booking_session ON classroom_sessions (booking_session_id);
CREATE INDEX IF NOT EXISTS ix_classroom_sessions_host_status ON classroom_sessions (host_user_id, status);

-- 2. Classroom Attendance Records table
CREATE TABLE IF NOT EXISTS classroom_attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_session_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_identity VARCHAR(128) NOT NULL,
  participant_name VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'STUDENT',
  first_joined_at TIMESTAMPTZ NULL,
  last_left_at TIMESTAMPTZ NULL,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  connection_status VARCHAR(32) NOT NULL DEFAULT 'DISCONNECTED',
  reconnection_count INTEGER NOT NULL DEFAULT 0,
  is_hand_raised BOOLEAN NOT NULL DEFAULT FALSE,
  hand_raised_at TIMESTAMPTZ NULL,
  is_stage_promoted BOOLEAN NOT NULL DEFAULT FALSE,
  stage_promoted_at TIMESTAMPTZ NULL,
  device_info JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_classroom_attendee_role CHECK (role IN ('HOST', 'CO_HOST', 'STUDENT', 'OBSERVER')),
  CONSTRAINT chk_classroom_attendee_conn CHECK (connection_status IN ('CONNECTED', 'DISCONNECTED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_classroom_attendee ON classroom_attendance_records (classroom_session_id, user_id);
CREATE INDEX IF NOT EXISTS ix_classroom_attendee_session ON classroom_attendance_records (classroom_session_id);
CREATE INDEX IF NOT EXISTS ix_classroom_attendee_identity ON classroom_attendance_records (classroom_session_id, participant_identity);

-- 3. Classroom Connection & Lifecycle Events table
CREATE TABLE IF NOT EXISTS classroom_connection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_session_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  participant_identity VARCHAR(128) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  livekit_event_id VARCHAR(128) NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_classroom_livekit_event_id ON classroom_connection_events (livekit_event_id) WHERE livekit_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_classroom_events_session_time ON classroom_connection_events (classroom_session_id, event_timestamp);
