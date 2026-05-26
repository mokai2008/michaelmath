-- ============================================
-- RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- ============================================

-- 1. Add student_code column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS student_code TEXT UNIQUE;

-- 2. Generate codes for existing students
UPDATE public.profiles
SET student_code = 'MG-' || UPPER(SUBSTR(md5(id::text), 1, 6))
WHERE student_code IS NULL;

-- 3. Update signup trigger: $5 welcome bonus + student code
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, wallet_balance, student_code, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email, 
    5.00,
    'MG-' || UPPER(SUBSTR(md5(new.id::text), 1, 6)),
    CASE WHEN new.email = 'mokai2008@gmail.com' THEN 'admin'::user_role ELSE 'student'::user_role END
  );
  
  INSERT INTO public.wallet_transactions (student_id, type, amount, description)
  VALUES (new.id, 'topup', 5.00, 'Welcome bonus - free $5 on signup');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

-- 4. Students can READ their own wallet transactions
DROP POLICY IF EXISTS "Users can read own wallet transactions." ON public.wallet_transactions;
CREATE POLICY "Users can read own wallet transactions."
  ON public.wallet_transactions FOR SELECT USING (auth.uid() = student_id);

-- 5. Students can INSERT wallet transactions
DROP POLICY IF EXISTS "Users can insert own wallet transactions." ON public.wallet_transactions;
CREATE POLICY "Users can insert own wallet transactions."
  ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 6. Students can READ their own section purchases
DROP POLICY IF EXISTS "Users can read own section purchases." ON public.section_purchases;
CREATE POLICY "Users can read own section purchases."
  ON public.section_purchases FOR SELECT USING (auth.uid() = student_id);

-- 7. Students can INSERT section purchases
DROP POLICY IF EXISTS "Users can insert own purchases." ON public.section_purchases;
CREATE POLICY "Users can insert own purchases."
  ON public.section_purchases FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 8. Admin can manage wallet_transactions
DROP POLICY IF EXISTS "Admin can manage wallet_transactions." ON public.wallet_transactions;
CREATE POLICY "Admin can manage wallet_transactions."
  ON public.wallet_transactions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 9. Admin can manage section_purchases
DROP POLICY IF EXISTS "Admin can manage section_purchases." ON public.section_purchases;
CREATE POLICY "Admin can manage section_purchases."
  ON public.section_purchases FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 10. Admin can UPDATE profiles (for wallet credits)
DROP POLICY IF EXISTS "Admin can update all profiles." ON public.profiles;
CREATE POLICY "Admin can update all profiles."
  ON public.profiles FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 11. Students can UPDATE their own profile
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 12. Students can read their own profile
DROP POLICY IF EXISTS "Users can view own profile." ON public.profiles;
CREATE POLICY "Users can view own profile."
  ON public.profiles FOR SELECT USING (auth.uid() = id);
-- ============================================
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR
-- Add booking functionality to admin_availability_slots
-- ============================================

-- 1. Add price and is_booked columns to admin_availability_slots
ALTER TABLE public.admin_availability_slots 
  ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_booked boolean DEFAULT false;

-- 2. Ensure anyone can see active and unbooked slots
DROP POLICY IF EXISTS "Anyone can view active availability slots." ON public.admin_availability_slots;
CREATE POLICY "Anyone can view active availability slots."
  ON public.admin_availability_slots FOR SELECT USING (is_active = true);

-- 3. Allow admins to update the slots (already covered by RLS, but let's make sure)
-- Just ensuring admins can modify slots entirely
DROP POLICY IF EXISTS "Admin can manage availability slots." ON public.admin_availability_slots;
CREATE POLICY "Admin can manage availability slots."
  ON public.admin_availability_slots FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

