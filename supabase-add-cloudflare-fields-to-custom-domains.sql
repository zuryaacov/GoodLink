-- ============================================================================
-- Migration: Add Cloudflare fields to custom_domains table
-- ============================================================================
-- Purpose: Store Cloudflare hostname_id and verification records
-- Run this SQL in your Supabase SQL Editor AFTER creating the custom_domains table
-- ============================================================================

-- Add cloudflare_hostname_id column (to store the hostname ID from Cloudflare)
ALTER TABLE custom_domains 
ADD COLUMN IF NOT EXISTS cloudflare_hostname_id TEXT;

-- Update dns_records column comment (if needed)
COMMENT ON COLUMN custom_domains.dns_records IS 'DNS records configuration including Cloudflare verification records';

-- Add index on cloudflare_hostname_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_domains_cloudflare_hostname_id 
ON custom_domains(cloudflare_hostname_id) 
WHERE cloudflare_hostname_id IS NOT NULL;
