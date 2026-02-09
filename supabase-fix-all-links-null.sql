-- ============================================================
-- COMPLETE FIX for "null character not permitted" error
-- ============================================================
-- This script does THREE things:
-- 1. Creates/updates sanitize_text() function (if missing)
-- 2. Updates the trigger to ONLY sanitize (never raise)
-- 3. Cleans existing null characters from all rows
--
-- Run this ENTIRE script in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- STEP 1: Create sanitize_text() function (if not exists)
-- ============================================================
CREATE OR REPLACE FUNCTION public.sanitize_text(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Remove null bytes (ASCII 0)
    input_text := REPLACE(input_text, CHR(0), '');
    input_text := REPLACE(input_text, E'\x00', '');
    
    -- Remove control characters (0x01-0x1F except newline/tab)
    input_text := REGEXP_REPLACE(input_text, '[\x01-\x08\x0B\x0C\x0E-\x1F]', '', 'g');
    
    -- Remove HTML tags (basic XSS protection)
    input_text := REGEXP_REPLACE(input_text, '<[^>]*>', '', 'g');
    
    RETURN input_text;
END;
$$;

-- ============================================================
-- STEP 2: Update trigger to ONLY sanitize (never raise)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_links_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only sanitize: remove null bytes and HTML tags. Do not raise.
    IF NEW.name IS NOT NULL THEN
        NEW.name := sanitize_text(NEW.name);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop and recreate trigger to ensure it uses the new function
DROP TRIGGER IF EXISTS trg_links_xss_check ON public.links;
CREATE TRIGGER trg_links_xss_check
    BEFORE INSERT OR UPDATE ON public.links
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_links_input();

-- ============================================================
-- STEP 3: Clean existing null characters from ALL rows
-- ============================================================
-- Find rows with null character (for debugging)
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count
    FROM public.links
    WHERE name IS NOT NULL AND (name ~ '\x00' OR position(CHR(0) in name) > 0);
    
    RAISE NOTICE 'Found % rows with null character in name', row_count;
END $$;

-- Clean all rows that have null character
UPDATE public.links
SET name = REPLACE(REPLACE(name, E'\x00', ''), CHR(0), '')
WHERE name IS NOT NULL AND (name ~ '\x00' OR position(CHR(0) in name) > 0);

-- Verify cleanup
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM public.links
    WHERE name IS NOT NULL AND (name ~ '\x00' OR position(CHR(0) in name) > 0);
    
    IF remaining_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All null characters removed from links.name';
    ELSE
        RAISE WARNING '⚠️ WARNING: Still %s rows with null character', remaining_count;
    END IF;
END $$;

-- ============================================================
-- DONE! Now try to update your link from the UI.
-- ============================================================
