-- ============================================================
-- XSS / Injection Protection – Supabase (PostgreSQL)
-- ============================================================
--
-- שכבת הגנה בצד השרת (Database-level) שמוודאת שאף שדה טקסט
-- לא יכיל קוד זדוני, גם אם הצד-לקוח (client) נעקף.
--
-- מה זה עושה:
-- 1. פונקציה is_safe_text() – בודקת תבניות XSS/injection
-- 2. פונקציה sanitize_text() – מנקה תגי HTML ותווים מסוכנים
-- 3. טריגרים על כל הטבלאות הרלוונטיות
--
-- הפעלה: העתק והדבק את הקוד בעורך ה-SQL של Supabase ולחץ Run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. פונקציית בדיקה: is_safe_text
--    מחזירה TRUE אם הטקסט בטוח, FALSE אם מכיל תבניות מסוכנות
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_safe_text(input_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- NULL is considered safe
    IF input_text IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Empty string is safe
    IF input_text = '' THEN
        RETURN TRUE;
    END IF;

    -- Script tags
    IF input_text ~* '<\s*script' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*/\s*script' THEN RETURN FALSE; END IF;

    -- Dangerous protocols
    IF input_text ~* 'javascript\s*:' THEN RETURN FALSE; END IF;
    IF input_text ~* 'vbscript\s*:' THEN RETURN FALSE; END IF;
    IF input_text ~* 'data\s*:\s*text/html' THEN RETURN FALSE; END IF;

    -- Event handler attributes (onclick=, onerror=, onload=, etc.)
    IF input_text ~* '\bon[a-z]{2,}\s*=' THEN RETURN FALSE; END IF;

    -- Dangerous HTML tags
    IF input_text ~* '<\s*iframe' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*object' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*embed' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*applet' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*form' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*meta' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*base' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*link[^>]*href' THEN RETURN FALSE; END IF;

    -- SVG/img/body with event handlers
    IF input_text ~* '<\s*svg[^>]*\bon[a-z]' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*img[^>]*\bon[a-z]' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*body[^>]*\bon[a-z]' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*video[^>]*\bon[a-z]' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*audio[^>]*\bon[a-z]' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*input[^>]*\bon[a-z]' THEN RETURN FALSE; END IF;

    -- CSS injection
    IF input_text ~* 'expression\s*\(' THEN RETURN FALSE; END IF;
    IF input_text ~* '-moz-binding\s*:' THEN RETURN FALSE; END IF;

    -- Encoded XSS attempts (hex-encoded "java")
    IF input_text ~* '&#x0*6a;?&#x0*61;?&#x0*76;?&#x0*61;?' THEN RETURN FALSE; END IF;

    -- Null bytes
    IF input_text LIKE '%' || chr(0) || '%' THEN RETURN FALSE; END IF;

    RETURN TRUE;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 2. פונקציית ניקוי: sanitize_text
--    מסירה תגי HTML ותווי בקרה מסוכנים
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sanitize_text(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    cleaned TEXT;
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;

    cleaned := input_text;

    -- Strip null bytes
    cleaned := replace(cleaned, chr(0), '');

    -- Strip HTML tags
    cleaned := regexp_replace(cleaned, '<[^>]*>', '', 'g');

    -- Strip zero-width characters
    cleaned := regexp_replace(cleaned, '[\x{200B}-\x{200F}\x{2028}-\x{202F}\x{2060}\x{FEFF}]', '', 'g');

    -- Trim whitespace
    cleaned := btrim(cleaned);

    RETURN cleaned;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 3. טריגרים – links table
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_links_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check link name
    IF NOT is_safe_text(NEW.name) THEN
        RAISE EXCEPTION 'Link name contains potentially dangerous content'
            USING ERRCODE = 'check_violation';
    END IF;

    -- Sanitize link name (strip stray HTML tags)
    NEW.name := sanitize_text(NEW.name);

    RETURN NEW;
END;
$$;

-- Drop if exists, then create
DROP TRIGGER IF EXISTS trg_links_xss_check ON public.links;
CREATE TRIGGER trg_links_xss_check
    BEFORE INSERT OR UPDATE ON public.links
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_links_input();


-- ────────────────────────────────────────────────────────────
-- 4. טריגרים – pixels table
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_pixels_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check pixel friendly name
    IF NOT is_safe_text(NEW.name) THEN
        RAISE EXCEPTION 'Pixel name contains potentially dangerous content'
            USING ERRCODE = 'check_violation';
    END IF;

    -- Check custom event name (if set)
    IF NOT is_safe_text(NEW.custom_event_name) THEN
        RAISE EXCEPTION 'Custom event name contains potentially dangerous content'
            USING ERRCODE = 'check_violation';
    END IF;

    -- Check event type (free text for Taboola/Outbrain)
    IF NOT is_safe_text(NEW.event_type) THEN
        RAISE EXCEPTION 'Event type contains potentially dangerous content'
            USING ERRCODE = 'check_violation';
    END IF;

    -- Sanitize
    NEW.name := sanitize_text(NEW.name);
    NEW.custom_event_name := sanitize_text(NEW.custom_event_name);
    NEW.event_type := sanitize_text(NEW.event_type);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pixels_xss_check ON public.pixels;
CREATE TRIGGER trg_pixels_xss_check
    BEFORE INSERT OR UPDATE ON public.pixels
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_pixels_input();


-- ────────────────────────────────────────────────────────────
-- 5. טריגרים – utm_presets table
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_utm_presets_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check preset name
    IF NOT is_safe_text(NEW.name) THEN
        RAISE EXCEPTION 'UTM preset name contains potentially dangerous content'
            USING ERRCODE = 'check_violation';
    END IF;

    -- Check all UTM parameter fields
    IF NOT is_safe_text(NEW.utm_source) THEN
        RAISE EXCEPTION 'utm_source contains potentially dangerous content'
            USING ERRCODE = 'check_violation';
    END IF;

    IF NOT is_safe_text(NEW.utm_medium) THEN
        RAISE EXCEPTION 'utm_medium contains potentially dangerous content'
            USING ERRCODE = 'check_violation';
    END IF;

    IF NOT is_safe_text(NEW.utm_campaign) THEN
        RAISE EXCEPTION 'utm_campaign contains potentially dangerous content'
            USING ERRCODE = 'check_violation';
    END IF;

    IF NOT is_safe_text(NEW.utm_content) THEN
        RAISE EXCEPTION 'utm_content contains potentially dangerous content'
            USING ERRCODE = 'check_violation';
    END IF;

    IF NOT is_safe_text(NEW.utm_term) THEN
        RAISE EXCEPTION 'utm_term contains potentially dangerous content'
            USING ERRCODE = 'check_violation';
    END IF;

    -- Sanitize all fields
    NEW.name := sanitize_text(NEW.name);
    NEW.utm_source := sanitize_text(NEW.utm_source);
    NEW.utm_medium := sanitize_text(NEW.utm_medium);
    NEW.utm_campaign := sanitize_text(NEW.utm_campaign);
    NEW.utm_content := sanitize_text(NEW.utm_content);
    NEW.utm_term := sanitize_text(NEW.utm_term);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_utm_presets_xss_check ON public.utm_presets;
CREATE TRIGGER trg_utm_presets_xss_check
    BEFORE INSERT OR UPDATE ON public.utm_presets
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_utm_presets_input();


-- ────────────────────────────────────────────────────────────
-- 6. טריגרים – profiles table (full_name)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_profiles_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check full_name
    IF NOT is_safe_text(NEW.full_name) THEN
        RAISE EXCEPTION 'Full name contains potentially dangerous content'
            USING ERRCODE = 'check_violation';
    END IF;

    -- Sanitize
    NEW.full_name := sanitize_text(NEW.full_name);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_xss_check ON public.profiles;
CREATE TRIGGER trg_profiles_xss_check
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_profiles_input();


-- ────────────────────────────────────────────────────────────
-- 7. (אופציונלי) סריקת נתונים קיימים
--    הרצה ידנית לבדיקה אם יש כבר נתונים בעייתיים בטבלאות
-- ────────────────────────────────────────────────────────────

-- בדוק אם יש שמות לינקים בעייתיים:
-- SELECT id, name FROM links WHERE NOT is_safe_text(name);

-- בדוק אם יש שמות פיקסלים בעייתיים:
-- SELECT id, name FROM pixels WHERE NOT is_safe_text(name);

-- בדוק אם יש UTM presets בעייתיים:
-- SELECT id, name, utm_source, utm_medium, utm_campaign, utm_content, utm_term
-- FROM utm_presets
-- WHERE NOT is_safe_text(name)
--    OR NOT is_safe_text(utm_source)
--    OR NOT is_safe_text(utm_medium)
--    OR NOT is_safe_text(utm_campaign)
--    OR NOT is_safe_text(utm_content)
--    OR NOT is_safe_text(utm_term);

-- בדוק אם יש full_name בעייתי:
-- SELECT id, full_name FROM profiles WHERE NOT is_safe_text(full_name);


-- ============================================================
-- סיום! ההגנות פעילות כעת ברמת ה-Database.
-- כל INSERT או UPDATE יעבור בדיקה אוטומטית.
-- ============================================================
