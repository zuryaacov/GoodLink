-- Migration: Create pixels table for GoodLink
-- Run this SQL in your Supabase SQL Editor

-- Create the pixels table
CREATE TABLE IF NOT EXISTS pixels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Friendly name (e.g., "FB - Main Account")
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'tiktok', 'google', 'snapchat')), -- Platform type
  pixel_id TEXT NOT NULL, -- The actual pixel ID
  event_type TEXT DEFAULT 'PageView', -- Standard event or 'custom'
  custom_event_name TEXT, -- Custom event name if event_type is 'custom'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pixel_id, platform) -- Prevent duplicate pixels per user
);

-- Create an index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_pixels_user_id ON pixels(user_id);

-- Create an index on platform for filtering
CREATE INDEX IF NOT EXISTS idx_pixels_platform ON pixels(platform);

-- Enable Row Level Security (RLS)
ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to read their own pixels
CREATE POLICY "Users can view their own pixels"
  ON pixels FOR SELECT
  USING (auth.uid() = user_id);

-- Create a policy that allows users to insert their own pixels
CREATE POLICY "Users can insert their own pixels"
  ON pixels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create a policy that allows users to update their own pixels
CREATE POLICY "Users can update their own pixels"
  ON pixels FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create a policy that allows users to delete their own pixels
CREATE POLICY "Users can delete their own pixels"
  ON pixels FOR DELETE
  USING (auth.uid() = user_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_pixels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_pixels_updated_at
  BEFORE UPDATE ON pixels
  FOR EACH ROW
  EXECUTE FUNCTION update_pixels_updated_at();
