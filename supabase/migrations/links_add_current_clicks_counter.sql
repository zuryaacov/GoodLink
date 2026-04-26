-- Add persisted click counter on links for click-limit checks.
ALTER TABLE public.links
  ADD COLUMN IF NOT EXISTS current_clicks integer NOT NULL DEFAULT 0;

ALTER TABLE public.links
  DROP CONSTRAINT IF EXISTS links_current_clicks_non_negative;
ALTER TABLE public.links
  ADD CONSTRAINT links_current_clicks_non_negative
  CHECK (current_clicks >= 0);

-- Backfill NULLs (defensive, should not happen with NOT NULL + DEFAULT).
UPDATE public.links
SET current_clicks = 0
WHERE current_clicks IS NULL;

CREATE INDEX IF NOT EXISTS idx_links_current_clicks ON public.links(current_clicks);
