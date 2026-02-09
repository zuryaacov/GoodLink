-- ============================================================
-- Links trigger: SANITIZE only, do NOT block (fix 500 on update)
-- ============================================================
-- The previous trigger raised an exception when is_safe_text() failed,
-- causing PATCH to return 500 (PostgreSQL error 54000).
-- This version only sanitizes NEW.name (removes null bytes and HTML tags)
-- and never raises, so updates always succeed. Client-side validation
-- still blocks obvious XSS before submit.
-- Run this in Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_links_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only sanitize: remove null bytes and HTML tags. Do not raise.
    NEW.name := sanitize_text(NEW.name);
    RETURN NEW;
END;
$$;

-- Trigger already exists; function is replaced above.
-- No need to drop/recreate the trigger.
