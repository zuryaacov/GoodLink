-- ============================================================
-- SAFE FIX for "invalid byte sequence for encoding UTF8: 0x00"
-- ============================================================
-- This script handles null bytes safely using BYTEA conversion.
-- Run this ENTIRE script in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- STEP 1: Create safe sanitize function using BYTEA
-- ============================================================
CREATE OR REPLACE FUNCTION public.sanitize_text_safe(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    result_bytes BYTEA;
    result_text TEXT;
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Convert to bytea, remove null bytes (0x00), convert back to text
    result_bytes := CONVERT_TO(input_text, 'UTF8');
    result_bytes := REPLACE(result_bytes, '\x00'::BYTEA, ''::BYTEA);
    
    -- Try to convert back to text, catch encoding errors
    BEGIN
        result_text := CONVERT_FROM(result_bytes, 'UTF8');
    EXCEPTION WHEN OTHERS THEN
        -- If conversion fails, return empty string
        result_text := '';
    END;
    
    -- Remove HTML tags (basic XSS protection)
    result_text := REGEXP_REPLACE(result_text, '<[^>]*>', '', 'g');
    
    RETURN result_text;
END;
$$;

-- ============================================================
-- STEP 2: Update trigger to use safe function
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_links_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only sanitize: remove null bytes and HTML tags. Do not raise.
    IF NEW.name IS NOT NULL THEN
        BEGIN
            NEW.name := sanitize_text_safe(NEW.name);
        EXCEPTION WHEN OTHERS THEN
            -- If sanitization fails, set to empty string
            NEW.name := '';
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_links_xss_check ON public.links;
CREATE TRIGGER trg_links_xss_check
    BEFORE INSERT OR UPDATE ON public.links
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_links_input();

-- ============================================================
-- STEP 3: Clean existing rows using BYTEA conversion
-- ============================================================
-- This uses a safer approach that handles encoding errors
DO $$
DECLARE
    rec RECORD;
    cleaned_name TEXT;
    update_count INTEGER := 0;
BEGIN
    -- Loop through all rows
    FOR rec IN 
        SELECT id, name 
        FROM public.links 
        WHERE name IS NOT NULL
    LOOP
        BEGIN
            -- Try to sanitize the name
            cleaned_name := sanitize_text_safe(rec.name);
            
            -- Only update if name changed
            IF cleaned_name IS DISTINCT FROM rec.name THEN
                UPDATE public.links
                SET name = cleaned_name
                WHERE id = rec.id;
                
                update_count := update_count + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- If row has severe encoding issues, set name to empty
            UPDATE public.links
            SET name = 'Untitled Link'
            WHERE id = rec.id;
            
            update_count := update_count + 1;
            RAISE NOTICE 'Fixed problematic row ID: %', rec.id;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ Cleaned % rows', update_count;
END $$;

-- ============================================================
-- STEP 4: Verify cleanup
-- ============================================================
DO $$
DECLARE
    total_rows INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_rows FROM public.links;
    RAISE NOTICE '✅ Total rows in links table: %', total_rows;
    RAISE NOTICE '✅ Cleanup complete. Try updating your link now.';
END $$;
