-- ============================================================
-- CAPI hard reset (pixels): fix invalid regex escape errors
-- ============================================================
-- Run this whole script in Supabase SQL Editor.
-- It removes all custom triggers on public.pixels and recreates
-- one safe sanitize-only trigger with NO regex usage.
-- ============================================================

-- 1) Drop all non-internal triggers on pixels
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'public.pixels'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.pixels;', r.tgname);
  END LOOP;
END $$;

-- 2) Safe sanitizer (no regex)
CREATE OR REPLACE FUNCTION public.sanitize_text_simple(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN btrim(replace(replace(input_text, '<', ''), '>', ''));
END;
$$;

-- 3) Safe pixels trigger function (sanitize-only)
CREATE OR REPLACE FUNCTION public.validate_pixels_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.name := sanitize_text_simple(NEW.name);
  NEW.custom_event_name := sanitize_text_simple(NEW.custom_event_name);
  NEW.event_type := sanitize_text_simple(NEW.event_type);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 4) Recreate one clean trigger
CREATE TRIGGER trg_pixels_xss_check
BEFORE INSERT OR UPDATE ON public.pixels
FOR EACH ROW
EXECUTE FUNCTION public.validate_pixels_input();

-- 5) Show current custom triggers on pixels (verification)
SELECT tgname
FROM pg_trigger
WHERE tgrelid = 'public.pixels'::regclass
  AND NOT tgisinternal
ORDER BY tgname;
