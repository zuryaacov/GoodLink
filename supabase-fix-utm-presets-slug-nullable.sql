-- Fix utm_presets table: Make slug nullable
-- This script allows slug to be NULL (will be set later when linking to a link)

-- First, drop any existing NOT NULL constraint on slug if it exists
ALTER TABLE utm_presets 
  ALTER COLUMN slug DROP NOT NULL;

-- Set default to NULL explicitly (though this is default behavior)
ALTER TABLE utm_presets 
  ALTER COLUMN slug SET DEFAULT NULL;

-- Verify the change
-- You can check with: SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'utm_presets' AND column_name = 'slug';
