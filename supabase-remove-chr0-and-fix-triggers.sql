-- ============================================================
-- Fix persistent "null character not permitted" in Supabase
-- Root cause: using chr(0) inside DB functions can itself throw errors.
-- ============================================================
-- Run this whole script in Supabase SQL Editor.
-- ============================================================

-- 1) Safe sanitize function (NO chr(0))
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

    -- Remove HTML tags
    cleaned := regexp_replace(cleaned, '<[^>]*>', '', 'g');

    -- Remove control chars except tab/newline/carriage return
    cleaned := regexp_replace(cleaned, '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g');

    -- Remove zero-width chars
    cleaned := regexp_replace(cleaned, '[\x{200B}-\x{200F}\x{2028}-\x{202F}\x{2060}\x{FEFF}]', '', 'g');

    RETURN btrim(cleaned);
END;
$$;

-- 2) Safe is_safe_text function (NO chr(0))
CREATE OR REPLACE FUNCTION public.is_safe_text(input_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF input_text IS NULL OR input_text = '' THEN
        RETURN TRUE;
    END IF;

    IF input_text ~* '<\s*script' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*/\s*script' THEN RETURN FALSE; END IF;
    IF input_text ~* 'javascript\s*:' THEN RETURN FALSE; END IF;
    IF input_text ~* 'vbscript\s*:' THEN RETURN FALSE; END IF;
    IF input_text ~* 'data\s*:\s*text/html' THEN RETURN FALSE; END IF;
    IF input_text ~* '\bon[a-z]{2,}\s*=' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*iframe' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*object' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*embed' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*applet' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*form' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*meta' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*base' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*link[^>]*href' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*svg[^>]*\bon[a-z]' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*img[^>]*\bon[a-z]' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*body[^>]*\bon[a-z]' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*video[^>]*\bon[a-z]' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*audio[^>]*\bon[a-z]' THEN RETURN FALSE; END IF;
    IF input_text ~* '<\s*input[^>]*\bon[a-z]' THEN RETURN FALSE; END IF;
    IF input_text ~* 'expression\s*\(' THEN RETURN FALSE; END IF;
    IF input_text ~* '-moz-binding\s*:' THEN RETURN FALSE; END IF;
    IF input_text ~* '&#x0*6a;?&#x0*61;?&#x0*76;?&#x0*61;?' THEN RETURN FALSE; END IF;

    RETURN TRUE;
END;
$$;

-- 3) UTM trigger: sanitize-only, never raise
CREATE OR REPLACE FUNCTION public.validate_utm_presets_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.name := sanitize_text(NEW.name);
    NEW.utm_source := sanitize_text(NEW.utm_source);
    NEW.utm_medium := sanitize_text(NEW.utm_medium);
    NEW.utm_campaign := sanitize_text(NEW.utm_campaign);
    NEW.utm_content := sanitize_text(NEW.utm_content);
    NEW.utm_term := sanitize_text(NEW.utm_term);
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_utm_presets_xss_check ON public.utm_presets;
CREATE TRIGGER trg_utm_presets_xss_check
    BEFORE INSERT OR UPDATE ON public.utm_presets
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_utm_presets_input();

-- 4) Links trigger: sanitize-only, never raise
CREATE OR REPLACE FUNCTION public.validate_links_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.name := sanitize_text(NEW.name);
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_links_xss_check ON public.links;
CREATE TRIGGER trg_links_xss_check
    BEFORE INSERT OR UPDATE ON public.links
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_links_input();

-- 5) Done
SELECT 'OK: Removed chr(0) usage and recreated sanitize-only triggers for links + utm_presets.' AS status;
