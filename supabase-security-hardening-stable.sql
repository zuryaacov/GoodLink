-- ============================================================
-- Security Hardening (stable + strict + no risky regex escapes)
-- ============================================================
-- Goal:
-- - Keep updates working (no invalid regex escape errors)
-- - Enforce DB-side protection (block dangerous payloads)
-- - Keep sanitization on key text fields
--
-- Run this AFTER reviewing supabase-security-audit.sql output.
-- ============================================================

-- 1) Safe sanitizer (no risky escapes)
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

    -- Remove control chars (including DEL)
    cleaned := regexp_replace(cleaned, '[[:cntrl:]]', '', 'g');

    -- Neutralize HTML angle brackets
    cleaned := replace(cleaned, '<', '');
    cleaned := replace(cleaned, '>', '');

    RETURN btrim(cleaned);
END;
$$;

-- 2) Safe detector (no \s, \b, \x{...})
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

    -- Dangerous protocols / tags / payload starters
    IF position('<script' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('</script' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('javascript:' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('vbscript:' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('data:text/html' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('<iframe' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('<object' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('<embed' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('<applet' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('<meta' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('<base' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('<link' in t) > 0 THEN RETURN FALSE; END IF;

    -- Event-handler style attributes (onclick=, onerror=, onload=, ...)
    IF t ~* 'on[a-z]+[[:space:]]*=' THEN RETURN FALSE; END IF;

    -- CSS script-like vectors
    IF position('expression(' in t) > 0 THEN RETURN FALSE; END IF;
    IF position('-moz-binding:' in t) > 0 THEN RETURN FALSE; END IF;

    RETURN TRUE;
END;
$$;

-- 3) Helper for strict field validation + sanitize
CREATE OR REPLACE FUNCTION public.assert_safe_text(input_text TEXT, field_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;

    IF NOT public.is_safe_text(input_text) THEN
        RAISE EXCEPTION '% contains potentially dangerous content', field_name
            USING ERRCODE = '22000';
    END IF;

    RETURN public.sanitize_text(input_text);
END;
$$;

-- 4) Links trigger (strict)
CREATE OR REPLACE FUNCTION public.validate_links_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.name := public.assert_safe_text(NEW.name, 'Link name');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_links_xss_check ON public.links;
CREATE TRIGGER trg_links_xss_check
    BEFORE INSERT OR UPDATE ON public.links
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_links_input();

-- 5) Pixels/CAPI trigger (strict)
CREATE OR REPLACE FUNCTION public.validate_pixels_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.name := public.assert_safe_text(NEW.name, 'Pixel name');
    NEW.custom_event_name := public.assert_safe_text(NEW.custom_event_name, 'Custom event name');
    NEW.event_type := public.assert_safe_text(NEW.event_type, 'Event type');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pixels_xss_check ON public.pixels;
CREATE TRIGGER trg_pixels_xss_check
    BEFORE INSERT OR UPDATE ON public.pixels
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_pixels_input();

-- 6) UTM trigger (strict)
CREATE OR REPLACE FUNCTION public.validate_utm_presets_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.name := public.assert_safe_text(NEW.name, 'UTM preset name');
    NEW.utm_source := public.assert_safe_text(NEW.utm_source, 'utm_source');
    NEW.utm_medium := public.assert_safe_text(NEW.utm_medium, 'utm_medium');
    NEW.utm_campaign := public.assert_safe_text(NEW.utm_campaign, 'utm_campaign');
    NEW.utm_content := public.assert_safe_text(NEW.utm_content, 'utm_content');
    NEW.utm_term := public.assert_safe_text(NEW.utm_term, 'utm_term');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_utm_presets_xss_check ON public.utm_presets;
CREATE TRIGGER trg_utm_presets_xss_check
    BEFORE INSERT OR UPDATE ON public.utm_presets
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_utm_presets_input();

-- 7) Profiles trigger (strict)
CREATE OR REPLACE FUNCTION public.validate_profiles_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.full_name := public.assert_safe_text(NEW.full_name, 'Full name');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_xss_check ON public.profiles;
CREATE TRIGGER trg_profiles_xss_check
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_profiles_input();

-- 8) Final status
SELECT 'OK: strict DB firewall applied (stable regex-safe version).' AS status;
