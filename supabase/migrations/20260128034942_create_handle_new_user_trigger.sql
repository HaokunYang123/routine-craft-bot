-- ============================================
-- Migration: Rebuild handle_new_user trigger for atomic profile creation
-- Purpose: Create profile row atomically when user signs up via OAuth
--          Profile is created with role=NULL (to be set ONCE by callback)
--          Supports AUTH-10 (role immutability): role cannot be CHANGED once set
-- ============================================

-- Drop existing trigger and function (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the handle_new_user function
-- Note: Role is intentionally NULL - callback will set it ONCE from URL parameter
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  display_name_value TEXT;
BEGIN
  -- Extract display name from OAuth metadata
  -- Google provides 'full_name' or 'name', fallback to email prefix
  display_name_value := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Insert profile with role=NULL
  -- Role will be set ONCE by the auth callback from URL parameter
  -- ON CONFLICT prevents duplicate if trigger fires twice
  INSERT INTO public.profiles (
    user_id,
    display_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    display_name_value,
    NULL,  -- Intentionally NULL - callback sets role ONCE
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

-- Create the trigger
-- Fires AFTER INSERT on auth.users (new user signup)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates profile atomically on OAuth signup. Role is NULL initially - set ONCE by callback. Supports AUTH-10 role immutability.';
