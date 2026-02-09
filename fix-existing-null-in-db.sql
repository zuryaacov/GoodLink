-- ============================================================
-- Fix existing null characters in links table
-- ============================================================
-- This script finds and cleans any existing null characters in the links table.
-- Run this BEFORE updating the trigger, to clean existing data.
-- ============================================================

-- 1. Find all rows with null character in name
SELECT id, name, user_id, created_at
FROM public.links
WHERE name ~ '\x00'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Clean null characters from name column in ALL rows
UPDATE public.links
SET name = REPLACE(REPLACE(name, E'\x00', ''), CHR(0), '')
WHERE name ~ '\x00' OR name LIKE '%' || CHR(0) || '%';

-- 3. Verify no more null characters exist
SELECT COUNT(*) as rows_with_null
FROM public.links
WHERE name ~ '\x00' OR name LIKE '%' || CHR(0) || '%';

-- Expected result: 0
