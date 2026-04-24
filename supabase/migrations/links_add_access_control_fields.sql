-- Add access control / limits fields for links (frontend-only phase)
ALTER TABLE public.links
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'direct'
    CHECK (access_mode IN ('direct', 'controlled')),
  ADD COLUMN IF NOT EXISTS enable_password_protection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_password text,
  ADD COLUMN IF NOT EXISTS enable_anti_brute_force boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_login_attempts integer,
  ADD COLUMN IF NOT EXISTS lockout_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS enable_time_limit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expiration_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS expiration_timezone text,
  ADD COLUMN IF NOT EXISTS enable_click_limit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_clicks_allowed integer;

ALTER TABLE public.links
  DROP CONSTRAINT IF EXISTS links_max_login_attempts_positive;
ALTER TABLE public.links
  ADD CONSTRAINT links_max_login_attempts_positive
  CHECK (max_login_attempts IS NULL OR max_login_attempts >= 1);

ALTER TABLE public.links
  DROP CONSTRAINT IF EXISTS links_lockout_duration_minutes_positive;
ALTER TABLE public.links
  ADD CONSTRAINT links_lockout_duration_minutes_positive
  CHECK (lockout_duration_minutes IS NULL OR lockout_duration_minutes >= 1);

ALTER TABLE public.links
  DROP CONSTRAINT IF EXISTS links_max_clicks_allowed_positive;
ALTER TABLE public.links
  ADD CONSTRAINT links_max_clicks_allowed_positive
  CHECK (max_clicks_allowed IS NULL OR max_clicks_allowed >= 1);

CREATE INDEX IF NOT EXISTS idx_links_access_mode ON public.links(access_mode);
CREATE INDEX IF NOT EXISTS idx_links_expiration_datetime ON public.links(expiration_datetime);
