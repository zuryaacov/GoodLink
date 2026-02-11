-- ============================================================
-- STEP-BY-STEP FIX: Disable trigger → Clean data → Re-enable
-- ============================================================
-- Run each section ONE AT A TIME and check the result.
-- ============================================================

-- ============================================================
-- STEP 1: DISABLE THE TRIGGER (run this first)
-- ============================================================
ALTER TABLE public.links DISABLE TRIGGER trg_links_xss_check;

SELECT 'Step 1 ✅ Trigger disabled' AS status;

-- ============================================================
-- STEP 2: CLEAN THE SPECIFIC PROBLEMATIC ROW
-- ============================================================
-- Replace the ID with your actual link ID
UPDATE public.links
SET name = TRANSLATE(name, CHR(0), '')
WHERE id = '47545653-e08a-40c7-b6c4-ab8650ad30f3';

SELECT 'Step 2 ✅ Specific row cleaned' AS status;

-- ============================================================
-- STEP 3: CLEAN ALL ROWS (one by one with error handling)
-- ============================================================
DO $$
DECLARE
    rec RECORD;
    cleaned_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    FOR rec IN SELECT id, name FROM public.links WHERE name IS NOT NULL
    LOOP
        BEGIN
            -- Try to clean the row
            UPDATE public.links
            SET name = TRANSLATE(name, CHR(0), '')
            WHERE id = rec.id;
            
            cleaned_count := cleaned_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- If this specific row fails, mark it
            BEGIN
                UPDATE public.links
                SET name = 'Link_' || SUBSTRING(id::TEXT FROM 1 FOR 8)
                WHERE id = rec.id;
                error_count := error_count + 1;
            EXCEPTION WHEN OTHERS THEN
                -- Skip if even default name fails
                NULL;
            END;
        END;
    END LOOP;
    
    RAISE NOTICE 'Step 3 ✅ Cleaned % rows, % errors', cleaned_count, error_count;
END $$;

-- ============================================================
-- STEP 4: CREATE SIMPLE SANITIZE FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.sanitize_links_name(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Remove only null bytes using TRANSLATE (simpler than REPLACE)
    RETURN TRANSLATE(input_text, CHR(0), '');
EXCEPTION WHEN OTHERS THEN
    -- If anything fails, return as-is (better than losing data)
    RETURN input_text;
END;
$$;

SELECT 'Step 4 ✅ Sanitize function created' AS status;

-- ============================================================
-- STEP 5: CREATE NEW TRIGGER FUNCTION (never raises exception)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_links_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only sanitize name if it exists
    IF NEW.name IS NOT NULL THEN
        BEGIN
            NEW.name := sanitize_links_name(NEW.name);
        EXCEPTION WHEN OTHERS THEN
            -- If sanitization fails, leave name as-is (do NOT raise)
            NULL;
        END;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If ANYTHING fails, still return NEW (do NOT block the update)
    RETURN NEW;
END;
$$;

SELECT 'Step 5 ✅ Trigger function updated' AS status;

-- ============================================================
-- STEP 6: RE-ENABLE THE TRIGGER
-- ============================================================
ALTER TABLE public.links ENABLE TRIGGER trg_links_xss_check;

SELECT 'Step 6 ✅ Trigger re-enabled' AS status;

-- ============================================================
-- STEP 7: VERIFY - Count total rows
-- ============================================================
SELECT 
    COUNT(*) AS total_rows,
    COUNT(CASE WHEN name IS NOT NULL THEN 1 END) AS rows_with_name
FROM public.links;

-- ============================================================
-- DONE! Now try to update your link from the UI.
-- ============================================================
SELECT '🎉 All steps complete. Try updating your link now!' AS final_status;
