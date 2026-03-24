-- Allow admins to read all clicks and pixels (for Admin overview KPIs)
-- Run in Supabase SQL Editor (or apply as migration).

-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixels ENABLE ROW LEVEL SECURITY;

-- Admin users can select any click row
DROP POLICY IF EXISTS "Admins can select any click" ON public.clicks;
CREATE POLICY "Admins can select any click"
  ON public.clicks
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );

-- Admin users can select any pixel row
DROP POLICY IF EXISTS "Admins can select any pixel" ON public.pixels;
CREATE POLICY "Admins can select any pixel"
  ON public.pixels
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );
