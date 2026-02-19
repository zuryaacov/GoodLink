-- Abuse Reports table for Goodlink.ai Abuse / DMCA reporting
-- Run this in Supabase SQL Editor or via migration to create the table.

-- Table: abuse_reports
CREATE TABLE IF NOT EXISTS public.abuse_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_url text NOT NULL,
  category text NOT NULL CHECK (category IN ('phishing', 'spam', 'adult', 'copyright', 'other')),
  description text,
  reporter_email text NOT NULL,
  safe_browsing_response jsonb,
  turnstile_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for listing/filtering by date and category
CREATE INDEX IF NOT EXISTS idx_abuse_reports_created_at ON public.abuse_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_category ON public.abuse_reports (category);

-- RLS: only backend (service role) inserts; no public read/update from client
ALTER TABLE public.abuse_reports ENABLE ROW LEVEL SECURITY;

-- Policy: no direct anon/authenticated access from client (all writes go via backend API with service role)
CREATE POLICY "Service role only for abuse_reports"
  ON public.abuse_reports
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Optional: allow service role to do everything (service role bypasses RLS by default in Supabase)
-- No extra policy needed; service_role key used by backend bypasses RLS.

COMMENT ON TABLE public.abuse_reports IS 'Abuse and DMCA reports from the public report page';
COMMENT ON COLUMN public.abuse_reports.reported_url IS 'The reported Goodlink/glynk URL';
COMMENT ON COLUMN public.abuse_reports.category IS 'One of: phishing, spam, adult, copyright, other';
COMMENT ON COLUMN public.abuse_reports.safe_browsing_response IS 'Google Safe Browsing API result: { isSafe, threatType, finalUrl } or error';
