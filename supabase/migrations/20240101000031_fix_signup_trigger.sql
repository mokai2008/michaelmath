-- ============================================
-- FIX: Database error & Email confirmation error on self-hosted Supabase
-- Run this script in your Supabase SQL Editor
-- ============================================

-- 1. Ensure all expected columns exist on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_whatsapp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_whatsapp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10, 2) DEFAULT 5.00 NOT NULL;

-- 2. BEFORE INSERT TRIGGER: Auto-confirm user email so self-hosted Supabase never attempts email sending
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS trigger AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql security definer;

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_user();

-- 3. AFTER INSERT TRIGGER: Create user profile & welcome bonus
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  generated_code TEXT;
BEGIN
  generated_code := 'MG-' || UPPER(SUBSTR(md5(new.id::text), 1, 6));

  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    wallet_balance, 
    student_code, 
    role,
    student_whatsapp,
    parent_email,
    parent_whatsapp
  )
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email, 
    5.00,
    generated_code,
    CASE WHEN new.email = 'mokai2008@gmail.com' THEN 'admin'::user_role ELSE 'student'::user_role END,
    COALESCE(new.raw_user_meta_data->>'student_whatsapp', ''),
    new.raw_user_meta_data->>'parent_email',
    COALESCE(new.raw_user_meta_data->>'parent_whatsapp', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    student_whatsapp = CASE WHEN EXCLUDED.student_whatsapp <> '' THEN EXCLUDED.student_whatsapp ELSE public.profiles.student_whatsapp END,
    parent_email = CASE WHEN EXCLUDED.parent_email IS NOT NULL THEN EXCLUDED.parent_email ELSE public.profiles.parent_email END,
    parent_whatsapp = CASE WHEN EXCLUDED.parent_whatsapp <> '' THEN EXCLUDED.parent_whatsapp ELSE public.profiles.parent_whatsapp END;
  
  -- Record the welcome bonus transaction safely
  BEGIN
    INSERT INTO public.wallet_transactions (student_id, type, amount, description)
    VALUES (new.id, 'topup', 5.00, 'Welcome bonus - free $5 on signup');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Welcome bonus transaction insert failed for %: %', new.id, SQLERRM;
  END;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

-- 4. Re-bind the profile creation trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
