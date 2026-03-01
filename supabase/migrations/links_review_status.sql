-- Add review_status to links for admin approval flow
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query).

-- 1. Add column: pending | approved | rejected
ALTER TABLE public.links
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.links
  DROP CONSTRAINT IF EXISTS links_review_status_check;

ALTER TABLE public.links
  ADD CONSTRAINT links_review_status_check
  CHECK (review_status IN ('pending', 'approved', 'rejected'));

-- 2. Backfill: existing links that are already active/paused = approved; rejected = rejected
UPDATE public.links
SET review_status = 'approved'
WHERE review_status = 'pending' AND status IN ('active', 'PAUSED', 'deleted');

UPDATE public.links
SET review_status = 'rejected'
WHERE status = 'rejected';

COMMENT ON COLUMN public.links.review_status IS 'Admin review: pending (awaiting), approved, rejected. When reject, status is also set to rejected.';
