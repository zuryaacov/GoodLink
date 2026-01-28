-- SQL Migration: Update pixels platform constraint to include new platforms
-- Run this in your Supabase SQL Editor

-- 1. Drop the existing constraint
ALTER TABLE pixels DROP CONSTRAINT IF EXISTS pixels_platform_check;

-- 2. Add the updated constraint with all supported platforms
ALTER TABLE pixels ADD CONSTRAINT pixels_platform_check 
CHECK (platform IN ('meta', 'tiktok', 'google', 'snapchat', 'outbrain', 'taboola'));

-- 3. (Optional) If you also want to update the existing schema file for future reference
-- You can manually edit supabase-create-pixels-table.sql line 9 to:
-- platform TEXT NOT NULL CHECK (platform IN ('meta', 'tiktok', 'google', 'snapchat', 'outbrain', 'taboola')),
