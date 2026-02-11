-- ============================================================
-- Security Audit (read-only)
-- ============================================================
-- Run this first to see current DB security state.
-- This script does NOT modify anything.
-- ============================================================

-- 1) Triggers on key tables
SELECT
  c.relname AS table_name,
  t.tgname  AS trigger_name,
  p.proname AS function_name,
  t.tgenabled
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p  ON p.oid = t.tgfoid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('links', 'pixels', 'utm_presets', 'profiles')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- 2) Current definitions for security functions
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_safe_text',
    'sanitize_text',
    'validate_links_input',
    'validate_pixels_input',
    'validate_utm_presets_input',
    'validate_profiles_input'
  )
ORDER BY p.proname;

-- 3) RLS status on key tables (compatible query)
SELECT
  n.nspname AS schemaname,
  c.relname AS tablename,
  c.relrowsecurity AS rowsecurity,
  c.relforcerowsecurity AS forcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('links', 'pixels', 'utm_presets', 'profiles')
ORDER BY c.relname;

-- 4) RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('links', 'pixels', 'utm_presets', 'profiles')
ORDER BY tablename, policyname;

-- 5) Helpful quick checks
SELECT 'Audit complete. Review results above.' AS status;
