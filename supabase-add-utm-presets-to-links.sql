-- Migration to add 'utm_presets' column to 'links' table
-- This column stores an array of UTM preset IDs that are linked to this link

-- Check if column exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'links' 
        AND column_name = 'utm_presets'
    ) THEN
        ALTER TABLE links ADD COLUMN utm_presets JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN links.utm_presets IS 'Array of UTM preset IDs linked to this link (e.g., ["uuid1", "uuid2"])';
    END IF;
END $$;

-- Create an index for faster queries on utm_presets
CREATE INDEX IF NOT EXISTS idx_links_utm_presets ON links USING GIN (utm_presets);
