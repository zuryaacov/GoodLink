-- ============================================================================
-- Migration: Add deleted_at column and 'deleted' status to custom_domains table
-- ============================================================================
-- Purpose: Support soft delete for custom domains
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- Step 1: Add deleted_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_domains' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE custom_domains ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Step 2: Drop the existing CHECK constraint on status
ALTER TABLE custom_domains DROP CONSTRAINT IF EXISTS custom_domains_status_check;

-- Step 3: Add the new CHECK constraint that includes 'deleted'
ALTER TABLE custom_domains 
ADD CONSTRAINT custom_domains_status_check 
CHECK (status IN ('pending', 'active', 'error', 'deleted'));

-- Step 4: Add comment to the deleted_at column
COMMENT ON COLUMN custom_domains.deleted_at IS 'Timestamp when the domain was soft deleted (status changed to deleted)';
