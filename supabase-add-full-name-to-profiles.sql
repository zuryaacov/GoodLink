-- Migration: Add full_name to profiles table and set from auth user metadata
-- Run this SQL in your Supabase SQL Editor

-- Add the full_name column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update trigger to set full_name from user metadata (email signup: full_name; Google: full_name or name)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email, plan_type, full_name)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    'free',
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
