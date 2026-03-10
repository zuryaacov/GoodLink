-- Add JSONB column to store full Lemon Squeezy subscription payload per profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lemon_squeezy_subscription_data JSONB;

