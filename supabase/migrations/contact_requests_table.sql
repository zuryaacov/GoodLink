-- Contact form submissions for GoodLink.ai Contact page
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query) or via migration.

-- Table: contact_requests
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for listing by date
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON public.contact_requests (created_at DESC);

-- RLS
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon) to insert so the public contact form works
CREATE POLICY "Allow insert contact_requests"
  ON public.contact_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service role / backend can read (no policy for SELECT = no public read)
-- Admins can query via Supabase Dashboard or service role.

COMMENT ON TABLE public.contact_requests IS 'Contact form submissions from the public Contact page';
