-- Allow dashboard users to read only their own CAPI logs.
-- Keep admin visibility for troubleshooting.

ALTER TABLE public.capi_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.capi_logs TO authenticated;

DROP POLICY IF EXISTS "capi_logs_select_own" ON public.capi_logs;
CREATE POLICY "capi_logs_select_own"
  ON public.capi_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "capi_logs_select_admin" ON public.capi_logs;
CREATE POLICY "capi_logs_select_admin"
  ON public.capi_logs
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
