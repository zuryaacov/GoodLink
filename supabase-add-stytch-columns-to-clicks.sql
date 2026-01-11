-- Add Stytch tracking columns to clicks table
-- This migration adds columns for Stytch fraud detection and telemetry data

-- Add telemetry_id field (the ID collected from Stytch client-side)
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS telemetry_id TEXT;

-- Add Stytch identification fields
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS visitor_id TEXT;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS verdict TEXT;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS fraud_score INT;

-- Add network intelligence fields
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS is_vpn BOOLEAN;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS is_proxy BOOLEAN;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS isp TEXT;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS connection_type TEXT;

-- Add extended device/OS/browser information
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS os_version TEXT;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS browser_version TEXT;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS is_incognito BOOLEAN;

-- Add advanced telemetry fields
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS battery_level INT;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS screen_resolution TEXT;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS is_emulator BOOLEAN;

-- Add signals/flags field (stores JSON data from Stytch)
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS signals JSONB;

-- Add Turnstile verification field
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS turnstile_verified BOOLEAN DEFAULT false;

-- Note: The following columns may already exist in the clicks table (from supabase-create-clicks-table.sql):
-- ip_address, country, city, device_type, browser, os
-- These are left as-is and won't cause errors with ADD COLUMN IF NOT EXISTS

-- Create index on telemetry_id for lookups
CREATE INDEX IF NOT EXISTS idx_clicks_telemetry_id ON clicks(telemetry_id);

-- Create index on visitor_id for lookups
CREATE INDEX IF NOT EXISTS idx_clicks_visitor_id ON clicks(visitor_id);

-- Create index on fraud_score for filtering
CREATE INDEX IF NOT EXISTS idx_clicks_fraud_score ON clicks(fraud_score);

-- Create index on verdict for filtering
CREATE INDEX IF NOT EXISTS idx_clicks_verdict ON clicks(verdict);
