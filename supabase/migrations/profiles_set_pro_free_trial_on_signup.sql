-- Set default plan_type/subscription_status for new profiles to Pro + free_trial
ALTER TABLE public.profiles
  ALTER COLUMN plan_type SET DEFAULT 'pro';

ALTER TABLE public.profiles
  ALTER COLUMN subscription_status SET DEFAULT 'free_trial';

-- Update handle_new_user trigger to give new users Pro plan and free_trial status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email, plan_type, subscription_status, full_name)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    'pro',
    'free_trial',
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

