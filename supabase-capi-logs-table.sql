-- Migration: Create capi_logs table for CAPI relay audit (Meta, TikTok, Google, etc.)
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS capi_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Request context
  pixel_id TEXT,           -- platform pixel id (e.g. Meta pixel_id)
  platform TEXT NOT NULL,  -- meta, tiktok, google, snapchat, etc.
  event_id TEXT,           -- deduplication id
  event_name TEXT,         -- e.g. PageView, custom event name

  -- Relay outcome
  status_code INT,         -- HTTP status from platform API
  response_body TEXT,      -- raw response from platform
  request_body JSONB,      -- payload we sent (optional, for debug)

  -- Metadata
  relay_duration_ms INT,   -- time to get response from platform
  error_message TEXT       -- if relay failed
);

CREATE INDEX IF NOT EXISTS idx_capi_logs_created_at ON capi_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_capi_logs_platform ON capi_logs(platform);
CREATE INDEX IF NOT EXISTS idx_capi_logs_event_id ON capi_logs(event_id);

COMMENT ON TABLE capi_logs IS 'Audit log for server-side CAPI requests sent to ad platforms';
