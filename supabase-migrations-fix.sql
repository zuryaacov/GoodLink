-- Fix Migration: Add missing columns or recreate table if needed
-- This script safely handles existing tables

-- First, check if table exists and add missing columns
DO $$ 
BEGIN
  -- Check if links table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'links') THEN
    -- Table exists, add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'domain') THEN
      ALTER TABLE links ADD COLUMN domain TEXT NOT NULL DEFAULT 'goodlink.ai';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'slug') THEN
      ALTER TABLE links ADD COLUMN slug TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'short_url') THEN
      ALTER TABLE links ADD COLUMN short_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'utm_source') THEN
      ALTER TABLE links ADD COLUMN utm_source TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'utm_medium') THEN
      ALTER TABLE links ADD COLUMN utm_medium TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'utm_campaign') THEN
      ALTER TABLE links ADD COLUMN utm_campaign TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'utm_content') THEN
      ALTER TABLE links ADD COLUMN utm_content TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'parameter_pass_through') THEN
      ALTER TABLE links ADD COLUMN parameter_pass_through BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'pixels') THEN
      ALTER TABLE links ADD COLUMN pixels JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'server_side_tracking') THEN
      ALTER TABLE links ADD COLUMN server_side_tracking BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'custom_script') THEN
      ALTER TABLE links ADD COLUMN custom_script TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'fraud_shield') THEN
      ALTER TABLE links ADD COLUMN fraud_shield TEXT DEFAULT 'none';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'bot_action') THEN
      ALTER TABLE links ADD COLUMN bot_action TEXT DEFAULT 'block';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'geo_rules') THEN
      ALTER TABLE links ADD COLUMN geo_rules JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'links' AND column_name = 'updated_at') THEN
      ALTER TABLE links ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
  ELSE
    -- Table doesn't exist, create it
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
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, slug, domain)
    );
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_slug_domain ON links(slug, domain);

-- Enable Row Level Security
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own links" ON links;
DROP POLICY IF EXISTS "Users can insert their own links" ON links;
DROP POLICY IF EXISTS "Users can update their own links" ON links;
DROP POLICY IF EXISTS "Users can delete their own links" ON links;

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

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_links_updated_at ON links;
CREATE TRIGGER update_links_updated_at
  BEFORE UPDATE ON links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


