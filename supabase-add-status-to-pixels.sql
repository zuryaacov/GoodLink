-- Migration: Add status column to pixels table
-- Run this SQL in your Supabase SQL Editor if the table already exists

-- Step 1: Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pixels' AND column_name = 'status'
  ) THEN
    ALTER TABLE pixels ADD COLUMN status TEXT DEFAULT 'active';
    
    -- Update existing rows to have 'active' status
    UPDATE pixels SET status = 'active' WHERE status IS NULL;
    
    -- Add CHECK constraint
    ALTER TABLE pixels ADD CONSTRAINT pixels_status_check 
      CHECK (status IN ('active', 'PAUSED', 'deleted', 'PENDING'));
  END IF;
END $$;

-- Step 2: Set default value
ALTER TABLE pixels ALTER COLUMN status SET DEFAULT 'active';

-- Step 3: Update any NULL values to 'active'
UPDATE pixels SET status = 'active' WHERE status IS NULL;

-- Step 4: Add comment to the column
COMMENT ON COLUMN pixels.status IS 'Pixel status: active, PAUSED, deleted, PENDING';
