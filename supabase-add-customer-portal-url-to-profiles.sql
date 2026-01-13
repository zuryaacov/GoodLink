-- Migration: Add customer_portal_url field to profiles table
-- Run this SQL in your Supabase SQL Editor

-- Add the customer_portal_url column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS lemon_squeezy_customer_portal_url TEXT;
