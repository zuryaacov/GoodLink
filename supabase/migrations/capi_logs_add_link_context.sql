-- Add owner/link context columns to capi_logs so dashboard metrics can be scoped per user/link.
ALTER TABLE public.capi_logs
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS link_id uuid,
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS slug text;

CREATE INDEX IF NOT EXISTS idx_capi_logs_user_id ON public.capi_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_capi_logs_link_id ON public.capi_logs(link_id);
CREATE INDEX IF NOT EXISTS idx_capi_logs_domain_slug ON public.capi_logs(domain, slug);
