-- Simple Supabase Policy for Public Link Access (No Status Column)
-- Use this version if your links table doesn't have a status column
-- Run this SQL in your Supabase SQL Editor

-- Drop policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Public can read active links" ON links;

-- Create policy that allows public read access to all links
CREATE POLICY "Public can read active links"
  ON links FOR SELECT
  USING (true);

-- Note: This allows anyone to read all links in the table.
-- If you're using the service role key in the worker, this policy is optional
-- because the service role key bypasses RLS. However, it's good practice to have
-- explicit policies for clarity and future-proofing.

