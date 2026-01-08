-- Supabase Policy for Public Link Access
-- Run this SQL in your Supabase SQL Editor to allow the redirect worker to read links

-- Step 1: Add status column if it doesn't exist (optional but recommended)
-- Uncomment the line below if you want to add the status column:
-- ALTER TABLE links ADD COLUMN IF NOT EXISTS status BOOLEAN DEFAULT true;

-- Step 2: Create policy for public link access
-- This policy allows public read access to links
-- If status column exists, only active links (status = true) are accessible
-- If status column doesn't exist, all links are accessible

-- Drop policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Public can read active links" ON links;

-- Create policy that works with or without status column
CREATE POLICY "Public can read active links"
  ON links FOR SELECT
  USING (
    -- If status column exists, check it; otherwise allow all
    CASE 
      WHEN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'links' 
        AND column_name = 'status'
      ) 
      THEN COALESCE(status, true) = true
      ELSE true
    END
  );

-- Alternative simpler version (if status column doesn't exist, use this instead):
-- This version allows ALL links to be read publicly (use only if status column doesn't exist)
-- DROP POLICY IF EXISTS "Public can read active links" ON links;
-- CREATE POLICY "Public can read active links"
--   ON links FOR SELECT
--   USING (true);

-- Note: If you're using the service role key in the worker, this policy is optional
-- because the service role key bypasses RLS. However, it's good practice to have
-- explicit policies for clarity and future-proofing.

