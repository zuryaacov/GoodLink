-- Create utm_presets table
-- This table stores UTM parameter presets for different advertising platforms

CREATE TABLE IF NOT EXISTS utm_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(100) NOT NULL, -- 'meta', 'google', 'tiktok', 'taboola', 'custom'
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  slug VARCHAR(255) DEFAULT NULL, -- The link slug this preset is associated with (will be set when linking to a link)
  link_id UUID REFERENCES links(id) ON DELETE CASCADE, -- Optional: link to a specific link (will be set when linking to a link)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_utm_presets_user_id ON utm_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_utm_presets_link_id ON utm_presets(link_id);
CREATE INDEX IF NOT EXISTS idx_utm_presets_platform ON utm_presets(platform);

-- Enable RLS
ALTER TABLE utm_presets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own presets
DROP POLICY IF EXISTS "Users can view their own utm presets" ON utm_presets;
CREATE POLICY "Users can view their own utm presets"
  ON utm_presets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own presets
DROP POLICY IF EXISTS "Users can insert their own utm presets" ON utm_presets;
CREATE POLICY "Users can insert their own utm presets"
  ON utm_presets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own presets
DROP POLICY IF EXISTS "Users can update their own utm presets" ON utm_presets;
CREATE POLICY "Users can update their own utm presets"
  ON utm_presets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own presets
DROP POLICY IF EXISTS "Users can delete their own utm presets" ON utm_presets;
CREATE POLICY "Users can delete their own utm presets"
  ON utm_presets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_utm_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_utm_presets_updated_at ON utm_presets;
CREATE TRIGGER update_utm_presets_updated_at
  BEFORE UPDATE ON utm_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_utm_presets_updated_at();
