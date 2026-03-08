-- Allow subscription_status = 'free_trial' for Lemon Squeezy on_trial (no-payment trial) signups
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('inactive', 'active', 'cancelled', 'past_due', 'free_trial'));
