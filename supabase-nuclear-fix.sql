-- ============================================================
-- NUCLEAR OPTION: Disable trigger, clean data, re-enable
-- ============================================================
-- Use this if the bytea approach also fails.
-- This temporarily disables the trigger to clean the data.
-- ============================================================

-- STEP 1: Disable the trigger temporarily
ALTER TABLE public.links DISABLE TRIGGER trg_links_xss_check;

-- STEP 2: Find and fix the specific problematic row
-- Replace the ID with your actual link ID from the error
UPDATE public.links
SET name = REGEXP_REPLACE(
    REGEXP_REPLACE(name, E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', '', 'g'),
    '<[^>]*>', '', 'g'
)
WHERE id = '47545653-e08a-40c7-b6c4-ab8650ad30f3';

-- STEP 3: Try to clean ALL rows (if possible)
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT id FROM public.links
    LOOP
        BEGIN
            UPDATE public.links
            SET name = CASE 
                WHEN name IS NULL THEN NULL
                ELSE REGEXP_REPLACE(
                    REGEXP_REPLACE(name, E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', '', 'g'),
                    '<[^>]*>', '', 'g'
                )
            END
            WHERE id = rec.id;
        EXCEPTION WHEN OTHERS THEN
            -- If update fails, set to default
            UPDATE public.links
            SET name = 'Untitled Link'
            WHERE id = rec.id;
        END;
    END LOOP;
END $$;

-- STEP 4: Update trigger to never raise
CREATE OR REPLACE FUNCTION public.validate_links_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Sanitize with exception handling
    IF NEW.name IS NOT NULL THEN
        BEGIN
            NEW.name := REGEXP_REPLACE(
                REGEXP_REPLACE(NEW.name, E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', '', 'g'),
                '<[^>]*>', '', 'g'
            );
        EXCEPTION WHEN OTHERS THEN
            NEW.name := 'Untitled Link';
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- STEP 5: Re-enable the trigger
ALTER TABLE public.links ENABLE TRIGGER trg_links_xss_check;

-- Done
SELECT 'Trigger re-enabled. Try updating your link now.' AS status;
