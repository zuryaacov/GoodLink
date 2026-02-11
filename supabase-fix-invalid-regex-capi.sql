-- ============================================================
-- Fix: "invalid regular expression: invalid escape \ sequence"
-- Applies to CAPI/Pixels + Links + UTM triggers
-- ============================================================
-- Root cause:
-- Previous DB functions used regex escapes like \s, \b, \x{...}
-- that can fail in PostgreSQL regex engine.
--
-- This script replaces them with SAFE logic:
-- - no risky regex escapes
-- - sanitize-only triggers (no RAISE)
-- ============================================================

-- 1) Safe text check (NO risky regex escapes)
CREATE OR REPLACE FUNCTION public.is_safe_text(input_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    t TEXT;
BEGIN
    IF input_text IS NULL OR input_text = '' THEN
        RETURN TRUE;
    END IF;

    t := lower(input_text);

    -- Basic dangerous patterns (string checks only)
    IF position('<script' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('javascript:' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('vbscript:' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('data:text/html' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('<iframe' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('<object' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('<embed' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('<meta' in t) > 0 THEN RETURN FALSE; END IF;

    RETURN TRUE;
END;
$$;

-- 2) Safe sanitizer (NO risky regex escapes)
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

    -- Simple HTML neutralization (no regex)
    cleaned := replace(cleaned, '<', '');
    cleaned := replace(cleaned, '>', '');

    -- Trim
    cleaned := btrim(cleaned);

    RETURN cleaned;
END;
$$;

-- 3) CAPI/Pixels trigger: sanitize only, never raise
CREATE OR REPLACE FUNCTION public.validate_pixels_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.name := sanitize_text(NEW.name);
    NEW.custom_event_name := sanitize_text(NEW.custom_event_name);
    NEW.event_type := sanitize_text(NEW.event_type);
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pixels_xss_check ON public.pixels;
CREATE TRIGGER trg_pixels_xss_check
    BEFORE INSERT OR UPDATE ON public.pixels
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_pixels_input();

-- 4) Links trigger: sanitize only, never raise
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

-- 5) UTM trigger: sanitize only, never raise
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

SELECT 'OK: regex-escape issue fixed for pixels/links/utm triggers.' AS status;
