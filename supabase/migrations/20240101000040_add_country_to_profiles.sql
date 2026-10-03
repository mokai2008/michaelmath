-- ============================================
-- Add country to student profiles (captured on signup)
-- ============================================

-- 1. New column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;

-- 2. Backfill from auth metadata for any users who already signed up with a country
UPDATE public.profiles p
SET country = u.raw_user_meta_data->>'country'
FROM auth.users u
WHERE p.id = u.id
  AND (p.country IS NULL OR p.country = '')
  AND COALESCE(u.raw_user_meta_data->>'country', '') <> '';

-- 3. Signup trigger: same as before + country
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
    country,
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
    NULLIF(new.raw_user_meta_data->>'country', ''),
    COALESCE(new.raw_user_meta_data->>'student_whatsapp', ''),
    new.raw_user_meta_data->>'parent_email',
    COALESCE(new.raw_user_meta_data->>'parent_whatsapp', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    country = COALESCE(EXCLUDED.country, public.profiles.country),
    student_whatsapp = CASE WHEN EXCLUDED.student_whatsapp <> '' THEN EXCLUDED.student_whatsapp ELSE public.profiles.student_whatsapp END,
    parent_email = CASE WHEN EXCLUDED.parent_email IS NOT NULL THEN EXCLUDED.parent_email ELSE public.profiles.parent_email END,
    parent_whatsapp = CASE WHEN EXCLUDED.parent_whatsapp <> '' THEN EXCLUDED.parent_whatsapp ELSE public.profiles.parent_whatsapp END;
  
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
