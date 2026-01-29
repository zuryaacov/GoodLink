-- Migration: Create capi_logs table for CAPI audit trail
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS capi_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Who (link owner / affiliate)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  link_id UUID,

  -- What was sent
  platform TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_id TEXT,
  click_id TEXT,

  -- Result from platform API
  status_code INT,
  payload JSONB,
  response_body JSONB,

  -- Optional metadata
  pixel_id TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_capi_logs_user_id ON capi_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_capi_logs_created_at ON capi_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_capi_logs_platform ON capi_logs(platform);
CREATE INDEX IF NOT EXISTS idx_capi_logs_event_id ON capi_logs(event_id);

ALTER TABLE capi_logs ENABLE ROW LEVEL SECURITY;

-- Only service role or own user can read (optional: restrict in app)
CREATE POLICY "Service role and own user can read capi_logs"
  ON capi_logs FOR SELECT
  USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can insert capi_logs"
  ON capi_logs FOR INSERT
  WITH CHECK (true);
