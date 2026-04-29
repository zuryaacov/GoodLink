-- Track what happened to each click request:
-- redirect (regular target/geo), fallback (fallback_url), or blocked (no redirect target).
ALTER TABLE public.clicks
  ADD COLUMN IF NOT EXISTS redirect_outcome text,
  ADD COLUMN IF NOT EXISTS redirect_destination_url text;

ALTER TABLE public.clicks
  DROP CONSTRAINT IF EXISTS clicks_redirect_outcome_check;

ALTER TABLE public.clicks
  ADD CONSTRAINT clicks_redirect_outcome_check
  CHECK (
    redirect_outcome IS NULL OR
    redirect_outcome IN ('redirect', 'fallback', 'blocked')
  );

CREATE INDEX IF NOT EXISTS idx_clicks_redirect_outcome
  ON public.clicks(redirect_outcome);
