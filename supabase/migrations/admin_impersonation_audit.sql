-- Audit table for admin impersonation entries (Super Admin / Login as User)
-- Run in Supabase SQL editor or as migration.

CREATE TABLE IF NOT EXISTS public.admin_impersonation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  admin_email text NOT NULL,
  target_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_email text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_impersonation_audit ENABLE ROW LEVEL SECURITY;

-- Regular users should not access this table.
DROP POLICY IF EXISTS "No direct access to impersonation audit" ON public.admin_impersonation_audit;
CREATE POLICY "No direct access to impersonation audit"
  ON public.admin_impersonation_audit
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Optional index for quick lookup by admin/target/time.
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_audit_admin_user_id
  ON public.admin_impersonation_audit (admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_impersonation_audit_target_user_id
  ON public.admin_impersonation_audit (target_user_id, created_at DESC);
