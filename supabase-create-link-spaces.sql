-- Migration: Add hierarchy spaces (Workspaces -> Campaigns -> Groups)
-- Run this SQL in Supabase SQL Editor

-- 1) Create table
CREATE TABLE IF NOT EXISTS public.link_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('workspace', 'campaign', 'group')),
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),
  parent_id UUID NULL REFERENCES public.link_spaces(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_link_spaces_user_id ON public.link_spaces(user_id);
CREATE INDEX IF NOT EXISTS idx_link_spaces_parent_id ON public.link_spaces(parent_id);
CREATE INDEX IF NOT EXISTS idx_link_spaces_user_parent ON public.link_spaces(user_id, parent_id);

-- 3) Optional: unique names under same parent per user
-- If you want to allow duplicates, remove this index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_link_spaces_unique_name_per_parent
  ON public.link_spaces(user_id, parent_id, lower(name));

-- 4) Add folder/space reference to links table
ALTER TABLE public.links
  ADD COLUMN IF NOT EXISTS space_id UUID NULL REFERENCES public.link_spaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_links_space_id ON public.links(space_id);
CREATE INDEX IF NOT EXISTS idx_links_user_space_id ON public.links(user_id, space_id);

-- 5) Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_link_spaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_link_spaces_updated_at ON public.link_spaces;
CREATE TRIGGER trg_link_spaces_updated_at
  BEFORE UPDATE ON public.link_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_link_spaces_updated_at();

-- 6) Enable RLS
ALTER TABLE public.link_spaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own link spaces" ON public.link_spaces;
DROP POLICY IF EXISTS "Users can insert own link spaces" ON public.link_spaces;
DROP POLICY IF EXISTS "Users can update own link spaces" ON public.link_spaces;
DROP POLICY IF EXISTS "Users can delete own link spaces" ON public.link_spaces;

CREATE POLICY "Users can view own link spaces"
  ON public.link_spaces
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own link spaces"
  ON public.link_spaces
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own link spaces"
  ON public.link_spaces
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own link spaces"
  ON public.link_spaces
  FOR DELETE
  USING (auth.uid() = user_id);
