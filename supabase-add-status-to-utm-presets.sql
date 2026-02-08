-- Migration: Add status column to utm_presets table (active / pending, for testing and display)
-- Run this SQL in your Supabase SQL Editor if the table already exists.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'utm_presets' AND column_name = 'status'
  ) THEN
    ALTER TABLE utm_presets ADD COLUMN status TEXT DEFAULT 'active';
    UPDATE utm_presets SET status = 'active' WHERE status IS NULL;
    ALTER TABLE utm_presets ADD CONSTRAINT utm_presets_status_check
      CHECK (status IN ('active', 'pending'));
  END IF;
END $$;

ALTER TABLE utm_presets ALTER COLUMN status SET DEFAULT 'active';
UPDATE utm_presets SET status = 'active' WHERE status IS NULL;
COMMENT ON COLUMN utm_presets.status IS 'Preset status: active, pending (e.g. draft or pending review)';
