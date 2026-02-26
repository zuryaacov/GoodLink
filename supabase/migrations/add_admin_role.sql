-- Admin Roles: add role column to profiles and RLS for admin actions
-- Run in Supabase SQL Editor (or apply as migration).

-- 1. Add role column to profiles (default 'user')
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Optional: constrain allowed values
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

-- 2. Allow admins to delete any link (in addition to existing "own link" policies)
-- Assumes links table has RLS enabled and users can delete their own links.
-- This policy adds: if current user is admin (profile.role = 'admin'), they can delete any row.
DROP POLICY IF EXISTS "Admins can delete any link" ON public.links;
CREATE POLICY "Admins can delete any link"
  ON public.links
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );

-- 3. (Optional) Allow admins to update any link (e.g. moderate status)
-- Uncomment if you need admins to update other users' links.
-- CREATE POLICY "Admins can update any link"
--   ON public.links
--   FOR UPDATE
--   USING (
--     auth.uid() IN (
--       SELECT user_id FROM public.profiles WHERE role = 'admin'
--     )
--   );

-- 4. Set your first admin (replace YOUR_USER_UUID with the real auth.users id)
-- Run once after applying the migration:
-- UPDATE public.profiles SET role = 'admin' WHERE user_id = 'YOUR_USER_UUID';
