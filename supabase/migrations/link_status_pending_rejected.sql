-- Link status: allow 'pending' and 'rejected' for admin moderation
-- Run in Supabase SQL Editor (or apply as migration).

-- 1. Allow status values: active, PAUSED, deleted, pending, rejected
-- If your table has an existing status check with another name, drop it first, e.g.:
--   ALTER TABLE public.links DROP CONSTRAINT IF EXISTS your_existing_constraint_name;
ALTER TABLE public.links
  DROP CONSTRAINT IF EXISTS links_status_check;

ALTER TABLE public.links
  ADD CONSTRAINT links_status_check
  CHECK (status IN ('active', 'PAUSED', 'deleted', 'pending', 'rejected'));

-- 2. Admins can SELECT any link (so admin panel can list pending links)
DROP POLICY IF EXISTS "Admins can select any link" ON public.links;
CREATE POLICY "Admins can select any link"
  ON public.links
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );

-- 3. Admins can UPDATE any link (e.g. set status to active or rejected)
DROP POLICY IF EXISTS "Admins can update any link" ON public.links;
CREATE POLICY "Admins can update any link"
  ON public.links
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );
