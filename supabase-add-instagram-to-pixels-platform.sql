-- Migration: Add 'instagram' to pixels platform constraint
-- Run this in your Supabase SQL Editor

ALTER TABLE pixels DROP CONSTRAINT IF EXISTS pixels_platform_check;

ALTER TABLE pixels ADD CONSTRAINT pixels_platform_check
CHECK (platform IN ('meta', 'instagram', 'tiktok', 'google', 'snapchat', 'outbrain', 'taboola'));
