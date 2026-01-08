-- Migration: Create links table for GoodLink
-- Run this SQL in your Supabase SQL Editor

-- Create the links table
CREATE TABLE IF NOT EXISTS links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'glynk.to',
  slug TEXT NOT NULL,
  short_url TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  parameter_pass_through BOOLEAN DEFAULT true,
  pixels JSONB DEFAULT '[]'::jsonb,
  server_side_tracking BOOLEAN DEFAULT false,
  custom_script TEXT,
  fraud_shield TEXT DEFAULT 'none',
  bot_action TEXT DEFAULT 'block',
  geo_rules JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug, domain)
);

-- Create an index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);

-- Create an index on slug and domain for link lookups
CREATE INDEX IF NOT EXISTS idx_links_slug_domain ON links(slug, domain);

-- Enable Row Level Security (RLS)
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to read their own links
CREATE POLICY "Users can view their own links"
  ON links FOR SELECT
  USING (auth.uid() = user_id);

-- Create a policy that allows users to insert their own links
CREATE POLICY "Users can insert their own links"
  ON links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create a policy that allows users to update their own links
CREATE POLICY "Users can update their own links"
  ON links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create a policy that allows users to delete their own links
CREATE POLICY "Users can delete their own links"
  ON links FOR DELETE
  USING (auth.uid() = user_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_links_updated_at
  BEFORE UPDATE ON links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

