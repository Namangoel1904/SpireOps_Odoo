-- =============================================================================
-- SpireOps — Migration 005: User Management & Role Defaults
-- =============================================================================

-- 1. Add 'pending' to the user_role ENUM safely
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'pending';

-- 2. Update the auto-create profile function to default to 'pending' instead of 'driver'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'pending')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Ensure admins can read and update all profiles
-- Drop the restrictive policies from 001 if they exist (to be safe)
DROP POLICY IF EXISTS "Profiles: read own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admins read all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admins update all" ON public.profiles;

-- Create unified profile policies
CREATE POLICY "Profiles: read access"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid() 
    OR public.get_my_role() IN ('admin', 'fleet_manager', 'safety_officer', 'financial_analyst')
  );

CREATE POLICY "Profiles: update own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Profiles: admin update all"
  ON public.profiles FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- Also allow admins to delete profiles
CREATE POLICY "Profiles: admin delete all"
  ON public.profiles FOR DELETE
  USING (public.get_my_role() = 'admin');
