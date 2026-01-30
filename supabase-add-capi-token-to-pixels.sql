-- Migration: Add capi_token to pixels table (for CAPI / Conversions API)
-- Run this SQL in your Supabase SQL Editor if pixels was created without capi_token

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pixels' AND column_name = 'capi_token'
  ) THEN
    ALTER TABLE pixels ADD COLUMN capi_token TEXT;
    COMMENT ON COLUMN pixels.capi_token IS 'Access token for server-side Conversions API (CAPI)';
  END IF;
END $$;
