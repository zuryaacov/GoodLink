-- Migration to add 'utm_term' column to 'links' table
-- This column stores the UTM term parameter for tracking

-- Check if column exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'links' 
        AND column_name = 'utm_term'
    ) THEN
        ALTER TABLE links ADD COLUMN utm_term TEXT;
        COMMENT ON COLUMN links.utm_term IS 'UTM term parameter for tracking (e.g., keyword, placement)';
    END IF;
END $$;
