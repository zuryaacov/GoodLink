-- ============================================================
-- FIX: sanitize_text_safe is too aggressive
-- ============================================================
-- The current function might be removing too much content.
-- This version only removes null bytes and keeps the rest.
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
    
    -- If input is empty or whitespace only, return it as-is
    IF TRIM(input_text) = '' THEN
        RETURN input_text;
    END IF;
    
    -- Convert to bytea, remove ONLY null bytes (0x00), convert back to text
    BEGIN
        result_bytes := CONVERT_TO(input_text, 'UTF8');
        result_bytes := REPLACE(result_bytes, '\x00'::BYTEA, ''::BYTEA);
        result_text := CONVERT_FROM(result_bytes, 'UTF8');
    EXCEPTION WHEN OTHERS THEN
        -- If conversion fails, return original text with regex cleanup
        result_text := REGEXP_REPLACE(input_text, E'[\\x00]', '', 'g');
    END;
    
    -- If result is empty after null removal, return original (better than losing data)
    IF result_text IS NULL OR TRIM(result_text) = '' THEN
        result_text := REGEXP_REPLACE(input_text, E'[\\x00]', '', 'g');
    END IF;
    
    RETURN result_text;
END;
$$;

-- Test the function
SELECT sanitize_text_safe('Test Link Name') AS test_result;
-- Expected: "Test Link Name"

SELECT sanitize_text_safe('Link' || CHR(0) || 'Name') AS test_with_null;
-- Expected: "LinkName"

-- ============================================================
-- Update the trigger to be less aggressive
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_links_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only remove null bytes, keep everything else
    IF NEW.name IS NOT NULL AND NEW.name != '' THEN
        BEGIN
            NEW.name := sanitize_text_safe(NEW.name);
            
            -- If sanitization resulted in empty string, keep original
            IF NEW.name IS NULL OR TRIM(NEW.name) = '' THEN
                NEW.name := REGEXP_REPLACE(OLD.name, E'[\\x00]', '', 'g');
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- If sanitization fails completely, try simple regex
            NEW.name := REGEXP_REPLACE(NEW.name, E'[\\x00]', '', 'g');
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Done
SELECT '✅ Sanitize function updated. It now only removes null bytes and keeps your content.' AS status;
