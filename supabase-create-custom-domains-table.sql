-- ============================================================================
-- Migration: Create custom_domains table for GoodLink
-- ============================================================================
-- Purpose: Store custom domains that users configure for their branded links
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- Create the custom_domains table
CREATE TABLE IF NOT EXISTS custom_domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'error')),
  verification_token TEXT,
  dns_records JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  UNIQUE(user_id, domain)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_custom_domains_user_id ON custom_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_status ON custom_domains(status);

-- Enable Row Level Security (RLS)
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts when re-running)
DROP POLICY IF EXISTS "Users can view their own custom domains" ON custom_domains;
DROP POLICY IF EXISTS "Users can insert their own custom domains" ON custom_domains;
DROP POLICY IF EXISTS "Users can update their own custom domains" ON custom_domains;
DROP POLICY IF EXISTS "Users can delete their own custom domains" ON custom_domains;

-- Create RLS policies for user access control
CREATE POLICY "Users can view their own custom domains"
  ON custom_domains FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom domains"
  ON custom_domains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom domains"
  ON custom_domains FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom domains"
  ON custom_domains FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_custom_domains_updated_at ON custom_domains;

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_custom_domains_updated_at
  BEFORE UPDATE ON custom_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_domains_updated_at();

-- ============================================================================
-- Table Schema Summary:
-- ============================================================================
-- id: UUID (Primary Key) - Unique identifier for each domain record
-- user_id: UUID (Foreign Key -> auth.users) - Owner of the domain
-- domain: TEXT - The domain name (e.g., "links.mybrand.com")
-- status: TEXT - Current status: 'pending', 'active', or 'error'
-- verification_token: TEXT (Optional) - Token for domain verification
-- dns_records: JSONB - DNS records configuration (e.g., CNAME, A records)
-- created_at: TIMESTAMPTZ - When the domain was added
-- updated_at: TIMESTAMPTZ - Last update timestamp (auto-updated)
-- verified_at: TIMESTAMPTZ (Optional) - When the domain was verified
-- ============================================================================
