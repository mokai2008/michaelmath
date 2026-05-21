-- Add unique student code to profiles for admin lookup
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS student_code TEXT UNIQUE;

-- Generate codes for existing students
UPDATE public.profiles
SET student_code = 'MG-' || UPPER(SUBSTR(md5(id::text), 1, 6))
WHERE student_code IS NULL;

-- Update handle_new_user to auto-generate student_code on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, wallet_balance, student_code)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email, 
    5.00,
    'MG-' || UPPER(SUBSTR(md5(new.id::text), 1, 6))
  );
  
  -- Record the welcome bonus transaction
  INSERT INTO public.wallet_transactions (student_id, type, amount, description)
  VALUES (new.id, 'topup', 5.00, 'Welcome bonus - free $5 on signup');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;
