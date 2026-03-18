-- Allow admins to read all custom domains (for Admin Panel view)
-- Run in Supabase SQL Editor (or apply as migration).

-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

-- Admin users can select any custom domain row
DROP POLICY IF EXISTS "Admins can select any custom domain" ON public.custom_domains;
CREATE POLICY "Admins can select any custom domain"
  ON public.custom_domains
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );
