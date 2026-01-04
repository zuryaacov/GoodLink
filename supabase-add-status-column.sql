-- Add status column to links table
-- Run this SQL in your Supabase SQL Editor if you already have a links table

ALTER TABLE links ADD COLUMN IF NOT EXISTS status BOOLEAN DEFAULT true;

-- Add comment to the column
COMMENT ON COLUMN links.status IS 'Link status: true = active/enabled, false = inactive/disabled';

