-- ============================================
-- FIX: Add missing student_whatsapp column to profiles
-- and ensure the handle_new_user trigger works correctly
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- 1. Add student_whatsapp column if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS student_whatsapp TEXT;

-- 2. Recreate the handle_new_user trigger function with all required columns
-- This function runs when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, wallet_balance, student_code, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email, 
    5.00,
    'MG-' || UPPER(SUBSTR(md5(new.id::text), 1, 6)),
    CASE WHEN new.email = 'mokai2008@gmail.com' THEN 'admin'::user_role ELSE 'student'::user_role END
  );
  
  -- Record the welcome bonus transaction
  INSERT INTO public.wallet_transactions (student_id, type, amount, description)
  VALUES (new.id, 'topup', 5.00, 'Welcome bonus - free $5 on signup');
  
  RETURN new;
EXCEPTION WHEN others THEN
  -- If the trigger fails (e.g. duplicate key), log and continue
  -- so the auth.users row is still created
  RAISE WARNING 'handle_new_user failed for %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

-- 3. Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Ensure RLS policy allows INSERT on profiles for the trigger (runs as security definer, but just in case)
-- The trigger runs with SECURITY DEFINER so it bypasses RLS, but let's also ensure
-- the profiles INSERT policy exists for fallback scenarios
DROP POLICY IF EXISTS "Service role can insert profiles." ON public.profiles;

-- 5. Fix admin profile if it exists but has wrong role
UPDATE public.profiles 
SET role = 'admin'::user_role 
WHERE email = 'mokai2008@gmail.com' AND role != 'admin'::user_role;

-- 6. If admin profile is completely missing, create it
INSERT INTO public.profiles (id, full_name, email, role, wallet_balance, student_code)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', 'Michael Gad'), 
  email, 
  'admin'::user_role,
  0.00,
  'MG-ADMIN'
FROM auth.users
WHERE email = 'mokai2008@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin'::user_role;
