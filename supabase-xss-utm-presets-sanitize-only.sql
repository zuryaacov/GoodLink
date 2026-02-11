-- ============================================================
-- UTM presets trigger: SANITIZE only, do NOT block
-- ============================================================
-- Use this if updates/inserts to utm_presets fail with:
--   "null character not permitted" (code 54000)
-- This trigger version only sanitizes incoming text fields and
-- never raises exceptions.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_utm_presets_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Sanitize only. Do not raise.
    NEW.name := sanitize_text(NEW.name);
    NEW.utm_source := sanitize_text(NEW.utm_source);
    NEW.utm_medium := sanitize_text(NEW.utm_medium);
    NEW.utm_campaign := sanitize_text(NEW.utm_campaign);
    NEW.utm_content := sanitize_text(NEW.utm_content);
    NEW.utm_term := sanitize_text(NEW.utm_term);
    RETURN NEW;
END;
$$;

-- Trigger already exists in most projects. Function replacement is enough.
-- If needed:
-- DROP TRIGGER IF EXISTS trg_utm_presets_xss_check ON public.utm_presets;
-- CREATE TRIGGER trg_utm_presets_xss_check
--     BEFORE INSERT OR UPDATE ON public.utm_presets
--     FOR EACH ROW
--     EXECUTE FUNCTION public.validate_utm_presets_input();
