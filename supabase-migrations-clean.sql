-- Clean Migration: Drop and recreate table (USE WITH CAUTION - DELETES ALL DATA)
-- Only use this if you don't have any data you want to keep!

-- Drop the table and recreate it from scratch
DROP TABLE IF EXISTS links CASCADE;

-- Create the links table
CREATE TABLE links (
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
  status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug, domain)
);

-- Create indexes for performance
CREATE INDEX idx_links_user_id ON links(user_id);
CREATE INDEX idx_links_slug_domain ON links(slug, domain);

-- Enable Row Level Security
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own links"
  ON links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own links"
  ON links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links"
  ON links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links"
  ON links FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_links_updated_at
  BEFORE UPDATE ON links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

