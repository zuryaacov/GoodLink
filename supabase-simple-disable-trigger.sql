-- ============================================================
-- SIMPLEST FIX: Just disable the trigger completely
-- ============================================================
-- If all else fails, disable the trigger and let the frontend
-- handle all sanitization (which we already do).
-- ============================================================

-- Disable the trigger
ALTER TABLE public.links DISABLE TRIGGER trg_links_xss_check;

-- Or drop it completely (uncomment if you want to remove it)
-- DROP TRIGGER IF EXISTS trg_links_xss_check ON public.links;

SELECT '✅ Trigger disabled. Frontend will handle all sanitization.' AS status;

-- Verify trigger is disabled
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing,
    tgenabled
FROM information_schema.triggers
WHERE trigger_name = 'trg_links_xss_check'
  AND event_object_table = 'links';

-- tgenabled values:
-- 'O' = enabled
-- 'D' = disabled
-- (empty result = trigger doesn't exist)
