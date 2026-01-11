-- Update status column from BOOLEAN to TEXT with enum values
-- This migration changes the status field to support: active, PAUSED, deleted, PENDING, etc.
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Drop policies that depend on status column
DROP POLICY IF EXISTS "Public can read active links" ON links;

-- Step 2: Check if status column exists as BOOLEAN and migrate
DO $$
BEGIN
  -- Check if status column exists and is BOOLEAN type
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'links' 
    AND column_name = 'status'
    AND data_type = 'boolean'
  ) THEN
    -- Add a new column with the new type
    ALTER TABLE links ADD COLUMN IF NOT EXISTS status_new TEXT DEFAULT 'active';

    -- Migrate existing data: true -> 'active', false -> 'PAUSED', null -> 'active'
    UPDATE links SET status_new = CASE 
      WHEN status = true THEN 'active'
      WHEN status = false THEN 'PAUSED'
      ELSE 'active'
    END;

    -- Drop the old status column (now safe because policy was dropped)
    ALTER TABLE links DROP COLUMN status;

    -- Rename the new column to status
    ALTER TABLE links RENAME COLUMN status_new TO status;
  ELSIF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'links' 
    AND column_name = 'status'
    AND data_type = 'text'
  ) THEN
    -- Status column already exists as TEXT, just ensure default and constraint
    ALTER TABLE links ALTER COLUMN status SET DEFAULT 'active';
    
    -- Update any null values to 'active'
    UPDATE links SET status = 'active' WHERE status IS NULL;
  ELSE
    -- Status column doesn't exist, create it
    ALTER TABLE links ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- Step 2: Drop existing constraint if it exists (to avoid errors on re-run)
ALTER TABLE links DROP CONSTRAINT IF EXISTS links_status_check;

-- Step 3: Add a check constraint to ensure only valid values
ALTER TABLE links ADD CONSTRAINT links_status_check 
  CHECK (status IN ('active', 'PAUSED', 'deleted', 'PENDING'));

-- Step 4: Set default value
ALTER TABLE links ALTER COLUMN status SET DEFAULT 'active';

-- Step 5: Update any null values to 'active'
UPDATE links SET status = 'active' WHERE status IS NULL;

-- Step 6: Add a comment to document the status values
COMMENT ON COLUMN links.status IS 'Link status: active (active link), PAUSED (temporarily paused), deleted (soft deleted), PENDING (pending activation)';

-- Step 7: Recreate the public policy with the new status column (if needed)
-- This policy allows public read access to active links only
CREATE POLICY "Public can read active links"
  ON links FOR SELECT
  USING (
    -- Only allow links with status = 'active'
    COALESCE(status, 'active') = 'active'
  );
