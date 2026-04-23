-- Cancel all pending trial_* emails for a user (called on paid upgrade)
CREATE OR REPLACE FUNCTION public.cancel_pending_trial_emails(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  _count INTEGER;
BEGIN
  UPDATE public.email_logs
  SET
    status = 'cancelled',
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND email_type LIKE 'trial_%';

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cancel_pending_trial_emails(UUID) TO service_role;
