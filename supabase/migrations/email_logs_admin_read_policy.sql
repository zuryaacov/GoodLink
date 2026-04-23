-- Allow admins to read all email_logs rows (for Admin Dashboard).
-- Existing policy still allows regular users to read only their own rows.

DROP POLICY IF EXISTS "email_logs_select_admin" ON public.email_logs;

CREATE POLICY "email_logs_select_admin"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );
