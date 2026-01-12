-- Migration: Add deleted_at column to links and pixels tables
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Add deleted_at to links table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'links' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE links ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Step 2: Add deleted_at to pixels table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pixels' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE pixels ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Step 3: Add comments to the columns
COMMENT ON COLUMN links.deleted_at IS 'Timestamp when the link was soft deleted (status changed to deleted)';
COMMENT ON COLUMN pixels.deleted_at IS 'Timestamp when the pixel was soft deleted (status changed to deleted)';
